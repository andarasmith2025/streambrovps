const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING ALL STREAMS ERRORS - ALL CHANNELS');
console.log('═══════════════════════════════════════════════════════════\n');

const now = new Date();
console.log(`⏰ Current Time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })} WIB\n`);

// Get all channels first
db.all(
  `SELECT id, channel_title, channel_id FROM youtube_channels ORDER BY channel_title`,
  (err, channels) => {
    if (err) {
      console.error('❌ Error getting channels:', err);
      process.exit(1);
    }

    console.log(`📺 Found ${channels.length} YouTube Channels:\n`);
    channels.forEach((ch, idx) => {
      console.log(`${idx + 1}. ${ch.channel_title} (${ch.channel_id})`);
    });
    console.log('\n' + '═'.repeat(63) + '\n');

    // Get all live streams
    db.all(
      `SELECT 
        s.id, 
        s.title, 
        s.status, 
        s.duration, 
        s.start_time,
        s.youtube_channel_id,
        s.youtube_broadcast_id,
        s.use_youtube_api,
        s.created_at,
        s.updated_at,
        yc.channel_title as channel_name,
        CAST((julianday('now') - julianday(s.start_time)) * 24 * 60 AS INTEGER) as elapsed_minutes
      FROM streams s
      LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
      WHERE s.status = 'live'
      ORDER BY s.youtube_channel_id, s.start_time`,
      (err, streams) => {
        if (err) {
          console.error('❌ Error getting streams:', err);
          process.exit(1);
        }

        console.log(`🔴 LIVE STREAMS: ${streams.length} total\n`);

        if (streams.length === 0) {
          console.log('✅ No live streams found. All clear!\n');
          process.exit(0);
          return;
        }

        // Group streams by channel
        const streamsByChannel = {};
        const errors = {
          noChannel: [],
          noBroadcastId: [],
          shouldStop: [],
          noDuration: [],
          noStartTime: []
        };

        streams.forEach(stream => {
          const channelKey = stream.youtube_channel_id || 'NO_CHANNEL';
          if (!streamsByChannel[channelKey]) {
            streamsByChannel[channelKey] = [];
          }
          streamsByChannel[channelKey].push(stream);

          // Check for errors
          if (!stream.youtube_channel_id) {
            errors.noChannel.push(stream);
          }
          if (stream.use_youtube_api && !stream.youtube_broadcast_id) {
            errors.noBroadcastId.push(stream);
          }
          if (!stream.start_time) {
            errors.noStartTime.push(stream);
          }
          if (!stream.duration || stream.duration <= 0) {
            errors.noDuration.push(stream);
          } else if (stream.elapsed_minutes && stream.elapsed_minutes >= stream.duration) {
            errors.shouldStop.push(stream);
          }
        });

        // Display streams by channel
        Object.keys(streamsByChannel).forEach((channelId, idx) => {
          const channelStreams = streamsByChannel[channelId];
          const channelName = channelStreams[0].channel_name || 'UNKNOWN/DEFAULT CHANNEL';
          
          console.log(`\n📺 ${channelName.toUpperCase()}`);
          console.log(`   Channel ID: ${channelId === 'NO_CHANNEL' ? '❌ MISSING' : channelId}`);
          console.log(`   Live Streams: ${channelStreams.length}`);
          console.log('   ' + '─'.repeat(59));

          channelStreams.forEach((stream, sidx) => {
            const remaining = stream.duration && stream.elapsed_minutes 
              ? stream.duration - stream.elapsed_minutes 
              : null;
            const shouldStop = remaining !== null && remaining <= 0;
            
            console.log(`\n   ${sidx + 1}. ${stream.title.substring(0, 55)}${stream.title.length > 55 ? '...' : ''}`);
            console.log(`      Stream ID: ${stream.id}`);
            console.log(`      Status: ${stream.status}`);
            console.log(`      Use YouTube API: ${stream.use_youtube_api ? 'Yes' : 'No'}`);
            console.log(`      Broadcast ID: ${stream.youtube_broadcast_id || '❌ MISSING'}`);
            console.log(`      Start Time: ${stream.start_time || '❌ MISSING'}`);
            
            if (stream.duration && stream.elapsed_minutes !== null) {
              console.log(`      Duration: ${stream.duration} min | Elapsed: ${stream.elapsed_minutes} min | Remaining: ${remaining} min`);
              if (shouldStop) {
                console.log(`      ⚠️  ERROR: SHOULD STOP NOW! (Exceeded by ${Math.abs(remaining)} minutes)`);
              }
            } else {
              console.log(`      Duration: ${stream.duration || '❌ MISSING'}`);
            }
            
            console.log(`      Created: ${stream.created_at}`);
            console.log(`      Updated: ${stream.updated_at}`);
          });
        });

        // Display error summary
        console.log('\n\n' + '═'.repeat(63));
        console.log('📊 ERROR SUMMARY');
        console.log('═'.repeat(63) + '\n');

        let totalErrors = 0;

        if (errors.noChannel.length > 0) {
          totalErrors += errors.noChannel.length;
          console.log(`❌ Streams without Channel ID: ${errors.noChannel.length}`);
          errors.noChannel.forEach(s => {
            console.log(`   - ${s.title.substring(0, 50)}... (ID: ${s.id})`);
          });
          console.log('');
        }

        if (errors.noBroadcastId.length > 0) {
          totalErrors += errors.noBroadcastId.length;
          console.log(`❌ Streams using YouTube API but missing Broadcast ID: ${errors.noBroadcastId.length}`);
          errors.noBroadcastId.forEach(s => {
            console.log(`   - ${s.title.substring(0, 50)}... (ID: ${s.id})`);
          });
          console.log('');
        }

        if (errors.noStartTime.length > 0) {
          totalErrors += errors.noStartTime.length;
          console.log(`❌ Streams without Start Time: ${errors.noStartTime.length}`);
          errors.noStartTime.forEach(s => {
            console.log(`   - ${s.title.substring(0, 50)}... (ID: ${s.id})`);
          });
          console.log('');
        }

        if (errors.noDuration.length > 0) {
          totalErrors += errors.noDuration.length;
          console.log(`⚠️  Streams without Duration: ${errors.noDuration.length}`);
          errors.noDuration.forEach(s => {
            console.log(`   - ${s.title.substring(0, 50)}... (ID: ${s.id})`);
          });
          console.log('');
        }

        if (errors.shouldStop.length > 0) {
          totalErrors += errors.shouldStop.length;
          console.log(`⚠️  Streams that SHOULD STOP (exceeded duration): ${errors.shouldStop.length}`);
          errors.shouldStop.forEach(s => {
            const exceeded = s.elapsed_minutes - s.duration;
            console.log(`   - ${s.title.substring(0, 45)}... (Exceeded by ${exceeded} min)`);
          });
          console.log('');
        }

        if (totalErrors === 0) {
          console.log('✅ No errors found! All streams are healthy.\n');
        } else {
          console.log(`\n⚠️  TOTAL ISSUES FOUND: ${totalErrors}\n`);
          console.log('💡 RECOMMENDATIONS:');
          if (errors.noChannel.length > 0) {
            console.log('   • Fix missing channel IDs using: node fix-channel-for-live-streams.js');
          }
          if (errors.shouldStop.length > 0) {
            console.log('   • Stop streams that exceeded duration manually or check auto-stop service');
          }
          if (errors.noBroadcastId.length > 0) {
            console.log('   • Check YouTube API connection and broadcast creation');
          }
          console.log('');
        }

        console.log('═'.repeat(63));
        process.exit(0);
      }
    );
  }
);
