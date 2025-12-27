const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING HEALING EARTH CHANNEL - VPS LOG ===\n');

// Get Healing Earth channel ID first
db.get(`
  SELECT channel_id, channel_title
  FROM youtube_channels
  WHERE channel_title LIKE '%Healing Earth%' OR channel_title LIKE '%healing earth%'
  LIMIT 1
`, (err, channel) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  if (!channel) {
    console.log('⚠️  Healing Earth channel not found in database.\n');
    console.log('Checking all channels...\n');
    
    db.all(`
      SELECT channel_id, channel_title, created_at
      FROM youtube_channels
      ORDER BY created_at DESC
    `, (err, channels) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      
      console.log(`Found ${channels.length} channel(s):\n`);
      channels.forEach((ch, idx) => {
        console.log(`[${idx + 1}] ${ch.channel_title}`);
        console.log(`    Channel ID: ${ch.channel_id}`);
        console.log(`    Created: ${ch.created_at}`);
        console.log('');
      });
      
      db.close();
    });
    return;
  }

  console.log(`✅ Found Healing Earth channel: ${channel.channel_title}`);
  console.log(`   Channel ID: ${channel.channel_id}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check all streams for this channel (not just recent)
  db.all(`
    SELECT 
      s.id,
      s.title,
      s.status,
      s.video_id,
      s.video_thumbnail,
      s.youtube_thumbnail_path,
      s.youtube_broadcast_id,
      s.youtube_stream_id,
      s.start_time,
      s.end_time,
      s.duration,
      s.active_schedule_id,
      s.created_at,
      s.updated_at
    FROM streams s
    WHERE s.youtube_channel_id = ?
    ORDER BY s.created_at DESC
    LIMIT 20
  `, [channel.channel_id], (err, streams) => {
    if (err) {
      console.error('❌ Error:', err);
      db.close();
      return;
    }

    console.log(`📊 TOTAL STREAMS: ${streams.length}\n`);
    
    if (streams.length === 0) {
      console.log('⚠️  No streams found for Healing Earth channel.');
      db.close();
      return;
    }

    // Categorize streams
    const liveStreams = streams.filter(s => s.status === 'live');
    const completedStreams = streams.filter(s => s.status === 'completed');
    const failedStreams = streams.filter(s => s.status === 'failed' || s.status === 'error');
    const pendingStreams = streams.filter(s => s.status === 'pending' || s.status === 'scheduled');
    const stoppedStreams = streams.filter(s => s.status === 'stopped');

    console.log('📈 STATUS SUMMARY:');
    console.log(`   🔴 Live: ${liveStreams.length}`);
    console.log(`   ✅ Completed: ${completedStreams.length}`);
    console.log(`   ❌ Failed/Error: ${failedStreams.length}`);
    console.log(`   ⏸️  Stopped: ${stoppedStreams.length}`);
    console.log(`   ⏳ Pending/Scheduled: ${pendingStreams.length}`);
    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Show failed/error streams first (most important)
    if (failedStreams.length > 0) {
      console.log('❌ FAILED/ERROR STREAMS (NOT EXECUTED):\n');
      failedStreams.forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Status: ${stream.status}`);
        console.log(`    Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
        console.log(`    Stream ID: ${stream.youtube_stream_id || 'NOT SET'}`);
        console.log(`    Video ID: ${stream.video_id || 'NOT SET'}`);
        console.log(`    Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
        console.log(`    YouTube Thumbnail: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
        console.log(`    Duration: ${stream.duration || 'NOT SET'} minutes`);
        console.log(`    Created: ${stream.created_at}`);
        console.log(`    Updated: ${stream.updated_at}`);
        
        // Check if files exist
        const fs = require('fs');
        if (stream.video_id) {
          const videoPath = path.join(__dirname, 'uploads', 'videos', stream.video_id);
          if (fs.existsSync(videoPath)) {
            const stats = fs.statSync(videoPath);
            console.log(`    ✅ Video file exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          } else {
            console.log(`    ⚠️  Video file NOT FOUND: ${videoPath}`);
          }
        }
        
        if (stream.video_thumbnail || stream.youtube_thumbnail_path) {
          const thumbnailPath = stream.youtube_thumbnail_path || stream.video_thumbnail;
          if (fs.existsSync(thumbnailPath)) {
            console.log(`    ✅ Thumbnail file exists`);
          } else {
            console.log(`    ⚠️  Thumbnail file NOT FOUND: ${thumbnailPath}`);
          }
        }
        
        console.log('');
      });
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Show live streams
    if (liveStreams.length > 0) {
      console.log('🔴 LIVE STREAMS:\n');
      liveStreams.forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Broadcast ID: ${stream.youtube_broadcast_id}`);
        console.log(`    Start Time: ${stream.start_time}`);
        console.log(`    Duration: ${stream.duration || 'NOT SET'} minutes`);
        
        if (stream.start_time && stream.duration) {
          const start = new Date(stream.start_time);
          const now = new Date();
          const elapsedMinutes = Math.floor((now - start) / 60000);
          const remainingMinutes = stream.duration - elapsedMinutes;
          
          console.log(`    Elapsed: ${elapsedMinutes} minutes`);
          if (remainingMinutes > 0) {
            console.log(`    Remaining: ${remainingMinutes} minutes`);
          } else {
            console.log(`    ⚠️  EXCEEDED by ${Math.abs(remainingMinutes)} minutes!`);
          }
        }
        
        console.log('');
      });
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Show pending/scheduled streams
    if (pendingStreams.length > 0) {
      console.log('⏳ PENDING/SCHEDULED STREAMS:\n');
      pendingStreams.forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Status: ${stream.status}`);
        console.log(`    Video ID: ${stream.video_id || 'NOT SET'}`);
        console.log(`    Created: ${stream.created_at}`);
        console.log('');
      });
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Show recent completed streams (last 5)
    if (completedStreams.length > 0) {
      console.log('✅ RECENT COMPLETED STREAMS (Last 5):\n');
      completedStreams.slice(0, 5).forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Start: ${stream.start_time}`);
        console.log(`    End: ${stream.end_time}`);
        console.log(`    Duration: ${stream.duration} minutes`);
        console.log(`    Created: ${stream.created_at}`);
        console.log('');
      });
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Final summary
    console.log('📋 FINAL SUMMARY:');
    console.log(`   Total streams checked: ${streams.length}`);
    console.log(`   ❌ Failed/Not Executed: ${failedStreams.length}`);
    console.log(`   🔴 Currently Live: ${liveStreams.length}`);
    console.log(`   ⏳ Pending: ${pendingStreams.length}`);
    console.log(`   ✅ Completed: ${completedStreams.length}`);
    console.log(`   ⏸️  Stopped: ${stoppedStreams.length}`);
    
    if (failedStreams.length > 0) {
      console.log(`\n⚠️  WARNING: ${failedStreams.length} stream(s) failed to execute!`);
      console.log('   Check the failed streams section above for details.');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');

    db.close();
  });
});
