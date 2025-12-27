const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DEBUG: HEALING EARTH BROADCAST CREATION ISSUE ===\n');

// Get Healing Earth channel
db.get(`
  SELECT channel_id, channel_title
  FROM youtube_channels
  WHERE channel_title LIKE '%Healing Earth%'
  LIMIT 1
`, (err, channel) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!channel) {
    console.log('❌ Healing Earth channel not found');
    db.close();
    return;
  }

  console.log(`✅ Channel: ${channel.channel_title}`);
  console.log(`   ID: ${channel.channel_id}\n`);

  // Check streams with null broadcast_id
  db.all(`
    SELECT 
      s.id,
      s.title,
      s.status,
      s.youtube_broadcast_id,
      s.youtube_stream_id,
      s.use_youtube_api,
      s.youtube_auto_start,
      s.rtmp_url,
      s.stream_key,
      s.video_id,
      s.video_thumbnail,
      s.youtube_thumbnail_path,
      s.start_time,
      s.created_at
    FROM streams s
    WHERE s.youtube_channel_id = ?
      AND s.status = 'live'
    ORDER BY s.created_at DESC
  `, [channel.channel_id], (err, streams) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log(`📊 Found ${streams.length} live stream(s)\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const withBroadcast = streams.filter(s => s.youtube_broadcast_id);
    const withoutBroadcast = streams.filter(s => !s.youtube_broadcast_id);

    console.log(`✅ With Broadcast ID: ${withBroadcast.length}`);
    console.log(`❌ Without Broadcast ID (NOT IN YOUTUBE): ${withoutBroadcast.length}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (withoutBroadcast.length > 0) {
      console.log('❌ STREAMS NOT CREATED IN YOUTUBE STUDIO:\n');
      
      withoutBroadcast.forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Status: ${stream.status}`);
        console.log(`    Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
        console.log(`    YouTube Auto Start: ${stream.youtube_auto_start ? 'YES' : 'NO'}`);
        console.log(`    Broadcast ID: ${stream.youtube_broadcast_id || '❌ NULL'}`);
        console.log(`    Stream ID: ${stream.youtube_stream_id || '❌ NULL'}`);
        console.log(`    RTMP URL: ${stream.rtmp_url || 'NOT SET'}`);
        console.log(`    Stream Key: ${stream.stream_key ? 'SET' : 'NOT SET'}`);
        console.log(`    Video ID: ${stream.video_id || 'NOT SET'}`);
        console.log(`    Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
        console.log(`    YouTube Thumbnail: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
        console.log(`    Start Time: ${stream.start_time}`);
        console.log(`    Created: ${stream.created_at}`);
        
        // Diagnose the issue
        console.log('\n    🔍 DIAGNOSIS:');
        
        if (!stream.use_youtube_api) {
          console.log('    ⚠️  use_youtube_api = FALSE (Manual RTMP mode)');
          console.log('    → Stream is using manual RTMP, not YouTube API');
          console.log('    → Broadcast will NOT be created automatically');
          console.log('    → User must create broadcast manually in YouTube Studio');
        } else {
          console.log('    ✅ use_youtube_api = TRUE (Should create broadcast)');
          
          if (!stream.youtube_auto_start) {
            console.log('    ⚠️  youtube_auto_start = FALSE');
            console.log('    → Broadcast created but not auto-started');
          }
          
          if (!stream.video_id) {
            console.log('    ❌ video_id is NULL');
            console.log('    → No video file uploaded');
            console.log('    → Cannot create broadcast without video');
          }
          
          if (!stream.video_thumbnail && !stream.youtube_thumbnail_path) {
            console.log('    ⚠️  No thumbnail set');
            console.log('    → Broadcast may fail without thumbnail');
          }
          
          if (!stream.youtube_broadcast_id && stream.use_youtube_api) {
            console.log('    ❌ BROADCAST CREATION FAILED');
            console.log('    → Check server logs for YouTube API errors');
            console.log('    → Possible causes:');
            console.log('       - YouTube API quota exceeded');
            console.log('       - Invalid OAuth token');
            console.log('       - Missing required fields');
            console.log('       - YouTube API service error');
          }
        }
        
        console.log('');
      });
      
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    if (withBroadcast.length > 0) {
      console.log('✅ STREAMS SUCCESSFULLY CREATED IN YOUTUBE:\n');
      
      withBroadcast.forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Broadcast ID: ${stream.youtube_broadcast_id}`);
        console.log(`    Stream ID: ${stream.youtube_stream_id || 'NOT SET'}`);
        console.log(`    Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
        console.log(`    Created: ${stream.created_at}`);
        console.log('');
      });
      
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Check YouTube channel tokens
    console.log('🔑 CHECKING YOUTUBE OAUTH TOKENS:\n');
    
    db.get(`
      SELECT 
        access_token,
        refresh_token,
        token_expiry,
        last_refreshed
      FROM youtube_channels
      WHERE channel_id = ?
    `, [channel.channel_id], (err, token) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }

      if (!token) {
        console.log('❌ No OAuth tokens found for this channel!');
        console.log('   → Channel not authenticated');
        console.log('   → Cannot create broadcasts via API');
      } else {
        console.log(`Access Token: ${token.access_token ? 'SET (' + token.access_token.substring(0, 20) + '...)' : '❌ NOT SET'}`);
        console.log(`Refresh Token: ${token.refresh_token ? 'SET' : '❌ NOT SET'}`);
        console.log(`Token Expiry: ${token.token_expiry || 'NOT SET'}`);
        console.log(`Last Refreshed: ${token.last_refreshed || 'NEVER'}`);
        
        if (token.token_expiry) {
          const expiry = new Date(token.token_expiry);
          const now = new Date();
          
          if (expiry < now) {
            console.log('\n⚠️  TOKEN EXPIRED!');
            console.log(`   Expired: ${expiry.toLocaleString()}`);
            console.log(`   Current: ${now.toLocaleString()}`);
            console.log('   → Token needs to be refreshed');
            console.log('   → Broadcasts cannot be created until token is refreshed');
          } else {
            const minutesLeft = Math.floor((expiry - now) / 60000);
            console.log(`\n✅ Token valid for ${minutesLeft} more minutes`);
          }
        }
      }

      console.log('\n═══════════════════════════════════════════════════════════\n');
      
      // Final summary
      console.log('📋 SUMMARY & RECOMMENDATIONS:\n');
      
      if (withoutBroadcast.length > 0) {
        const manualRtmp = withoutBroadcast.filter(s => !s.use_youtube_api).length;
        const apiFailures = withoutBroadcast.filter(s => s.use_youtube_api).length;
        
        if (manualRtmp > 0) {
          console.log(`⚠️  ${manualRtmp} stream(s) using Manual RTMP mode`);
          console.log('   → These will NOT appear in YouTube Studio automatically');
          console.log('   → User must create broadcast manually\n');
        }
        
        if (apiFailures > 0) {
          console.log(`❌ ${apiFailures} stream(s) failed to create via YouTube API`);
          console.log('   → Check PM2 logs: pm2 logs streambro --lines 100');
          console.log('   → Look for YouTube API errors');
          console.log('   → Verify OAuth token is valid');
          console.log('   → Check YouTube API quota\n');
        }
      }
      
      if (withBroadcast.length > 0) {
        console.log(`✅ ${withBroadcast.length} stream(s) successfully created in YouTube`);
      }
      
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Check PM2 logs for errors: pm2 logs streambro --lines 100');
      console.log('   2. Verify OAuth token is not expired');
      console.log('   3. Check YouTube API quota in Google Cloud Console');
      console.log('   4. Ensure use_youtube_api is enabled for streams');
      console.log('   5. Verify video files and thumbnails exist');

      db.close();
    });
  });
});
