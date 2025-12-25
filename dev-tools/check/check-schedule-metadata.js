const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const scheduleId = 'ab0bb571-cc66-4782-8674-6a8a0b3e2c99';

console.log('Checking schedule metadata including thumbnail...\n');

db.get(
  `SELECT 
    ss.*,
    s.title as stream_title,
    s.youtube_description,
    s.youtube_privacy,
    s.youtube_tags,
    s.youtube_category_id,
    s.youtube_language,
    s.youtube_made_for_kids,
    s.youtube_age_restricted,
    s.youtube_synthetic_content,
    s.youtube_auto_start,
    s.youtube_auto_end,
    s.youtube_thumbnail_path,
    s.video_id,
    v.thumbnail_path as video_thumbnail
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  LEFT JOIN videos v ON s.video_id = v.id
  WHERE ss.id = ?`,
  [scheduleId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!row) {
      console.log('Schedule not found');
      db.close();
      return;
    }

    console.log('=== SCHEDULE INFO ===');
    console.log('Schedule ID:', row.id);
    console.log('Stream ID:', row.stream_id);
    console.log('Schedule Time:', row.schedule_time);
    console.log('Duration:', row.duration, 'minutes');
    console.log('Recurring:', row.is_recurring ? 'Yes' : 'No');
    if (row.is_recurring) {
      console.log('Recurring Days:', row.recurring_days);
    }
    console.log('');

    console.log('=== STREAM METADATA ===');
    console.log('Title:', row.stream_title);
    console.log('Description:', row.youtube_description || '(empty)');
    console.log('Privacy:', row.youtube_privacy || 'unlisted');
    console.log('');

    console.log('=== YOUTUBE SETTINGS ===');
    console.log('Made for Kids:', row.youtube_made_for_kids ? 'Yes' : 'No');
    console.log('Age Restricted:', row.youtube_age_restricted ? 'Yes' : 'No');
    console.log('Synthetic Content:', row.youtube_synthetic_content ? 'Yes' : 'No');
    console.log('Auto Start:', row.youtube_auto_start ? 'Yes' : 'No');
    console.log('Auto End:', row.youtube_auto_end ? 'Yes' : 'No');
    console.log('');

    console.log('=== TAGS ===');
    if (row.youtube_tags) {
      try {
        const tags = JSON.parse(row.youtube_tags);
        console.log('Tags Count:', tags.length);
        console.log('Tags:', tags.join(', '));
      } catch (e) {
        console.log('Tags:', row.youtube_tags);
      }
    } else {
      console.log('Tags: (none)');
    }
    console.log('');

    console.log('=== CATEGORY & LANGUAGE ===');
    console.log('Category ID:', row.youtube_category_id || '(default)');
    console.log('Language:', row.youtube_language || '(default)');
    console.log('');

    console.log('=== THUMBNAIL ===');
    
    // Check stream thumbnail (uploaded via YouTube API tab)
    if (row.youtube_thumbnail_path) {
      const streamThumbnailPath = path.join(__dirname, 'public', row.youtube_thumbnail_path);
      const streamThumbnailExists = fs.existsSync(streamThumbnailPath);
      console.log('Stream Thumbnail Path:', row.youtube_thumbnail_path);
      console.log('Stream Thumbnail Exists:', streamThumbnailExists ? '✅ YES' : '❌ NO');
      if (streamThumbnailExists) {
        const stats = fs.statSync(streamThumbnailPath);
        console.log('Stream Thumbnail Size:', (stats.size / 1024).toFixed(2), 'KB');
      }
    } else {
      console.log('Stream Thumbnail: ❌ Not uploaded');
    }
    
    // Check video thumbnail (from video)
    if (row.video_thumbnail) {
      const videoThumbnailPath = path.join(__dirname, 'public', row.video_thumbnail);
      const videoThumbnailExists = fs.existsSync(videoThumbnailPath);
      console.log('Video Thumbnail Path:', row.video_thumbnail);
      console.log('Video Thumbnail Exists:', videoThumbnailExists ? '✅ YES' : '❌ NO');
      if (videoThumbnailExists) {
        const stats = fs.statSync(videoThumbnailPath);
        console.log('Video Thumbnail Size:', (stats.size / 1024).toFixed(2), 'KB');
      }
    } else {
      console.log('Video Thumbnail: ❌ Not available');
    }
    
    console.log('');
    
    // Determine which thumbnail will be used
    console.log('=== THUMBNAIL PRIORITY ===');
    if (row.youtube_thumbnail_path && fs.existsSync(path.join(__dirname, 'public', row.youtube_thumbnail_path))) {
      console.log('✅ Will use: Stream Thumbnail (uploaded via YouTube API tab)');
      console.log('   Path:', row.youtube_thumbnail_path);
    } else if (row.video_thumbnail && fs.existsSync(path.join(__dirname, 'public', row.video_thumbnail))) {
      console.log('✅ Will use: Video Thumbnail (from video file)');
      console.log('   Path:', row.video_thumbnail);
    } else {
      console.log('⚠️  No thumbnail available - broadcast will use YouTube default');
    }
    
    console.log('');
    console.log('=== BROADCAST STATUS ===');
    console.log('Broadcast ID:', row.youtube_broadcast_id || 'Not created yet');
    console.log('Broadcast Status:', row.broadcast_status || 'pending');

    db.close();
  }
);
