const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== HEALING EARTH - MANUAL GO LIVE GUIDE ===\n');

db.get(`
  SELECT channel_id, channel_title
  FROM youtube_channels
  WHERE channel_title LIKE '%Healing Earth%'
  LIMIT 1
`, (err, channel) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Channel: ${channel.channel_title}`);
  console.log(`Channel ID: ${channel.channel_id}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get streams without broadcast ID
  db.all(`
    SELECT 
      s.id,
      s.title,
      s.rtmp_url,
      s.stream_key,
      s.status,
      s.start_time,
      s.duration
    FROM streams s
    WHERE s.youtube_channel_id = ?
      AND s.status = 'live'
      AND s.youtube_broadcast_id IS NULL
    ORDER BY s.start_time DESC
  `, [channel.channel_id], (err, streams) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log(`📺 ${streams.length} STREAM(S) NEED MANUAL BROADCAST\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (streams.length === 0) {
      console.log('✅ All streams have broadcast IDs');
      db.close();
      return;
    }

    streams.forEach((stream, idx) => {
      console.log(`\n[${idx + 1}] ${stream.title}`);
      console.log(`    Stream ID: ${stream.id}`);
      console.log(`    Status: ${stream.status}`);
      console.log(`    Duration: ${stream.duration} minutes`);
      console.log(`    Started: ${stream.start_time}\n`);
      
      console.log(`    📋 RTMP DETAILS FOR YOUTUBE STUDIO:`);
      console.log(`    ┌─────────────────────────────────────────────────────┐`);
      console.log(`    │ RTMP URL: ${stream.rtmp_url}`);
      console.log(`    │ Stream Key: ${stream.stream_key}`);
      console.log(`    └─────────────────────────────────────────────────────┘\n`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('📖 CARA GO LIVE MANUAL DI YOUTUBE STUDIO:\n');
    console.log('1. Buka YouTube Studio: https://studio.youtube.com');
    console.log('2. Klik "Create" → "Go Live"');
    console.log('3. Pilih "Stream" (bukan Webcam)');
    console.log('4. Isi Title, Description, Thumbnail');
    console.log('5. Di bagian "Stream settings":');
    console.log('   - Copy RTMP URL dari atas');
    console.log('   - Copy Stream Key dari atas');
    console.log('6. Klik "Go Live"\n');
    console.log('⚠️  PENTING: Stream sudah jalan di server, jadi begitu');
    console.log('   kamu klik "Go Live", video langsung muncul!\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('💡 SOLUSI RATE LIMIT:\n');
    console.log('YouTube API Rate Limit exceeded karena terlalu banyak');
    console.log('broadcast dibuat dalam waktu singkat.\n');
    console.log('Solusi:');
    console.log('1. Tunggu beberapa jam (quota reset setiap hari)');
    console.log('2. Gunakan Manual RTMP mode (matikan "Use YouTube API")');
    console.log('3. Kurangi jumlah stream yang dibuat bersamaan');
    console.log('4. Request quota increase di Google Cloud Console\n');

    db.close();
  });
});
