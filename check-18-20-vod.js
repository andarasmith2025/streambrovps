const { db } = require('./db/database');

db.get(
  `SELECT youtube_broadcast_id 
   FROM stream_schedules 
   WHERE schedule_time LIKE '%18:20%' 
   ORDER BY created_at DESC 
   LIMIT 1`,
  (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else if (row && row.youtube_broadcast_id) {
      const broadcastId = row.youtube_broadcast_id;
      console.log('Broadcast ID for "coba dan coba lagi" (18:20):', broadcastId);
      console.log('');
      console.log('Check VOD at:');
      console.log(`https://www.youtube.com/watch?v=${broadcastId}`);
      console.log('');
      console.log('Or YouTube Studio:');
      console.log(`https://studio.youtube.com/video/${broadcastId}/edit`);
    } else {
      console.log('No broadcast ID found for 18:20 schedule');
    }
    db.close();
  }
);
