const { db } = require('./db/database');

console.log('Checking streams that should be in HSN channel...\n');

// Get HSN channel ID
db.get(
  "SELECT channel_id, channel_title FROM youtube_channels WHERE channel_title LIKE '%HSN%'",
  (err, hsnChannel) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!hsnChannel) {
      console.log('❌ HSN channel not found in database');
      process.exit(1);
    }
    
    console.log('✅ HSN Channel found:');
    console.log(`   Channel ID: ${hsnChannel.channel_id}`);
    console.log(`   Channel Title: ${hsnChannel.channel_title}\n`);
    
    // Get all streams
    db.all(
      'SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, created_at FROM streams ORDER BY created_at DESC',
      (err2, streams) => {
        if (err2) {
          console.error('Error:', err2);
          process.exit(1);
        }
        
        console.log(`Total streams: ${streams.length}\n`);
        
        // Categorize streams
        const hsnStreams = streams.filter(s => s.youtube_channel_id === hsnChannel.channel_id);
        const healingStreams = streams.filter(s => s.youtube_channel_id && s.youtube_channel_id !== hsnChannel.channel_id);
        const nullChannelStreams = streams.filter(s => !s.youtube_channel_id);
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 STREAM DISTRIBUTION');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ HSN Channel streams: ${hsnStreams.length}`);
        console.log(`✅ Healing Earth streams: ${healingStreams.length}`);
        console.log(`⚠️  NULL channel (using default): ${nullChannelStreams.length}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        if (hsnStreams.length > 0) {
          console.log('✅ Streams correctly assigned to HSN:');
          hsnStreams.forEach(s => {
            console.log(`   - ${s.title.substring(0, 50)}... (${s.status})`);
          });
          console.log('');
        }
        
        if (nullChannelStreams.length > 0) {
          console.log('⚠️  Streams with NULL channel (should be HSN?):');
          nullChannelStreams.forEach(s => {
            console.log(`   - ${s.title.substring(0, 50)}... (${s.status})`);
            console.log(`     ID: ${s.id}`);
            console.log(`     Broadcast ID: ${s.youtube_broadcast_id || 'none'}`);
            console.log('');
          });
        }
        
        process.exit(0);
      }
    );
  }
);
