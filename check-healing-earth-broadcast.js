const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking Healing Earth Broadcast Without Thumbnail ===\n');

const broadcastId = 'KFGhzGtAnJUzPIkaWXN6w4';

// Check if this broadcast exists in streams table
db.get(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.youtube_broadcast_id,
    s.youtube_stream_id,
    s.youtube_channel_id,
    s.video_thumbnail,
    s.youtube_thumbnail_path,
    s.created_at,
    s.updated_at,
    yc.channel_title
  FROM streams s
  LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE s.youtube_broadcast_id = ?
`, [broadcastId], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!stream) {
    console.log(`❌ No stream found with broadcast ID: ${broadcastId}`);
    console.log('\nSearching for similar broadcast IDs...\n');
    
    // Search for broadcasts with similar ID
    db.all(`
      SELECT 
        id,
        title,
        youtube_broadcast_id,
        youtube_channel_id,
        status,
        video_thumbnail,
        youtube_thumbnail_path
      FROM streams
      WHERE youtube_broadcast_id LIKE '%${broadcastId.substring(0, 10)}%'
      ORDER BY created_at DESC
      LIMIT 5
    `, (err, streams) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      
      if (streams.length === 0) {
        console.log('No similar broadcasts found.');
      } else {
        console.log(`Found ${streams.length} similar broadcast(s):\n`);
        streams.forEach((s, idx) => {
          console.log(`[${idx + 1}] ${s.title}`);
          console.log(`    Stream ID: ${s.id}`);
          console.log(`    Broadcast ID: ${s.youtube_broadcast_id}`);
          console.log(`    Channel ID: ${s.youtube_channel_id}`);
          console.log(`    Status: ${s.status}`);
          console.log(`    Video Thumbnail: ${s.video_thumbnail || 'NOT SET'}`);
          console.log(`    YouTube Thumbnail: ${s.youtube_thumbnail_path || 'NOT SET'}`);
          console.log('');
        });
      }
      
      db.close();
    });
    return;
  }

  console.log(`✓ Found stream with broadcast ID: ${broadcastId}\n`);
  console.log(`Stream ID: ${stream.id}`);
  console.log(`Title: ${stream.title}`);
  console.log(`Status: ${stream.status}`);
  console.log(`Channel: ${stream.channel_title || 'Unknown'} (${stream.youtube_channel_id})`);
  console.log(`Broadcast ID: ${stream.youtube_broadcast_id}`);
  console.log(`Stream ID: ${stream.youtube_stream_id}`);
  console.log(`Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
  console.log(`YouTube Thumbnail Path: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
  console.log(`Created: ${stream.created_at}`);
  console.log(`Updated: ${stream.updated_at}`);
  
  if (!stream.video_thumbnail && !stream.youtube_thumbnail_path) {
    console.log('\n⚠️  This stream has NO thumbnail set!');
  }

  db.close();
});
