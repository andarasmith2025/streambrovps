const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Checking Live WidiWays Stream ===\n');

db.get(`
  SELECT 
    id,
    title,
    status,
    start_time,
    scheduled_end_time,
    active_schedule_id,
    duration,
    youtube_channel_id
  FROM streams
  WHERE youtube_channel_id = 'UC-bgj2tX3FLGV67q6SiZBJA'
    AND status = 'live'
`, [], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!stream) {
    console.log('No live stream found for WidiWays channel');
    db.close();
    return;
  }

  console.log('LIVE STREAM:');
  console.log(`Title: ${stream.title}`);
  console.log(`ID: ${stream.id}`);
  console.log(`Status: ${stream.status}`);
  console.log(`Start Time: ${stream.start_time || 'NOT SET'}`);
  console.log(`Scheduled End Time: ${stream.scheduled_end_time || 'NOT SET ❌'}`);
  console.log(`Active Schedule ID: ${stream.active_schedule_id || 'NOT SET ❌'}`);
  console.log(`Duration: ${stream.duration || 'NOT SET'} minutes`);

  if (stream.start_time) {
    const startTime = new Date(stream.start_time);
    console.log(`\nStart Time (WIB): ${startTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
    
    if (stream.scheduled_end_time) {
      const endTime = new Date(stream.scheduled_end_time);
      console.log(`Scheduled End Time (WIB): ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      
      const now = new Date();
      const remaining = Math.floor((endTime - now) / (60 * 1000));
      console.log(`Time Remaining: ${remaining} minutes`);
    } else if (stream.duration) {
      const calculatedEnd = new Date(startTime.getTime() + stream.duration * 60 * 1000);
      console.log(`Calculated End Time (WIB): ${calculatedEnd.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      
      const now = new Date();
      const remaining = Math.floor((calculatedEnd - now) / (60 * 1000));
      console.log(`Time Remaining: ${remaining} minutes`);
    }
  }

  // Check active schedule if exists
  if (stream.active_schedule_id) {
    console.log('\nACTIVE SCHEDULE:');
    db.get(`
      SELECT 
        id,
        schedule_time,
        end_time,
        duration,
        status
      FROM stream_schedules
      WHERE id = ?
    `, [stream.active_schedule_id], (err, schedule) => {
      if (err) {
        console.error('Error fetching schedule:', err);
      } else if (schedule) {
        console.log(`Schedule ID: ${schedule.id}`);
        console.log(`Schedule Time: ${schedule.schedule_time}`);
        console.log(`End Time: ${schedule.end_time || 'NOT SET ❌'}`);
        console.log(`Duration: ${schedule.duration} minutes`);
        console.log(`Status: ${schedule.status}`);
        
        if (schedule.end_time) {
          const endTime = new Date(schedule.end_time);
          console.log(`End Time (WIB): ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
        }
      } else {
        console.log('Schedule not found!');
      }
      
      db.close();
    });
  } else {
    console.log('\n⚠️  No active schedule linked to this stream');
    db.close();
  }
});
