// Check schedules on VPS
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== VPS SCHEDULES CHECK ===\n');

// Get live stream IDs
db.all("SELECT id, title FROM streams WHERE status = 'live'", [], (err, liveStreams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Live streams: ${liveStreams.length}\n`);
  
  liveStreams.forEach(stream => {
    console.log(`Stream: ${stream.title} (${stream.id.substring(0, 8)}...)`);
    
    // Get schedules for this stream
    db.all("SELECT * FROM stream_schedules WHERE stream_id = ?", [stream.id], (err, schedules) => {
      if (err) {
        console.error('  Error:', err);
      } else {
        console.log(`  Schedules: ${schedules.length}`);
        schedules.forEach(sch => {
          console.log(`    - ID: ${sch.id.substring(0, 8)}...`);
          console.log(`      Time: ${sch.schedule_time}`);
          console.log(`      Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
          console.log(`      Days: ${sch.recurring_days || 'N/A'}`);
          console.log(`      Duration: ${sch.duration}m`);
          console.log(`      Status: ${sch.status}`);
        });
      }
      console.log('');
    });
  });
  
  setTimeout(() => {
    db.close();
    process.exit(0);
  }, 2000);
});
