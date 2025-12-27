const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const streamId = '3200b52c-8da8-497c-a4ec-941a47e049bd';

console.log('=== Checking Widiway Stream Detail ===\n');

db.get(`
  SELECT *
  FROM streams
  WHERE id = ?
`, [streamId], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!stream) {
    console.log('Stream not found');
    db.close();
    return;
  }

  console.log('STREAM INFO:');
  console.log(`Title: ${stream.title}`);
  console.log(`Status: ${stream.status}`);
  console.log(`Video ID: ${stream.video_id}`);
  console.log(`Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
  console.log(`YouTube Thumbnail Path: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
  console.log(`Use YouTube API: ${stream.use_youtube_api}`);
  console.log(`YouTube Channel ID: ${stream.youtube_channel_id}`);
  console.log(`Created: ${stream.created_at}`);
  
  // Check if video has thumbnail
  if (stream.video_id) {
    db.get(`
      SELECT id, filename, thumbnail
      FROM videos
      WHERE id = ?
    `, [stream.video_id], (err, video) => {
      if (err) {
        console.error('Error fetching video:', err);
      } else if (video) {
        console.log(`\nVIDEO INFO:`);
        console.log(`Video Filename: ${video.filename}`);
        console.log(`Video Thumbnail: ${video.thumbnail || 'NOT SET'}`);
        
        if (video.thumbnail) {
          const fs = require('fs');
          const fullPath = path.join(__dirname, 'public', video.thumbnail);
          if (fs.existsSync(fullPath)) {
            console.log(`✅ Video thumbnail file exists: ${fullPath}`);
          } else {
            console.log(`❌ Video thumbnail file NOT FOUND: ${fullPath}`);
          }
        }
      }
      
      // Check schedules
      db.all(`
        SELECT 
          id,
          schedule_time,
          end_time,
          duration,
          is_recurring,
          recurring_days,
          status,
          broadcast_status,
          youtube_broadcast_id
        FROM stream_schedules
        WHERE stream_id = ?
        ORDER BY schedule_time
      `, [streamId], (err, schedules) => {
        if (err) {
          console.error('Error fetching schedules:', err);
          db.close();
          return;
        }

        console.log(`\nSCHEDULES: ${schedules.length} found`);
        
        schedules.forEach((sched, idx) => {
          console.log(`\n[${idx + 1}] Schedule ID: ${sched.id}`);
          console.log(`    Time: ${sched.schedule_time}`);
          console.log(`    End Time: ${sched.end_time || 'NOT SET'}`);
          console.log(`    Duration: ${sched.duration} minutes`);
          console.log(`    Recurring: ${sched.is_recurring ? 'Yes' : 'No'}`);
          if (sched.is_recurring) {
            console.log(`    Days: ${sched.recurring_days}`);
          }
          console.log(`    Status: ${sched.status}`);
          console.log(`    Broadcast Status: ${sched.broadcast_status || 'NOT SET'}`);
          console.log(`    Broadcast ID: ${sched.youtube_broadcast_id || 'NOT CREATED'}`);
          
          // Convert to WIB
          const schedTime = new Date(sched.schedule_time);
          console.log(`    Time (WIB): ${schedTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
        });

        db.close();
      });
    });
  } else {
    console.log('\n⚠️  No video selected for this stream');
    db.close();
  }
});
