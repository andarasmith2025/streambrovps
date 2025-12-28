const { db } = require('./db/database');

db.get(
  `SELECT 
    ss.*,
    s.youtube_broadcast_id as stream_broadcast_id,
    s.status as stream_status
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.schedule_time LIKE '%18:42%'
  ORDER BY ss.created_at DESC
  LIMIT 1`,
  (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else if (row) {
      console.log('Schedule 18:42 ("asdasd"):');
      console.log('  Schedule ID:', row.id);
      console.log('  Stream ID:', row.stream_id);
      console.log('  schedule.youtube_broadcast_id:', row.youtube_broadcast_id || 'NULL');
      console.log('  stream.youtube_broadcast_id:', row.stream_broadcast_id || 'NULL');
      console.log('  broadcast_status:', row.broadcast_status);
      console.log('  schedule status:', row.status);
      console.log('  stream status:', row.stream_status);
      console.log('');
      
      if (row.youtube_broadcast_id || row.stream_broadcast_id) {
        const broadcastId = row.stream_broadcast_id || row.youtube_broadcast_id;
        console.log('✅ Broadcast created:', broadcastId);
        console.log('');
        console.log('Check YouTube Studio to see if it\'s LIVE:');
        console.log(`https://studio.youtube.com/video/${broadcastId}/livestreaming`);
      } else {
        console.log('⚠️ No broadcast ID found!');
      }
    } else {
      console.log('Schedule not found');
    }
    db.close();
  }
);
