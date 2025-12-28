const { db } = require('./db/database');

console.log('Checking all pending schedules...\n');

db.all(
  `SELECT 
    ss.*,
    s.title,
    s.youtube_broadcast_id as stream_broadcast_id,
    s.youtube_channel_id,
    s.status as stream_status
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.status = 'pending'
  ORDER BY ss.schedule_time ASC`,
  (err, schedules) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (!schedules || schedules.length === 0) {
      console.log('No pending schedules found');
      db.close();
      return;
    }
    
    console.log(`Found ${schedules.length} pending schedule(s):\n`);
    
    const now = new Date();
    
    schedules.forEach((schedule, index) => {
      const scheduleTime = new Date(schedule.schedule_time);
      const diffMinutes = Math.round((scheduleTime - now) / 60000);
      
      console.log(`${index + 1}. ${schedule.title}`);
      console.log(`   Schedule ID: ${schedule.id}`);
      console.log(`   Stream ID: ${schedule.stream_id}`);
      console.log(`   Type: ${schedule.is_recurring ? 'RECURRING' : 'ONE-TIME'}`);
      console.log(`   Schedule time: ${scheduleTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB`);
      console.log(`   Duration: ${schedule.duration} minutes`);
      console.log(`   Time until start: ${diffMinutes} minutes`);
      console.log(`   Broadcast ID (schedule): ${schedule.youtube_broadcast_id || 'NOT YET CREATED'}`);
      console.log(`   Broadcast ID (stream): ${schedule.stream_broadcast_id || 'NOT YET CREATED'}`);
      console.log(`   Broadcast status: ${schedule.broadcast_status}`);
      console.log(`   Stream status: ${schedule.stream_status}`);
      
      // Calculate when broadcast should be created
      const broadcastCreateTime = diffMinutes - 5;
      const ffmpegStartTime = diffMinutes - 2;
      
      console.log(`   Expected events:`);
      console.log(`     - Broadcast creation: in ${broadcastCreateTime} minutes (${diffMinutes - 5} to ${diffMinutes - 3} min window)`);
      console.log(`     - FFmpeg start: in ${ffmpegStartTime} minutes`);
      console.log(`     - Go live: in ${diffMinutes} minutes`);
      console.log('');
    });
    
    db.close();
  }
);
