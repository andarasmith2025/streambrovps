const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING STREAM TYPES ===\n');

db.all(`
  SELECT 
    id,
    title,
    platform,
    use_youtube_api,
    rtmp_url,
    SUBSTR(stream_key, 1, 20) || '...' as stream_key_preview,
    youtube_broadcast_id,
    youtube_description,
    youtube_privacy,
    status
  FROM streams
  ORDER BY created_at DESC
  LIMIT 10
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} streams:\n`);
  
  streams.forEach((stream, index) => {
    console.log(`${index + 1}. Stream ID: ${stream.id}`);
    console.log(`   Title: ${stream.title}`);
    console.log(`   Platform: ${stream.platform}`);
    console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
    console.log(`   Status: ${stream.status}`);
    
    if (stream.use_youtube_api) {
      console.log(`   Type: YouTube API Stream`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'N/A'}`);
      console.log(`   Privacy: ${stream.youtube_privacy || 'N/A'}`);
      console.log(`   Description: ${stream.youtube_description ? stream.youtube_description.substring(0, 50) + '...' : 'N/A'}`);
    } else {
      console.log(`   Type: Manual RTMP Stream`);
      console.log(`   RTMP URL: ${stream.rtmp_url}`);
      console.log(`   Stream Key: ${stream.stream_key_preview}`);
    }
    console.log('');
  });

  db.close();
});
