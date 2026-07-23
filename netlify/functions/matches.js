const { readDb } = require('./_utils/store');

exports.handler = async function () {
  const db = await readDb();
  const sorted = db.matches.slice().sort(function (a, b) {
    return new Date(a.kickoff) - new Date(b.kickoff);
  });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sorted)
  };
};
