const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== STOP ALL HEALING EARTH STREAMS ===\n');
console.log('Menghentikan semua stream Healing Earth untuk hemat bandwidth\n');
console.log('═══════════════════════════════════════════════════════════\n');

// Get Healing Earth channel
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

  if (!channel) {
    console.log('❌ Healing Earth channel not found');
    db.close();
    return;
  }

  console.log(`Channel: ${channel.channel_title}`);
  console.log(`Channel ID: ${channel.channel_id}\n`);

  // Get all live streams
  db.all(`
    SELECT 
      s.id,
      s.title,
      s.status,
      s.youtube_broadcast_id,
      s.start_time,
      s.duration
    FROM streams s
    WHERE s.youtube_channel_id = ?
      AND s.status = 'live'
    ORDER BY s.start_time DESC
  `, [channel.channel_id], (err, streams) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (streams.length === 0) {
      console.log('✅ Tidak ada stream yang sedang live');
      db.close();
      return;
    }

    console.log(`📺 Found ${streams.length} live stream(s)\n`);
    
    streams.forEach((stream, idx) => {
      console.log(`[${idx + 1}] ${stream.title}`);
      console.log(`    Stream ID: ${stream.id}`);
      console.log(`    Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
      console.log(`    Started: ${stream.start_time}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('🛑 Stopping all streams...\n');

    let stoppedCount = 0;
    let errorCount = 0;

    streams.forEach((stream, idx) => {
      db.run(`
        UPDATE streams
        SET status = 'stopped',
            end_time = CURRENT_TIMESTAMP,
            manual_stop = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [stream.id], function(err) {
        if (err) {
          console.error(`❌ [${idx + 1}] Failed to stop ${stream.id}:`, err.message);
          errorCount++;
        } else {
          console.log(`✅ [${idx + 1}] Stopped: ${stream.title}`);
          console.log(`    Stream ID: ${stream.id}`);
          stoppedCount++;
        }

        // Check if all done
        if (stoppedCount + errorCount === streams.length) {
          console.log('\n═══════════════════════════════════════════════════════════\n');
          console.log('📊 SUMMARY:');
          console.log(`   Total streams: ${streams.length}`);
          console.log(`   ✅ Stopped: ${stoppedCount}`);
          console.log(`   ❌ Failed: ${errorCount}`);
          
          if (stoppedCount > 0) {
            console.log('\n💡 CATATAN:');
            console.log('   - Streams sudah di-stop di database');
            console.log('   - FFmpeg process akan dihentikan otomatis');
            console.log('   - Bandwidth akan berkurang');
            console.log('   - YouTube broadcasts (yang punya ID) akan di-transition ke "complete"');
            console.log('\n⚠️  YOUTUBE DAILY LIMIT:');
            console.log('   - Tunggu 24 jam sebelum buat stream baru');
            console.log('   - Atau gunakan channel YouTube lain');
          }
          
          db.close();
        }
      });
    });
  });
});
