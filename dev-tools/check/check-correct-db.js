const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Check the old database file
const dbPath = path.join(__dirname, 'streambro-server1.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING streambro-server1.db ===\n');

db.all("SELECT id, title, status, active_schedule_id, start_time FROM streams ORDER BY created_at DESC LIMIT 10", [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} stream(s):\n`);
  
  streams.forEach((stream, idx) => {
    console.log(`${idx + 1}. ${stream.title}`);
    console.log(`   ID: ${stream.id}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Active Schedule: ${stream.active_schedule_id || 'NULL'}`);
    console.log(`   Start Time: ${stream.start_time || 'NULL'}`);
    console.log('');
  });
  
  // Check schedules
  db.all("SELECT COUNT(*) as count FROM stream_schedules", [], (err, result) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(`Total schedules: ${result[0].count}\n`);
    }
    
    // Check live streams
    db.all("SELECT id, title, status, active_schedule_id FROM streams WHERE status = 'live'", [], (err, liveStreams) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log(`\nLIVE STREAMS (${liveStreams.length}):`);
        liveStreams.forEach(s => {
          console.log(`  - ${s.title} (${s.id.substring(0, 8)}...)`);
          console.log(`    Active Schedule: ${s.active_schedule_id || 'NULL'}`);
        });
      }
      
      db.close();
      process.exit(0);
    });
  });
});
