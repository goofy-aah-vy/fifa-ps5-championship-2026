const { readDb, writeDb } = require('./_utils/store');
const { isAuthenticated } = require('./_utils/auth');

exports.handler = async function (event) {
  if (!isAuthenticated(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  const id = Number((event.queryStringParameters || {}).id);
  const db = await readDb();

  if (event.httpMethod === 'PUT') {
    const match = db.matches.find(function (m) { return m.id === id; });
    if (!match) {
      return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Match not found' }) };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }

    ['teamA', 'teamB', 'kickoff', 'group', 'status'].forEach(function (field) {
      if (body[field] !== undefined) match[field] = body[field];
    });
    if (body.scoreA !== undefined) match.scoreA = Number(body.scoreA);
    if (body.scoreB !== undefined) match.scoreB = Number(body.scoreB);

    await writeDb(db);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(match) };
  }

  if (event.httpMethod === 'DELETE') {
    db.matches = db.matches.filter(function (m) { return m.id !== id; });
    await writeDb(db);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
