// Script to run on VPS to check database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== VPS DATABASE CHECK ===\n');

// Check streams
db.all("SELECT id, title, status, active_schedule_id, start_time FROM streams ORDER BY created_at DESC LIMIT 10", [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Total streams: ${streams.length}\n`);
  
  streams.forEach((s, idx) => {
    console.log(`${idx + 1}. ${s.title}`);
    console.log(`   ID: ${s.id.substring(0, 8)}...`);
    console.log(`   Status: ${s.status}`);
    console.log(`   Active Schedule: ${s.active_schedule_id || 'NULL'}`);
    console.log(`   Start Time: ${s.start_time || 'NULL'}`);
    console.log('');
  });
  
  // Check live streams
  db.all("SELECT id, title, status, active_schedule_id FROM streams WHERE status = 'live'", [], (err, liveStreams) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(`\nLIVE STREAMS: ${liveStreams.length}`);
      liveStreams.forEach(s => {
        console.log(`  - ${s.title} (${s.id.substring(0, 8)}...)`);
        console.log(`    Active Schedule: ${s.active_schedule_id || 'NULL'}`);
      });
    }
    
    // Check schedules
    db.get("SELECT COUNT(*) as count FROM stream_schedules", [], (err, result) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log(`\nTotal schedules: ${result.count}`);
      }
      
      db.close();
      process.exit(0);
    });
  });
});
