const { isAuthenticated } = require('./_utils/auth');

exports.handler = async function (event) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdmin: isAuthenticated(event) })
  };
};
