const { db } = require('./db/database');

db.get(
  `SELECT 
    ss.*,
    s.title as stream_title,
    s.youtube_channel_id
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.status = 'pending'
  ORDER BY ss.created_at DESC
  LIMIT 1`,
  (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else if (row) {
      console.log('Latest pending schedule:');
      console.log(JSON.stringify(row, null, 2));
      
      // Parse schedule time
      const scheduleTime = new Date(row.schedule_time);
      const now = new Date();
      const diffMinutes = Math.round((scheduleTime - now) / 60000);
      
      console.log('\nTiming:');
      console.log(`  Schedule time: ${scheduleTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB`);
      console.log(`  Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB`);
      console.log(`  Time until start: ${diffMinutes} minutes`);
      console.log('');
      console.log('Expected events:');
      console.log(`  ${diffMinutes - 5} min: broadcastScheduler creates broadcast (5 min before)`);
      console.log(`  ${diffMinutes - 2} min: schedulerService starts FFmpeg (2 min before)`);
      console.log(`  0 min: Official schedule time`);
    } else {
      console.log('No pending schedules found');
    }
    db.close();
  }
);
