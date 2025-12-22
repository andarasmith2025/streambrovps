const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking broadcast status...\n');

// Get streams with broadcast IDs
db.all(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.youtube_broadcast_id,
    s.use_youtube_api,
    s.user_id,
    s.start_time
  FROM streams s
  WHERE s.youtube_broadcast_id IS NOT NULL
  ORDER BY s.created_at DESC
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} stream(s) with YouTube Broadcast ID:\n`);

  streams.forEach((stream, idx) => {
    console.log(`${idx + 1}. ${stream.title}`);
    console.log(`   Stream ID: ${stream.id}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id}`);
    console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
    console.log(`   User ID: ${stream.user_id}`);
    console.log(`   Start Time: ${stream.start_time || 'Not started'}`);
    console.log(`   YouTube Studio URL: https://studio.youtube.com/video/${stream.youtube_broadcast_id}/edit`);
    console.log('');
  });

  db.close();
});
