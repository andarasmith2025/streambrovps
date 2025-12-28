const { db } = require('./db/database');

console.log('Checking schedule at 18:20...\n');

db.get(
  `SELECT 
    ss.*,
    s.title,
    s.youtube_broadcast_id as stream_broadcast_id,
    s.youtube_channel_id
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.schedule_time LIKE '%18:20%'
  ORDER BY ss.created_at DESC
  LIMIT 1`,
  (err, schedule) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (!schedule) {
      console.log('No schedule found at 18:20');
      db.close();
      return;
    }
    
    console.log('Schedule found:');
    console.log('  ID:', schedule.id);
    console.log('  Stream ID:', schedule.stream_id);
    console.log('  Title:', schedule.title);
    console.log('  Schedule time:', schedule.schedule_time);
    console.log('  Duration:', schedule.duration, 'minutes');
    console.log('  Status:', schedule.status);
    console.log('  Is recurring:', schedule.is_recurring);
    console.log('');
    console.log('Broadcast IDs:');
    console.log('  schedule.youtube_broadcast_id:', schedule.youtube_broadcast_id || 'NULL');
    console.log('  stream.youtube_broadcast_id:', schedule.stream_broadcast_id || 'NULL');
    console.log('  broadcast_status:', schedule.broadcast_status);
    console.log('');
    
    // Check YouTube for broadcasts with this title
    console.log('Checking if there are duplicate broadcasts in YouTube...');
    console.log('(You need to check YouTube Studio manually)');
    
    db.close();
  }
);
