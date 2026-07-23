const { readDb } = require('./_utils/store');

exports.handler = async function () {
  const db = await readDb();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(db.tournament)
  };
};
