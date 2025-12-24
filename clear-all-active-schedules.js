// Clear all active_schedule_id to prevent auto-restart
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== CLEARING ALL ACTIVE SCHEDULE IDs ===\n');

db.run(
  "UPDATE streams SET active_schedule_id = NULL WHERE active_schedule_id IS NOT NULL",
  [],
  function(err) {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`✅ Cleared active_schedule_id from ${this.changes} stream(s)`);
    console.log('\nThis will prevent scheduler from auto-restarting streams.');
    console.log('Streams will only start according to their scheduled times.\n');
    
    db.close();
    process.exit(0);
  }
);
