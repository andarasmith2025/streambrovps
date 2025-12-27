const { db } = require('./db/database');

console.log('🔍 Investigating HSN stream issue...\n');

// Check HSN streams status
db.all(
  `SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, created_at, updated_at
   FROM streams 
   WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
   ORDER BY updated_at DESC`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${streams.length} HSN streams:\n`);
    
    const liveStreams = streams.filter(s => s.status === 'live');
    const offlineStreams = streams.filter(s => s.status === 'offline');
    
    console.log(`📊 Summary: ${liveStreams.length} live, ${offlineStreams.length} offline\n`);
    
    if (liveStreams.length > 0) {
      console.log('🔴 LIVE HSN Streams:');
      liveStreams.forEach((stream, idx) => {
        console.log(`\n${idx + 1}. ${stream.title}`);
        console.log(`   Stream ID: ${stream.id}`);
        console.log(`   Status: ${stream.status}`);
        console.log(`   Channel ID: ${stream.youtube_channel_id}`);
        console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NONE ❌'}`);
        console.log(`   Updated: ${stream.updated_at}`);
      });
    }
    
    // Check if there are any broadcasts in Mother Earth channel that might belong to HSN
    console.log('\n\n🔍 Checking for misplaced broadcasts...');
    console.log('Looking for streams with Healing Earth channel but HSN-like titles...\n');
    
    db.all(
      `SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, created_at
       FROM streams 
       WHERE (title LIKE '%Tibetan%' OR title LIKE '%HSN%')
       AND (youtube_channel_id IS NULL OR youtube_channel_id != 'UCsAt2CugoD0xatdKguG1O5w')
       AND status = 'live'
       ORDER BY created_at DESC`,
      (err2, misplaced) => {
        if (err2) {
          console.error('Error:', err2);
          process.exit(1);
        }
        
        if (misplaced.length > 0) {
          console.log(`⚠️  Found ${misplaced.length} potentially misplaced streams:\n`);
          misplaced.forEach((stream, idx) => {
            console.log(`${idx + 1}. ${stream.title}`);
            console.log(`   Stream ID: ${stream.id}`);
            console.log(`   Channel ID: ${stream.youtube_channel_id || 'NULL (default channel)'}`);
            console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NONE'}`);
            console.log('');
          });
        } else {
          console.log('✅ No misplaced streams found');
        }
        
        process.exit(0);
      }
    );
  }
);
