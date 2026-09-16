/**
 * Very small file-based "database" so the project runs anywhere with zero
 * external services (no MongoDB/Postgres install required). Data is
 * persisted to data/db.json between server restarts.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function ensureDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ events: [] }, null, 2));
  }
}

function readDB() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Corrupt or empty file - reset to a safe default rather than crashing.
    const fresh = { events: [] };
    writeDB(fresh);
    return fresh;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readDB, writeDB };