const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PORT = process.env.PORT || 3000;

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(list) {
  return list.reduce(function (max, item) { return Math.max(max, item.id); }, 0) + 1;
}

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fifa-ps5-championship-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// ---- Public API ----

app.get('/api/tournament', function (req, res) {
  const db = readDb();
  res.json(db.tournament);
});

app.get('/api/matches', function (req, res) {
  const db = readDb();
  const sorted = db.matches.slice().sort(function (a, b) {
    return new Date(a.kickoff) - new Date(b.kickoff);
  });
  res.json(sorted);
});

// ---- Auth ----

app.get('/api/session', function (req, res) {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.post('/api/login', function (req, res) {
  const db = readDb();
  const username = req.body.username || '';
  const password = req.body.password || '';
  if (username !== db.admin.username || !bcrypt.compareSync(password, db.admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/logout', function (req, res) {
  req.session.destroy(function () { res.json({ ok: true }); });
});

// ---- Admin API ----

app.post('/api/admin/matches', requireAuth, function (req, res) {
  const db = readDb();
  const body = req.body;
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
  writeDb(db);
  res.status(201).json(match);
});

app.put('/api/admin/matches/:id', requireAuth, function (req, res) {
  const db = readDb();
  const id = Number(req.params.id);
  const match = db.matches.find(function (m) { return m.id === id; });
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const body = req.body;
  ['teamA', 'teamB', 'kickoff', 'group', 'status'].forEach(function (field) {
    if (body[field] !== undefined) match[field] = body[field];
  });
  if (body.scoreA !== undefined) match.scoreA = Number(body.scoreA);
  if (body.scoreB !== undefined) match.scoreB = Number(body.scoreB);

  writeDb(db);
  res.json(match);
});

app.delete('/api/admin/matches/:id', requireAuth, function (req, res) {
  const db = readDb();
  const id = Number(req.params.id);
  db.matches = db.matches.filter(function (m) { return m.id !== id; });
  writeDb(db);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, function () {
  console.log('FIFA PS5 Championship site running at http://localhost:' + PORT);
});
