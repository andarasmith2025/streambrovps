const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking Widiway Broadcast ===\n');

// Get Widiway channel ID first
db.get(`
  SELECT channel_id, channel_title
  FROM youtube_channels
  WHERE channel_title LIKE '%Widiway%' OR channel_title LIKE '%widiway%'
  LIMIT 1
`, (err, channel) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!channel) {
    console.log('Widiway channel not found. Checking all recent streams...\n');
    
    // Check all recent streams
    db.all(`
      SELECT 
        s.id,
        s.title,
        s.status,
        s.youtube_channel_id,
        s.video_thumbnail,
        s.youtube_thumbnail_path,
        s.created_at,
        yc.channel_title
      FROM streams s
      LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
      WHERE datetime(s.created_at) > datetime('now', '-10 minutes')
      ORDER BY s.created_at DESC
      LIMIT 5
    `, (err, streams) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }

      console.log(`Found ${streams.length} stream(s) created in last 10 minutes:\n`);
      
      streams.forEach((stream, idx) => {
        console.log(`[${idx + 1}] ${stream.title}`);
        console.log(`    Stream ID: ${stream.id}`);
        console.log(`    Channel: ${stream.channel_title || 'Unknown'} (${stream.youtube_channel_id})`);
        console.log(`    Status: ${stream.status}`);
        console.log(`    Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
        console.log(`    YouTube Thumbnail: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
        console.log(`    Created: ${stream.created_at}`);
        console.log('');
      });

      db.close();
    });
    return;
  }

  console.log(`Found Widiway channel: ${channel.channel_title}`);
  console.log(`Channel ID: ${channel.channel_id}\n`);

  // Check recent streams for this channel
  db.all(`
    SELECT 
      s.id,
      s.title,
      s.status,
      s.video_thumbnail,
      s.youtube_thumbnail_path,
      s.youtube_broadcast_id,
      s.created_at
    FROM streams s
    WHERE s.youtube_channel_id = ?
      AND datetime(s.created_at) > datetime('now', '-10 minutes')
    ORDER BY s.created_at DESC
  `, [channel.channel_id], (err, streams) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log(`Found ${streams.length} stream(s) created in last 10 minutes:\n`);
    
    if (streams.length === 0) {
      console.log('No recent streams found for Widiway channel.');
      db.close();
      return;
    }

    streams.forEach((stream, idx) => {
      console.log(`[${idx + 1}] ${stream.title}`);
      console.log(`    Stream ID: ${stream.id}`);
      console.log(`    Status: ${stream.status}`);
      console.log(`    Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`    Video Thumbnail: ${stream.video_thumbnail || 'NOT SET'}`);
      console.log(`    YouTube Thumbnail: ${stream.youtube_thumbnail_path || 'NOT SET'}`);
      console.log(`    Created: ${stream.created_at}`);
      
      // Check if thumbnail file exists
      if (stream.youtube_thumbnail_path || stream.video_thumbnail) {
        const fs = require('fs');
        const thumbnailPath = stream.youtube_thumbnail_path || stream.video_thumbnail;
        
        if (fs.existsSync(thumbnailPath)) {
          console.log(`    ✅ Thumbnail file exists`);
        } else {
          console.log(`    ⚠️  Thumbnail file NOT FOUND: ${thumbnailPath}`);
        }
      } else {
        console.log(`    ❌ NO THUMBNAIL SET`);
      }
      
      console.log('');
    });

    db.close();
  });
});
