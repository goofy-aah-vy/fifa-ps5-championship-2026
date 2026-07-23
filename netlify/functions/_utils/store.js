const { getStore } = require('@netlify/blobs');

// Seeded from the fixtures already scheduled during local development,
// so the first deploy doesn't start from a blank tournament.
const SEED = {
  tournament: {
    name: 'Mindtickle FIFA Championship 2026',
    subtitle: 'Group Stage – Knockouts – Final'
  },
  admin: {
    username: 'admin',
    passwordHash: '$2a$10$yw68lArwYNzHAPqzNneMaOeteGeDrPt1ZCR1/uT8MgQd0Dio5ZOLm'
  },
  matches: [
    { id: 1, teamA: 'Pulkit & Himanshu', teamB: 'Vy & Swapnaneel', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-23T16:00', group: 'Thursday' },
    { id: 2, teamA: 'Pulkit & Himanshu', teamB: 'Aman & Aashutosh', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-23T16:30', group: 'Thursday' },
    { id: 3, teamA: 'Vy & Swapnaneel', teamB: 'Aman & Aashutosh', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-23T17:00', group: 'Thursday' },
    { id: 4, teamA: 'Navneet & Soham', teamB: 'Ritish & Anuj', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-24T16:00', group: 'Friday' },
    { id: 5, teamA: 'Navneet & Soham', teamB: 'Quentin & Mandar', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-24T16:30', group: 'Friday' },
    { id: 6, teamA: 'Ritish & Anuj', teamB: 'Quentin & Mandar', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-24T17:00', group: 'Friday' },
    { id: 7, teamA: 'Ashutosh & Vasu', teamB: 'Raghavendra & Priyang', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-27T18:30', group: 'Monday' },
    { id: 8, teamA: 'Ashutosh & Vasu', teamB: 'Tarun & Aishwary', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-27T19:00', group: 'Monday' },
    { id: 9, teamA: 'Raghavendra & Priyang', teamB: 'Tarun & Aishwary', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-27T19:30', group: 'Monday' },
    { id: 10, teamA: 'Soham & Anuj', teamB: 'Rohit & Aniket', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-28T16:00', group: 'Tuesday' },
    { id: 11, teamA: 'Soham & Anuj', teamB: 'Malhaar & Shubham', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-28T16:30', group: 'Tuesday' },
    { id: 12, teamA: 'Rohit & Aniket', teamB: 'Malhaar & Shubham', scoreA: 0, scoreB: 0, status: 'scheduled', kickoff: '2026-07-28T17:00', group: 'Tuesday' }
  ]
};

const STORE_NAME = 'fifa-championship';
const KEY = 'db';

function getDbStore() {
  // Automatic environment injection doesn't always reach every deploy —
  // fall back to explicit siteID/token (from env vars) when it's missing.
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID: siteID, token: token });
  }
  return getStore(STORE_NAME);
}

async function readDb() {
  const store = getDbStore();
  const existing = await store.get(KEY, { type: 'json' });
  if (existing) return existing;
  await store.setJSON(KEY, SEED);
  return SEED;
}

async function writeDb(db) {
  await getDbStore().setJSON(KEY, db);
}

function nextId(list) {
  return list.reduce(function (max, item) { return Math.max(max, item.id); }, 0) + 1;
}

module.exports = { readDb, writeDb, nextId };
