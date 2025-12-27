const { db } = require('./db/database');

console.log('Checking HSN streams status...\n');

db.all(
  `SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, created_at 
   FROM streams 
   WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
   ORDER BY title`,
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${rows.length} HSN streams:\n`);
    
    rows.forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.title}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NONE'}`);
      console.log('');
    });
    
    const liveCount = rows.filter(s => s.status === 'live').length;
    const stoppedCount = rows.filter(s => s.status === 'stopped').length;
    
    console.log(`Summary: ${liveCount} live, ${stoppedCount} stopped`);
    
    process.exit(0);
  }
);
