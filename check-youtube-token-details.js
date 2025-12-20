const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING YOUTUBE TOKEN DETAILS ===\n');

db.get(`
  SELECT 
    user_id,
    created_at,
    expires_at,
    CASE 
      WHEN datetime(expires_at/1000, 'unixepoch') > datetime('now') THEN 'VALID'
      ELSE 'EXPIRED'
    END as status,
    CAST((julianday(datetime(expires_at/1000, 'unixepoch')) - julianday('now')) * 24 * 60 AS INTEGER) as minutes_remaining
  FROM youtube_tokens 
  ORDER BY created_at DESC 
  LIMIT 1
`, [], (err, token) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!token) {
    console.log('No tokens found in database');
    db.close();
    return;
  }

  console.log('Latest Token:');
  console.log('  User ID:', token.user_id);
  console.log('  Created:', new Date(token.created_at).toLocaleString());
  console.log('  Expires:', new Date(token.expires_at).toLocaleString());
  console.log('  Status:', token.status);
  console.log('  Minutes Remaining:', token.minutes_remaining);
  console.log('');

  db.close();
});
