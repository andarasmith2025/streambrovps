const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Finding Widiway Test Stream ===\n');

db.all(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.video_id,
    s.video_thumbnail,
    s.youtube_thumbnail_path,
    s.use_youtube_api,
    s.youtube_channel_id,
    s.created_at,
    yc.channel_name
  FROM streams s
  LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE s.title LIKE '%widiway%' OR s.title LIKE '%test%'
  ORDER BY s.created_at DESC
  LIMIT 5
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (streams.length === 0) {
    console.log('No streams found with "widiway" or "test" in title');
    db.close();
    return;
  }

  console.log(`Found ${streams.length} stream(s):\n`);
  
  streams.forEach((stream, idx) => {
    console.log(`[${idx + 1}] ${stream.title}`);
    console.log(`    ID: ${stream.id}`);
    console.log(`    Status: ${stream.status}`);
    console.log(`    YouTube Channel: ${stream.channel_name || 'NOT SET'} (${stream.youtube_channel_id || 'NO ID'})`);
    console.log(`    Video ID: ${stream.video_id || 'NOT SET'}`);
    console.log(`    Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
    console.log(`    YouTube Thumbnail Path: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
    console.log(`    Use YouTube API: ${stream.use_youtube_api}`);
    console.log(`    Created: ${stream.created_at}`);
    console.log('');
  });

  db.close();
});
