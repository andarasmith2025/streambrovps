const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

const streamId = '3fb6b86c-e26e-4e60-ada8-e63ebc688cb2';

console.log('=== Checking 2-Schedule Stream Detail ===\n');

db.get(`
  SELECT *
  FROM streams
  WHERE id = ?
`, [streamId], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!stream) {
    console.log('Stream not found');
    db.close();
    return;
  }

  console.log('STREAM INFO:');
  console.log(`Title: ${stream.title}`);
  console.log(`Status: ${stream.status}`);
  console.log(`Video ID: ${stream.video_id}`);
  console.log(`YouTube Thumbnail Path: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
  console.log(`YouTube Channel ID: ${stream.youtube_channel_id}`);
  console.log(`Use YouTube API: ${stream.use_youtube_api}`);
  console.log(`Created: ${stream.created_at}`);
  
  // Check schedules
  db.all(`
    SELECT *
    FROM stream_schedules
    WHERE stream_id = ?
    ORDER BY schedule_time
  `, [streamId], (err, schedules) => {
    if (err) {
      console.error('Error fetching schedules:', err);
      db.close();
      return;
    }

    console.log(`\nSCHEDULES: ${schedules.length} found\n`);
    
    schedules.forEach((sched, idx) => {
      console.log(`[${idx + 1}] Schedule ID: ${sched.id}`);
      console.log(`    schedule_time: ${sched.schedule_time}`);
      console.log(`    end_time: ${sched.end_time || 'NOT SET ❌'}`);
      console.log(`    duration: ${sched.duration} minutes`);
      console.log(`    is_recurring: ${sched.is_recurring}`);
      console.log(`    recurring_days: ${sched.recurring_days || 'N/A'}`);
      console.log(`    status: ${sched.status}`);
      console.log(`    broadcast_status: ${sched.broadcast_status || 'NOT SET'}`);
      console.log(`    youtube_broadcast_id: ${sched.youtube_broadcast_id || 'NOT CREATED'}`);
      
      // Convert to WIB
      const schedTime = new Date(sched.schedule_time);
      console.log(`    Time (WIB): ${schedTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      
      if (sched.end_time) {
        const endTime = new Date(sched.end_time);
        console.log(`    End Time (WIB): ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      }
      console.log('');
    });

    db.close();
  });
});
