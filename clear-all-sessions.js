const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('\n=== Clearing All Sessions (Force Logout) ===\n');

const sessionsDb = new sqlite3.Database(path.join(__dirname, 'sessions.db'), (err) => {
  if (err) {
    console.error('Error opening sessions.db:', err);
    process.exit(1);
  }
});

sessionsDb.run('DELETE FROM sessions', [], function(err) {
  if (err) {
    console.error('Error clearing sessions:', err);
    process.exit(1);
  }
  
  console.log(`✓ Cleared ${this.changes} session(s)`);
  console.log('\nAll users have been logged out.');
  console.log('Please login again with username: BangTeguh\n');
  
  sessionsDb.close();
  process.exit(0);
});
