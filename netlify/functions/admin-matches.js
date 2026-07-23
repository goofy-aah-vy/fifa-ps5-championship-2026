const { readDb, writeDb, nextId } = require('./_utils/store');
const { isAuthenticated } = require('./_utils/auth');

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not authenticated' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

  const db = await readDb();
  const match = {
    id: nextId(db.matches),
    teamA: body.teamA,
    teamB: body.teamB,
    scoreA: 0,
    scoreB: 0,
    status: 'scheduled',
    kickoff: body.kickoff,
    group: body.group || ''
  };
  db.matches.push(match);
  await writeDb(db);

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(match)
  };
};
