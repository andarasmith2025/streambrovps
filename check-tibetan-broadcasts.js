const { db } = require('./db/database');

console.log('Checking Tibetan Flute streams...\n');

db.all(
  "SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, created_at FROM streams WHERE title LIKE '%Tibetan%' ORDER BY created_at DESC",
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${streams.length} Tibetan Flute streams:\n`);
    
    streams.forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.title}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Channel ID: ${stream.youtube_channel_id || 'NULL (using default)'}`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NONE'}`);
      console.log(`   Created: ${stream.created_at}`);
      console.log('');
    });
    
    // Check which channel these broadcasts belong to
    const broadcastIds = streams
      .filter(s => s.youtube_broadcast_id)
      .map(s => s.youtube_broadcast_id);
    
    if (broadcastIds.length > 0) {
      console.log(`\n🔍 Need to check ${broadcastIds.length} broadcast(s) in YouTube API to see which channel they belong to`);
      console.log('Broadcast IDs:', broadcastIds.join(', '));
    }
    
    process.exit(0);
  }
);
