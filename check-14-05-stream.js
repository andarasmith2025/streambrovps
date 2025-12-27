const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking Stream That Should Stop at 14:05 ===\n');

const now = new Date();
console.log(`Current Time (WIB): ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}\n`);

// Check HSN streams from last 3 hours
db.all(`
  SELECT 
    id,
    title,
    status,
    start_time,
    scheduled_end_time,
    active_schedule_id,
    updated_at
  FROM streams
  WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w'
    AND datetime(updated_at) > datetime('now', '-3 hours')
  ORDER BY updated_at DESC
`, (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} HSN stream(s) from last 3 hours:\n`);
  
  streams.forEach((stream, idx) => {
    console.log(`[${idx + 1}] ${stream.title}`);
    console.log(`    ID: ${stream.id}`);
    console.log(`    Status: ${stream.status}`);
    console.log(`    Start Time: ${stream.start_time}`);
    console.log(`    Scheduled End Time: ${stream.scheduled_end_time}`);
    console.log(`    Active Schedule ID: ${stream.active_schedule_id}`);
    console.log(`    Last Updated: ${stream.updated_at}`);
    
    if (stream.scheduled_end_time) {
      const endTime = new Date(stream.scheduled_end_time);
      const endTimeWIB = endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
      console.log(`    End Time (WIB): ${endTimeWIB}`);
      
      const diffMs = endTime.getTime() - now.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      
      if (diffMin < 0) {
        console.log(`    ⚠️  SHOULD HAVE STOPPED ${Math.abs(diffMin)} minutes ago!`);
      } else {
        console.log(`    ✓ Will stop in ${diffMin} minutes`);
      }
    }
    
    console.log('');
  });

  db.close();
});
