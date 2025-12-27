const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING HEALING EARTH CHANNEL');
console.log('═══════════════════════════════════════════════════════════\n');

// Check Healing Earth channel
db.get(
  `SELECT id, channel_title, channel_id, is_default, access_token, refresh_token, created_at, updated_at 
   FROM youtube_channels 
   WHERE channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ'`,
  (err, channel) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }

    if (!channel) {
      console.log('❌ Healing Earth channel NOT FOUND in youtube_channels table!\n');
      
      // Check all channels
      db.all(`SELECT id, channel_title, channel_id, is_default FROM youtube_channels`, (err, channels) => {
        if (err) {
          console.error('Error getting all channels:', err);
          process.exit(1);
        }
        
        console.log(`📺 All channels in database (${channels.length}):\n`);
        channels.forEach((ch, idx) => {
          console.log(`${idx + 1}. ${ch.channel_title || 'NULL'}`);
          console.log(`   ID: ${ch.id}`);
          console.log(`   Channel ID: ${ch.channel_id}`);
          console.log(`   Is Default: ${ch.is_default ? 'Yes' : 'No'}`);
          console.log('');
        });
        
        process.exit(0);
      });
      return;
    }

    console.log('✅ Healing Earth channel FOUND:\n');
    console.log(`Channel Title: ${channel.channel_title || 'NULL'}`);
    console.log(`Channel ID: ${channel.channel_id}`);
    console.log(`Is Default: ${channel.is_default ? 'Yes' : 'No'}`);
    console.log(`Has Access Token: ${channel.access_token ? 'Yes' : 'No'}`);
    console.log(`Has Refresh Token: ${channel.refresh_token ? 'Yes' : 'No'}`);
    console.log(`Created: ${channel.created_at}`);
    console.log(`Updated: ${channel.updated_at}`);
    console.log('');

    // Check streams for this channel
    console.log('─'.repeat(63));
    console.log('🔍 Checking streams for Healing Earth channel:\n');

    db.all(
      `SELECT id, title, status, youtube_channel_id, youtube_broadcast_id, use_youtube_api, start_time, created_at
       FROM streams 
       WHERE youtube_channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ'
       ORDER BY created_at DESC
       LIMIT 10`,
      (err, streams) => {
        if (err) {
          console.error('Error getting streams:', err);
          process.exit(1);
        }

        console.log(`Found ${streams.length} streams (showing last 10):\n`);

        streams.forEach((s, idx) => {
          console.log(`${idx + 1}. ${s.title.substring(0, 55)}...`);
          console.log(`   Stream ID: ${s.id}`);
          console.log(`   Status: ${s.status}`);
          console.log(`   Use YouTube API: ${s.use_youtube_api ? 'Yes' : 'No'}`);
          console.log(`   Broadcast ID: ${s.youtube_broadcast_id || '❌ MISSING'}`);
          console.log(`   Channel ID: ${s.youtube_channel_id}`);
          console.log(`   Start Time: ${s.start_time || 'Not started'}`);
          console.log(`   Created: ${s.created_at}`);
          console.log('');
        });

        // Check streams WITHOUT channel_id
        console.log('─'.repeat(63));
        console.log('🔍 Checking streams WITHOUT channel_id:\n');

        db.all(
          `SELECT id, title, status, youtube_channel_id, use_youtube_api, created_at
           FROM streams 
           WHERE youtube_channel_id IS NULL
           AND status = 'live'
           ORDER BY created_at DESC`,
          (err, noChannelStreams) => {
            if (err) {
              console.error('Error:', err);
              process.exit(1);
            }

            if (noChannelStreams.length === 0) {
              console.log('✅ No live streams without channel_id\n');
            } else {
              console.log(`⚠️  Found ${noChannelStreams.length} live streams without channel_id:\n`);
              noChannelStreams.forEach((s, idx) => {
                console.log(`${idx + 1}. ${s.title.substring(0, 55)}...`);
                console.log(`   Stream ID: ${s.id}`);
                console.log(`   Status: ${s.status}`);
                console.log(`   Use YouTube API: ${s.use_youtube_api ? 'Yes' : 'No'}`);
                console.log(`   Created: ${s.created_at}`);
                console.log('');
              });
            }

            console.log('═'.repeat(63));
            process.exit(0);
          }
        );
      }
    );
  }
);
