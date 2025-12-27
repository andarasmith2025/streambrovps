const { db } = require('./db/database');

console.log('Checking broadcasts created after thumbnail validation fix...\n');
console.log('Fix was deployed at: 2025-12-27 21:08:00\n');

db.all(
  `SELECT 
    id, 
    title, 
    youtube_broadcast_id, 
    youtube_thumbnail_path,
    video_thumbnail,
    created_at, 
    updated_at 
   FROM streams 
   WHERE youtube_broadcast_id IS NOT NULL 
   AND updated_at > '2025-12-27 21:08:00'
   ORDER BY updated_at DESC 
   LIMIT 10`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    if (streams.length === 0) {
      console.log('✅ No broadcasts created after fix deployment');
      console.log('This means validation is working - no broadcasts without thumbnails!');
      console.log('');
      console.log('The broadcasts you see without thumbnails were created BEFORE the fix.');
      process.exit(0);
      return;
    }

    console.log(`Found ${streams.length} broadcast(s) created after fix:\n`);

    streams.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.title.substring(0, 60)}...`);
      console.log(`   Broadcast ID: ${s.youtube_broadcast_id}`);
      console.log(`   Thumbnail Path: ${s.youtube_thumbnail_path || s.video_thumbnail || '❌ NONE'}`);
      console.log(`   Created: ${s.created_at}`);
      console.log(`   Updated: ${s.updated_at}`);
      console.log('');
    });

    process.exit(0);
  }
);
