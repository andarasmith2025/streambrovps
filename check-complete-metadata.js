/**
 * Check complete metadata for Admin streams and schedules
 */

const { db } = require('./db/database');

async function checkCompleteMetadata() {
  console.log('========================================');
  console.log('Complete Metadata Check - Admin Streams');
  console.log('========================================\n');
  
  try {
    const adminUserId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
    
    // Get all Admin streams with full metadata
    const streams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM streams WHERE user_id = ? ORDER BY created_at DESC`,
        [adminUserId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`Found ${streams.length} stream(s) for Admin\n`);
    
    for (const stream of streams) {
      console.log('='.repeat(80));
      console.log(`STREAM: ${stream.title}`);
      console.log('='.repeat(80));
      
      // Basic Info
      console.log('\n📋 BASIC INFO:');
      console.log(`  ID: ${stream.id}`);
      console.log(`  Status: ${stream.status}`);
      console.log(`  Platform: ${stream.platform || 'N/A'}`);
      console.log(`  Created: ${stream.created_at}`);
      console.log(`  Updated: ${stream.updated_at}`);
      
      // Video/Playlist Info
      console.log('\n🎥 VIDEO/PLAYLIST:');
      console.log(`  Video ID: ${stream.video_id || 'NOT SET'}`);
      console.log(`  Loop Video: ${stream.loop_video ? 'YES' : 'NO'}`);
      
      // RTMP Info
      console.log('\n📡 RTMP:');
      console.log(`  RTMP URL: ${stream.rtmp_url}`);
      console.log(`  Stream Key: ${stream.stream_key ? stream.stream_key.substring(0, 10) + '...' : 'NOT SET'}`);
      
      // Encoding Settings
      console.log('\n⚙️ ENCODING:');
      console.log(`  Use Advanced Settings: ${stream.use_advanced_settings ? 'YES' : 'NO'}`);
      console.log(`  Resolution: ${stream.resolution || 'default'}`);
      console.log(`  Bitrate: ${stream.bitrate || 'default'} kbps`);
      console.log(`  FPS: ${stream.fps || 'default'}`);
      
      // Schedule Info
      console.log('\n📅 SCHEDULE:');
      console.log(`  Duration: ${stream.duration || 'NOT SET'} minutes`);
      console.log(`  Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`  Scheduled End Time: ${stream.scheduled_end_time || 'NOT SET'}`);
      console.log(`  Start Time: ${stream.start_time || 'NOT SET'}`);
      console.log(`  End Time: ${stream.end_time || 'NOT SET'}`);
      
      // YouTube API Settings
      console.log('\n📺 YOUTUBE API:');
      console.log(`  Use YouTube API: ${stream.use_youtube_api ? 'YES ✅' : 'NO'}`);
      console.log(`  YouTube Channel ID: ${stream.youtube_channel_id || 'default'}`);
      console.log(`  YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`  Auto Start: ${stream.youtube_auto_start ? 'YES ✅' : 'NO'}`);
      console.log(`  Auto End: ${stream.youtube_auto_end ? 'YES ✅' : 'NO'}`);
      console.log(`  Privacy: ${stream.youtube_privacy || 'unlisted'}`);
      console.log(`  Made for Kids: ${stream.youtube_made_for_kids ? 'YES' : 'NO'}`);
      console.log(`  Age Restricted: ${stream.youtube_age_restricted ? 'YES' : 'NO'}`);
      console.log(`  Category: ${stream.youtube_category_id || '22 (People & Blogs)'}`);
      console.log(`  Language: ${stream.youtube_language || 'en'}`);
      
      // YouTube Metadata
      console.log('\n📝 YOUTUBE METADATA:');
      console.log(`  Description: ${stream.youtube_description ? stream.youtube_description.substring(0, 50) + '...' : 'NOT SET'}`);
      console.log(`  Tags: ${stream.youtube_tags || 'NOT SET'}`);
      console.log(`  Thumbnail Path: ${stream.youtube_thumbnail_path || stream.video_thumbnail || 'NOT SET'}`);
      
      // Get schedules for this stream
      const schedules = await new Promise((resolve, reject) => {
        db.all(
          `SELECT * FROM stream_schedules WHERE stream_id = ? ORDER BY schedule_time ASC`,
          [stream.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      
      if (schedules.length > 0) {
        console.log('\n📆 SCHEDULES:');
        for (const schedule of schedules) {
          const scheduleTime = new Date(schedule.schedule_time);
          const now = new Date();
          const minutesUntil = Math.floor((scheduleTime - now) / (60 * 1000));
          
          console.log(`\n  Schedule ID: ${schedule.id}`);
          console.log(`    Schedule Time: ${scheduleTime.toLocaleString()}`);
          console.log(`    Time Until: ${minutesUntil > 0 ? minutesUntil + ' minutes' : 'PAST'}`);
          console.log(`    Status: ${schedule.status}`);
          console.log(`    Is Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
          if (schedule.is_recurring) {
            console.log(`    Recurring Days: ${schedule.recurring_days}`);
          }
          console.log(`    Duration: ${schedule.duration} minutes`);
          console.log(`    End Time: ${schedule.end_time || 'NOT SET'}`);
          console.log(`    Broadcast ID: ${schedule.youtube_broadcast_id || 'NOT SET'}`);
          console.log(`    Broadcast Status: ${schedule.broadcast_status || 'N/A'}`);
        }
      } else {
        console.log('\n📆 SCHEDULES: None');
      }
      
      console.log('\n');
    }
    
    // Overall Summary
    console.log('='.repeat(80));
    console.log('OVERALL SUMMARY');
    console.log('='.repeat(80));
    
    const youtubeApiStreams = streams.filter(s => s.use_youtube_api);
    const autoStartStreams = streams.filter(s => s.youtube_auto_start);
    const withThumbnail = streams.filter(s => s.youtube_thumbnail_path || s.video_thumbnail);
    
    console.log(`  Total Streams: ${streams.length}`);
    console.log(`  YouTube API Enabled: ${youtubeApiStreams.length}`);
    console.log(`  Auto Start Enabled: ${autoStartStreams.length}`);
    console.log(`  With Thumbnail: ${withThumbnail.length}`);
    
    // Check readiness
    console.log('\n✅ READINESS CHECK:');
    for (const stream of streams) {
      const issues = [];
      
      if (stream.use_youtube_api) {
        if (!stream.stream_key) issues.push('No stream key');
        if (!stream.youtube_thumbnail_path && !stream.video_thumbnail) issues.push('No thumbnail');
        if (!stream.video_id) issues.push('No video/playlist');
      }
      
      if (issues.length > 0) {
        console.log(`  ⚠️  ${stream.title}: ${issues.join(', ')}`);
      } else {
        console.log(`  ✅ ${stream.title}: Ready to stream`);
      }
    }
    
    console.log('\n========================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkCompleteMetadata();
