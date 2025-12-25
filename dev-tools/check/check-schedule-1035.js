const db = require('./db/database');

console.log('Checking schedule for 10:35...\n');

db.all(`
  SELECT id, stream_id, schedule_time, status, broadcast_id, created_at
  FROM schedules 
  WHERE schedule_time LIKE '2025-12-25 10:35%'
  ORDER BY created_at DESC
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('Found', rows.length, 'schedule(s):\n');
  rows.forEach(row => {
    console.log('Schedule ID:', row.id);
    console.log('Stream ID:', row.stream_id);
    console.log('Schedule Time:', row.schedule_time);
    console.log('Status:', row.status);
    console.log('Broadcast ID:', row.broadcast_id);
    console.log('Created At:', row.created_at);
    console.log('---');
  });
  
  // Check stream status
  if (rows.length > 0) {
    const streamId = rows[0].stream_id;
    db.get(`SELECT id, title, status, youtube_broadcast_id FROM streams WHERE id = ?`, [streamId], (err, stream) => {
      if (err) {
        console.error('Error getting stream:', err);
        process.exit(1);
      }
      
      console.log('\nStream Status:');
      console.log('Title:', stream.title);
      console.log('Status:', stream.status);
      console.log('YouTube Broadcast ID:', stream.youtube_broadcast_id);
      
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
