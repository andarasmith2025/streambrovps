const { db } = require('./db/database');

db.get(
  `SELECT 
    s.id,
    s.title,
    s.status,
    s.start_time,
    s.scheduled_end_time,
    s.active_schedule_id,
    s.youtube_broadcast_id
  FROM streams s
  WHERE s.title LIKE '%coba dan coba lagi%'
  LIMIT 1`,
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (!row) {
      console.log('Stream "coba dan coba lagi" not found');
      db.close();
      return;
    }
    
    console.log('Stream: "coba dan coba lagi"');
    console.log('  ID:', row.id);
    console.log('  Status:', row.status);
    console.log('  Start time:', row.start_time);
    console.log('  Scheduled end:', row.scheduled_end_time || 'NOT SET');
    console.log('  Active schedule:', row.active_schedule_id || 'NOT SET');
    console.log('  Broadcast ID:', row.youtube_broadcast_id || 'NOT SET');
    console.log('');
    
    const now = new Date();
    
    if (row.scheduled_end_time) {
      const endTime = new Date(row.scheduled_end_time);
      const diffMs = endTime - now;
      const diffMinutes = Math.round(diffMs / 60000);
      
      console.log('Time analysis:');
      console.log('  Current time:', now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }), 'WIB');
      console.log('  Should end at:', endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }), 'WIB');
      console.log('  Time remaining:', diffMinutes, 'minutes');
      console.log('');
      
      if (diffMinutes <= 0) {
        console.log('⚠️ Stream should have stopped', Math.abs(diffMinutes), 'minutes ago!');
      } else {
        console.log('✅ Stream will auto-stop in', diffMinutes, 'minutes');
      }
    } else {
      console.log('⚠️ No scheduled_end_time - auto-stop may not work!');
    }
    
    // Check if FFmpeg is running
    console.log('');
    console.log('To check if FFmpeg is running:');
    console.log('  ps aux | grep ffmpeg | grep', row.id.substring(0, 8));
    
    db.close();
  }
);
