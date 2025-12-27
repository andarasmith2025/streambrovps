const { db } = require('./db/database');

console.log('Checking streams with wrong channel...\n');

// Get all live streams
db.all(
  `SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, created_at 
   FROM streams 
   WHERE status = 'live' AND use_youtube_api = 1
   ORDER BY created_at DESC`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${streams.length} live YouTube API stream(s):\n`);
    
    streams.forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.title}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
      console.log(`   Channel ID in DB: ${stream.youtube_channel_id || 'NULL (using default)'}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Created: ${stream.created_at}`);
      console.log('');
    });
    
    // Get channel info
    db.all(
      'SELECT channel_id, channel_title, is_default FROM youtube_channels ORDER BY is_default DESC',
      (err2, channels) => {
        if (!err2) {
          console.log('Available channels:');
          channels.forEach(ch => {
            console.log(`  ${ch.is_default ? '⭐' : '  '} ${ch.channel_title} (${ch.channel_id})`);
          });
        }
        process.exit(0);
      }
    );
  }
);
