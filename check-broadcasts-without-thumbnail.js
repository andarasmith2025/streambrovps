const { db } = require('./db/database');
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING BROADCASTS WITHOUT THUMBNAILS');
console.log('═══════════════════════════════════════════════════════════\n');

// Get all streams with broadcast_id but check thumbnail status
db.all(
  `SELECT 
    s.id, 
    s.title, 
    s.status,
    s.youtube_broadcast_id,
    s.youtube_thumbnail_path,
    s.video_thumbnail,
    s.youtube_channel_id,
    yc.channel_title,
    s.created_at,
    s.updated_at
   FROM streams s
   LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
   WHERE s.youtube_broadcast_id IS NOT NULL
   AND s.status IN ('live', 'scheduled')
   ORDER BY s.updated_at DESC
   LIMIT 20`,
  (err, streams) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }

    console.log(`Found ${streams.length} recent broadcasts:\n`);

    let noThumbnailPath = 0;
    let thumbnailFileNotFound = 0;
    let hasThumbnail = 0;

    streams.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.title.substring(0, 55)}...`);
      console.log(`   Broadcast ID: ${s.youtube_broadcast_id}`);
      console.log(`   Channel: ${s.channel_title || 'Unknown'}`);
      console.log(`   Status: ${s.status}`);
      
      // Check thumbnail path
      if (!s.youtube_thumbnail_path && !s.video_thumbnail) {
        console.log(`   ⚠️  NO THUMBNAIL PATH in database`);
        noThumbnailPath++;
      } else {
        const thumbnailPath = s.youtube_thumbnail_path || s.video_thumbnail;
        console.log(`   Thumbnail Path: ${thumbnailPath}`);
        
        // Check if file exists
        const fullPath = path.join(__dirname, thumbnailPath);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          console.log(`   ✅ File exists (${(stats.size / 1024).toFixed(2)} KB)`);
          hasThumbnail++;
        } else {
          console.log(`   ❌ FILE NOT FOUND: ${fullPath}`);
          thumbnailFileNotFound++;
        }
      }
      
      console.log(`   Created: ${s.created_at}`);
      console.log(`   Updated: ${s.updated_at}`);
      console.log('');
    });

    console.log('═'.repeat(63));
    console.log('📊 SUMMARY:\n');
    console.log(`Total broadcasts checked: ${streams.length}`);
    console.log(`✅ Has thumbnail: ${hasThumbnail}`);
    console.log(`⚠️  No thumbnail path in DB: ${noThumbnailPath}`);
    console.log(`❌ Thumbnail file not found: ${thumbnailFileNotFound}`);
    console.log('');

    if (noThumbnailPath > 0 || thumbnailFileNotFound > 0) {
      console.log('💡 POSSIBLE CAUSES:');
      if (noThumbnailPath > 0) {
        console.log('   • Stream created without selecting video (no thumbnail)');
        console.log('   • Thumbnail upload failed during broadcast creation');
        console.log('   • Bug in broadcast creation code');
      }
      if (thumbnailFileNotFound > 0) {
        console.log('   • Thumbnail file was deleted');
        console.log('   • Wrong path stored in database');
        console.log('   • File uploaded to different location');
      }
      console.log('');
      console.log('💡 SOLUTIONS:');
      console.log('   • Always select a video when creating stream');
      console.log('   • Check thumbnail upload in youtubeService.js');
      console.log('   • Add validation to ensure thumbnail exists before creating broadcast');
    }

    console.log('═'.repeat(63));
    process.exit(0);
  }
);
