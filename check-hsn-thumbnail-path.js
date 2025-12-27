const { db } = require('./db/database');
const fs = require('fs');
const path = require('path');

const HSN_STREAM_ID = '32bcf084-5af7-4ce7-a006-075793c1f688';

console.log('=== CHECKING HSN THUMBNAIL PATH ===\n');

db.get(`
  SELECT 
    id, title,
    video_id,
    video_thumbnail,
    youtube_thumbnail_path
  FROM streams 
  WHERE id = ?
`, [HSN_STREAM_ID], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!stream) {
    console.error('Stream not found!');
    process.exit(1);
  }
  
  console.log('📺 STREAM INFO:');
  console.log('  ID:', stream.id);
  console.log('  Title:', stream.title);
  console.log('  Video ID:', stream.video_id);
  console.log('\n🖼️ THUMBNAIL PATHS:');
  console.log('  video_thumbnail:', stream.video_thumbnail || '(none)');
  console.log('  youtube_thumbnail_path:', stream.youtube_thumbnail_path || '(none)');
  
  // Check if files exist
  if (stream.video_thumbnail) {
    const exists = fs.existsSync(stream.video_thumbnail);
    console.log(`  video_thumbnail exists: ${exists ? '✅ YES' : '❌ NO'}`);
  }
  
  if (stream.youtube_thumbnail_path) {
    const exists = fs.existsSync(stream.youtube_thumbnail_path);
    console.log(`  youtube_thumbnail_path exists: ${exists ? '✅ YES' : '❌ NO'}`);
  }
  
  // Check video's thumbnail
  if (stream.video_id) {
    console.log('\n📹 CHECKING VIDEO THUMBNAIL:');
    db.get(`SELECT id, title, thumbnail_path FROM videos WHERE id = ?`, [stream.video_id], (err, video) => {
      if (err) {
        console.error('Error fetching video:', err);
        process.exit(1);
      }
      
      if (!video) {
        console.log('  Video not found');
        process.exit(0);
      }
      
      console.log('  Video ID:', video.id);
      console.log('  Video Title:', video.title);
      console.log('  Video thumbnail_path:', video.thumbnail_path || '(none)');
      
      if (video.thumbnail_path) {
        // Video thumbnail is relative path like '/uploads/thumbnails/xxx.jpg'
        const fullPath = path.join(__dirname, 'public', video.thumbnail_path);
        const exists = fs.existsSync(fullPath);
        console.log(`  Full path: ${fullPath}`);
        console.log(`  File exists: ${exists ? '✅ YES' : '❌ NO'}`);
      }
      
      console.log('\n=== SUMMARY ===');
      const hasThumbnail = stream.youtube_thumbnail_path || stream.video_thumbnail || video.thumbnail_path;
      if (hasThumbnail) {
        console.log('✅ Thumbnail is available');
        console.log('Priority order:');
        console.log('  1. youtube_thumbnail_path:', stream.youtube_thumbnail_path ? '✅' : '❌');
        console.log('  2. video_thumbnail:', stream.video_thumbnail ? '✅' : '❌');
        console.log('  3. video.thumbnail_path:', video.thumbnail_path ? '✅' : '❌');
      } else {
        console.log('❌ NO THUMBNAIL AVAILABLE');
        console.log('\n💡 SOLUTION:');
        console.log('1. Upload thumbnail in the stream edit form');
        console.log('2. Or set thumbnail for the video');
        console.log('3. Thumbnail will be automatically uploaded to YouTube when broadcast is created');
      }
      
      process.exit(0);
    });
  } else {
    console.log('\n=== SUMMARY ===');
    const hasThumbnail = stream.youtube_thumbnail_path || stream.video_thumbnail;
    if (hasThumbnail) {
      console.log('✅ Thumbnail is available');
    } else {
      console.log('❌ NO THUMBNAIL AVAILABLE');
    }
    process.exit(0);
  }
});
