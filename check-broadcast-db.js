const { db } = require('./db/database');

const broadcastId = '6jZNlUpFb2M';

console.log(`\n🔍 Searching for broadcast: ${broadcastId}\n`);

// Check streams table
db.get(
  `SELECT * FROM streams WHERE youtube_broadcast_id = ?`,
  [broadcastId],
  (err, stream) => {
    if (err) {
      console.error('❌ Error querying streams:', err);
    } else if (stream) {
      console.log('✅ Found in streams table:');
      console.log(JSON.stringify(stream, null, 2));
    } else {
      console.log('⚠️  Not found in streams table');
    }
    
    // Check stream_schedules table
    db.get(
      `SELECT * FROM stream_schedules WHERE youtube_broadcast_id = ?`,
      [broadcastId],
      (err2, schedule) => {
        if (err2) {
          console.error('❌ Error querying stream_schedules:', err2);
        } else if (schedule) {
          console.log('\n✅ Found in stream_schedules table:');
          console.log(JSON.stringify(schedule, null, 2));
        } else {
          console.log('⚠️  Not found in stream_schedules table');
        }
        
        // Check youtube_channels table
        db.all(
          `SELECT user_id, channel_id, channel_title, is_default FROM youtube_channels`,
          [],
          (err3, channels) => {
            if (err3) {
              console.error('❌ Error querying youtube_channels:', err3);
            } else {
              console.log(`\n📺 YouTube Channels (${channels.length}):`);
              channels.forEach(ch => {
                console.log(`   - ${ch.channel_title} (${ch.channel_id}) - Default: ${ch.is_default}`);
              });
            }
            
            process.exit(0);
          }
        );
      }
    );
  }
);
