const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking HSN Stream Stop Issue ===\n');

// Get current VPS time
const now = new Date();
const vpsTime = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
const vpsHour = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });

console.log(`Current VPS Time (WIB): ${vpsTime}`);
console.log(`Current Hour: ${vpsHour}\n`);

// Check HSN streams
db.all(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.start_time,
    s.scheduled_end_time,
    s.youtube_channel_id,
    s.created_at,
    yc.title as channel_name
  FROM streams s
  LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE s.youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w'
  ORDER BY s.start_time DESC
  LIMIT 5
`, (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} HSN streams:\n`);
  
  streams.forEach((stream, idx) => {
    console.log(`[${idx + 1}] Stream: ${stream.title}`);
    console.log(`    ID: ${stream.id}`);
    console.log(`    Status: ${stream.status}`);
    console.log(`    Channel: ${stream.channel_name || 'Unknown'}`);
    console.log(`    Start Time: ${stream.start_time || 'Not set'}`);
    console.log(`    Scheduled End Time: ${stream.scheduled_end_time || 'Not set'}`);
    console.log(`    Created: ${stream.created_at}`);
    
    // Check if should have stopped
    if (stream.scheduled_end_time && stream.status === 'active') {
      const endTime = new Date(stream.scheduled_end_time);
      const currentTime = new Date();
      
      if (currentTime > endTime) {
        const minutesLate = Math.floor((currentTime - endTime) / 1000 / 60);
        console.log(`    ⚠️  SHOULD HAVE STOPPED ${minutesLate} minutes ago!`);
      } else {
        const minutesRemaining = Math.floor((endTime - currentTime) / 1000 / 60);
        console.log(`    ✓ Will stop in ${minutesRemaining} minutes`);
      }
    }
    console.log('');
  });

  // Check schedules for HSN streams
  console.log('\n=== Checking HSN Stream Schedules ===\n');
  
  db.all(`
    SELECT 
      ss.id,
      ss.stream_id,
      ss.time as start_time,
      ss.end_time,
      ss.duration,
      ss.is_recurring,
      ss.recurring_days,
      s.title as stream_title,
      s.status as stream_status
    FROM stream_schedules ss
    JOIN streams s ON ss.stream_id = s.id
    WHERE s.youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w'
    ORDER BY ss.time
  `, (err, schedules) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log(`Found ${schedules.length} schedules for HSN streams:\n`);
    
    schedules.forEach((sched, idx) => {
      console.log(`[${idx + 1}] Schedule for: ${sched.stream_title}`);
      console.log(`    Schedule ID: ${sched.id}`);
      console.log(`    Stream ID: ${sched.stream_id}`);
      console.log(`    Stream Status: ${sched.stream_status}`);
      console.log(`    Start Time: ${sched.start_time}`);
      console.log(`    End Time: ${sched.end_time || 'Not set'}`);
      console.log(`    Duration: ${sched.duration} minutes`);
      console.log(`    Recurring: ${sched.is_recurring ? 'Yes' : 'No'}`);
      if (sched.is_recurring) {
        console.log(`    Days: ${sched.recurring_days}`);
      }
      console.log('');
    });

    db.close();
  });
});
