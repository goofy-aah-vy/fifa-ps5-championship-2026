const { buildClearCookie } = require('./_utils/auth');

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': buildClearCookie() },
    body: JSON.stringify({ ok: true })
  };
};
