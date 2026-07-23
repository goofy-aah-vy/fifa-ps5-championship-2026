const crypto = require('crypto');

const COOKIE_NAME = 'fifa_admin';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set');
  return secret;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return body + '.' + hmac;
}

function verify(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const body = parts[0];
  const hmac = parts[1];
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function cookieAttrs() {
  const isDev = process.env.NETLIFY_DEV === 'true';
  return 'HttpOnly; Path=/; SameSite=Lax' + (isDev ? '' : '; Secure');
}

function buildSessionCookie() {
  const token = sign({ admin: true, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  return COOKIE_NAME + '=' + token + '; Max-Age=' + MAX_AGE_SECONDS + '; ' + cookieAttrs();
}

function buildClearCookie() {
  return COOKIE_NAME + '=; Max-Age=0; ' + cookieAttrs();
}

function isAuthenticated(event) {
  const cookieHeader = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const match = cookieHeader.split(';').map(function (c) { return c.trim(); })
    .find(function (c) { return c.indexOf(COOKIE_NAME + '=') === 0; });
  if (!match) return false;
  const token = match.slice(COOKIE_NAME.length + 1);
  const payload = verify(token);
  return !!(payload && payload.admin);
}

module.exports = { buildSessionCookie, buildClearCookie, isAuthenticated };
