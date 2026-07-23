const bcrypt = require('bcryptjs');
const { readDb } = require('./_utils/store');
const { buildSessionCookie } = require('./_utils/auth');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const db = await readDb();
  const username = body.username || '';
  const password = body.password || '';

  if (username !== db.admin.username || !bcrypt.compareSync(password, db.admin.passwordHash)) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': buildSessionCookie() },
    body: JSON.stringify({ ok: true })
  };
};
