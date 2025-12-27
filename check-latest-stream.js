const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Checking Latest Stream ===\n');

db.all(`
  SELECT id, title, youtube_channel_id, youtube_thumbnail_path, created_at
  FROM streams 
  ORDER BY created_at DESC 
  LIMIT 1
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (rows.length === 0) {
    console.log('No streams found');
    db.close();
    return;
  }

  const stream = rows[0];
  console.log('LATEST STREAM:');
  console.log(`ID: ${stream.id}`);
  console.log(`Title: ${stream.title}`);
  console.log(`Channel: ${stream.youtube_channel_id || 'NOT SET'}`);
  console.log(`Thumbnail: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
  console.log(`Created: ${stream.created_at}`);

  // Get schedules
  db.all(`
    SELECT id, schedule_time, end_time, duration, is_recurring, recurring_days
    FROM stream_schedules
    WHERE stream_id = ?
    ORDER BY schedule_time
  `, [stream.id], (err, schedules) => {
    if (err) {
      console.error('Error fetching schedules:', err);
      db.close();
      return;
    }

    console.log(`\nSCHEDULES: ${schedules.length}`);
    
    schedules.forEach((sched, idx) => {
      const startTime = new Date(sched.schedule_time);
      const endTime = sched.end_time ? new Date(sched.end_time) : null;
      
      console.log(`\n[${idx + 1}] Schedule ID: ${sched.id}`);
      console.log(`    Start (WIB): ${startTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      console.log(`    End (WIB): ${endTime ? endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false }) : 'NOT SET ❌'}`);
      console.log(`    Duration: ${sched.duration} minutes`);
      console.log(`    Recurring: ${sched.is_recurring ? 'Yes' : 'No'}`);
      if (sched.is_recurring) {
        console.log(`    Days: ${sched.recurring_days}`);
      }
    });

    db.close();
  });
});
