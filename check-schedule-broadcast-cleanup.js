const { db } = require('./db/database');

console.log('Checking schedules with broadcast_id...\n');

db.all(
  `SELECT 
    ss.id,
    ss.schedule_time,
    ss.status,
    ss.youtube_broadcast_id,
    ss.broadcast_status,
    s.title,
    s.status as stream_status
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.youtube_broadcast_id IS NOT NULL
  AND ss.youtube_broadcast_id = 'kSOCgOEh7W4'`,
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (!rows || rows.length === 0) {
      console.log('No schedules found with broadcast kSOCgOEh7W4');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} schedule(s) with broadcast kSOCgOEh7W4:\n`);
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   Schedule ID: ${row.id}`);
      console.log(`   Schedule time: ${row.schedule_time}`);
      console.log(`   Schedule status: ${row.status}`);
      console.log(`   Stream status: ${row.stream_status}`);
      console.log(`   Broadcast ID: ${row.youtube_broadcast_id}`);
      console.log(`   Broadcast status: ${row.broadcast_status}`);
      console.log('');
      
      if (row.stream_status === 'offline' && row.youtube_broadcast_id) {
        console.log('   ⚠️ Stream is offline but broadcast_id still in schedule');
        console.log('   This may cause UI to show as active');
      }
    });
    
    db.close();
  }
);
