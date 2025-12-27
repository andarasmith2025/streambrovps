const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 DEBUG: Why Healing Earth streams have no broadcast_id?');
console.log('═══════════════════════════════════════════════════════════\n');

const streamId = '7fd58336-c865-441d-9070-060e5c0128d3'; // Current live stream

db.get(
  `SELECT * FROM streams WHERE id = ?`,
  [streamId],
  (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }

    if (!stream) {
      console.log('❌ Stream not found!');
      process.exit(1);
    }

    console.log('📺 STREAM DETAILS:\n');
    console.log(`Title: ${stream.title}`);
    console.log(`Stream ID: ${stream.id}`);
    console.log(`Status: ${stream.status}`);
    console.log(`Use YouTube API: ${stream.use_youtube_api}`);
    console.log(`YouTube Channel ID: ${stream.youtube_channel_id}`);
    console.log(`YouTube Broadcast ID: ${stream.youtube_broadcast_id || '❌ NULL'}`);
    console.log(`YouTube Stream ID: ${stream.youtube_stream_id || 'NULL'}`);
    console.log(`RTMP URL: ${stream.rtmp_url}`);
    console.log(`Stream Key: ${stream.stream_key ? stream.stream_key.substring(0, 20) + '...' : 'NULL'}`);
    console.log(`Start Time: ${stream.start_time}`);
    console.log(`Created: ${stream.created_at}`);
    console.log(`Updated: ${stream.updated_at}`);
    console.log('');

    // Check channel tokens
    console.log('─'.repeat(63));
    console.log('🔑 CHECKING CHANNEL TOKENS:\n');

    db.get(
      `SELECT id, channel_title, channel_id, is_default,
              CASE WHEN access_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access_token,
              CASE WHEN refresh_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_refresh_token,
              expiry_date,
              updated_at
       FROM youtube_channels 
       WHERE channel_id = ?`,
      [stream.youtube_channel_id],
      (err, channel) => {
        if (err) {
          console.error('Error:', err);
          process.exit(1);
        }

        if (!channel) {
          console.log('❌ Channel not found in youtube_channels table!');
          process.exit(1);
        }

        console.log(`Channel: ${channel.channel_title}`);
        console.log(`Channel ID: ${channel.channel_id}`);
        console.log(`Is Default: ${channel.is_default ? 'Yes' : 'No'}`);
        console.log(`Has Access Token: ${channel.has_access_token}`);
        console.log(`Has Refresh Token: ${channel.has_refresh_token}`);
        console.log(`Token Expiry: ${channel.expiry_date ? new Date(channel.expiry_date).toLocaleString() : 'NULL'}`);
        console.log(`Last Updated: ${channel.updated_at}`);
        console.log('');

        const now = Date.now();
        const isExpired = channel.expiry_date && channel.expiry_date < now;
        
        if (isExpired) {
          console.log('⚠️  WARNING: Access token is EXPIRED!');
          console.log(`   Expired: ${new Date(channel.expiry_date).toLocaleString()}`);
          console.log(`   Current: ${new Date(now).toLocaleString()}`);
          console.log('');
        } else if (channel.expiry_date) {
          const hoursLeft = Math.floor((channel.expiry_date - now) / (1000 * 60 * 60));
          console.log(`✅ Token valid for ${hoursLeft} more hours`);
          console.log('');
        }

        // Check schedules
        console.log('─'.repeat(63));
        console.log('📅 CHECKING SCHEDULES:\n');

        db.all(
          `SELECT id, schedule_time, duration, status, youtube_broadcast_id
           FROM stream_schedules 
           WHERE stream_id = ?
           ORDER BY schedule_time`,
          [streamId],
          (err, schedules) => {
            if (err) {
              console.error('Error:', err);
              process.exit(1);
            }

            console.log(`Found ${schedules.length} schedules:\n`);

            schedules.forEach((sched, idx) => {
              console.log(`${idx + 1}. Schedule ID: ${sched.id}`);
              console.log(`   Time: ${sched.schedule_time}`);
              console.log(`   Duration: ${sched.duration} min`);
              console.log(`   Status: ${sched.status}`);
              console.log(`   Broadcast ID: ${sched.youtube_broadcast_id || '❌ NULL'}`);
              console.log('');
            });

            // Analysis
            console.log('═'.repeat(63));
            console.log('📊 ANALYSIS:\n');

            const issues = [];

            if (!stream.youtube_broadcast_id) {
              issues.push('❌ Stream has no youtube_broadcast_id');
            }

            if (schedules.length === 0) {
              issues.push('⚠️  Stream has no schedules');
            } else {
              const schedulesWithoutBroadcast = schedules.filter(s => !s.youtube_broadcast_id);
              if (schedulesWithoutBroadcast.length > 0) {
                issues.push(`⚠️  ${schedulesWithoutBroadcast.length} schedule(s) without broadcast_id`);
              }
            }

            if (isExpired) {
              issues.push('❌ OAuth token is EXPIRED - cannot create broadcasts');
            }

            if (issues.length === 0) {
              console.log('✅ No obvious issues found');
            } else {
              console.log('ISSUES FOUND:');
              issues.forEach(issue => console.log(`  ${issue}`));
            }

            console.log('');
            console.log('💡 POSSIBLE CAUSES:');
            console.log('  1. OAuth token expired when stream was created');
            console.log('  2. YouTube API quota exceeded');
            console.log('  3. Error during broadcast creation (check PM2 logs)');
            console.log('  4. Stream was created before multi-channel support');
            console.log('  5. Broadcast creation failed silently');
            console.log('');
            console.log('💡 SOLUTIONS:');
            console.log('  1. Check PM2 logs: pm2 logs streambro --lines 200');
            console.log('  2. Verify OAuth token: node check-healing-earth-token.js');
            console.log('  3. Try creating a new test stream');
            console.log('  4. Check YouTube API quota in Google Cloud Console');
            console.log('');

            console.log('═'.repeat(63));
            process.exit(0);
          }
        );
      }
    );
  }
);
