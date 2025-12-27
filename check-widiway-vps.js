const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Checking WidiWays Test Stream on VPS ===\n');

db.all(`
  SELECT 
    id, 
    title, 
    youtube_channel_id, 
    video_id, 
    video_thumbnail, 
    youtube_thumbnail_path, 
    created_at,
    status
  FROM streams 
  WHERE title LIKE '%widiway%' OR title LIKE '%test%'
  ORDER BY created_at DESC 
  LIMIT 5
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} stream(s):\n`);
  
  streams.forEach((stream, idx) => {
    console.log(`[${idx + 1}] ${stream.title}`);
    console.log(`    ID: ${stream.id}`);
    console.log(`    Status: ${stream.status}`);
    console.log(`    YouTube Channel ID: ${stream.youtube_channel_id || 'NOT SET'}`);
    console.log(`    Video ID: ${stream.video_id || 'NOT SET'}`);
    console.log(`    Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
    console.log(`    YouTube Thumbnail Path: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
    console.log(`    Created: ${stream.created_at}`);
    console.log('');
  });

  db.close();
});
