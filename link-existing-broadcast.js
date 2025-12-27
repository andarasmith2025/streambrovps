const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== LINK EXISTING YOUTUBE BROADCAST TO STREAM ===\n');
console.log('Script ini untuk menghubungkan stream yang sudah live');
console.log('dengan broadcast YouTube yang sudah ada sebelumnya.\n');
console.log('Dengan ini, auto-stop akan tetap jalan!\n');
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
    rl.close();
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
      s.status,
      s.rtmp_url,
      s.stream_key,
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
      rl.close();
      return;
    }

    if (streams.length === 0) {
      console.log('✅ Tidak ada stream yang perlu di-link');
      db.close();
      rl.close();
      return;
    }

    console.log(`📺 ${streams.length} STREAM(S) TANPA BROADCAST ID:\n`);
    
    streams.forEach((stream, idx) => {
      console.log(`[${idx + 1}] ${stream.title}`);
      console.log(`    Stream ID: ${stream.id}`);
      console.log(`    Stream Key: ${stream.stream_key}`);
      console.log(`    Duration: ${stream.duration} minutes`);
      console.log(`    Started: ${stream.start_time}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📖 CARA MENGGUNAKAN:\n');
    console.log('1. Buka YouTube Studio: https://studio.youtube.com');
    console.log('2. Lihat broadcast yang sedang LIVE atau READY');
    console.log('3. Copy Broadcast ID dari URL');
    console.log('   Contoh URL: https://studio.youtube.com/video/ABC123xyz/livestreaming');
    console.log('   Broadcast ID: ABC123xyz\n');
    console.log('4. Masukkan nomor stream dan Broadcast ID di bawah\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    function askForLink() {
      rl.question('Pilih nomor stream (atau ketik "exit" untuk keluar): ', (streamNum) => {
        if (streamNum.toLowerCase() === 'exit') {
          console.log('\n✅ Selesai');
          db.close();
          rl.close();
          return;
        }

        const streamIndex = parseInt(streamNum) - 1;
        
        if (isNaN(streamIndex) || streamIndex < 0 || streamIndex >= streams.length) {
          console.log('❌ Nomor stream tidak valid\n');
          askForLink();
          return;
        }

        const selectedStream = streams[streamIndex];
        
        console.log(`\n✅ Stream dipilih: ${selectedStream.title}`);
        console.log(`   Stream ID: ${selectedStream.id}`);
        console.log(`   Stream Key: ${selectedStream.stream_key}\n`);
        
        rl.question('Masukkan Broadcast ID dari YouTube Studio: ', (broadcastId) => {
          if (!broadcastId || broadcastId.trim() === '') {
            console.log('❌ Broadcast ID tidak boleh kosong\n');
            askForLink();
            return;
          }

          const cleanBroadcastId = broadcastId.trim();
          
          console.log(`\n🔗 Menghubungkan stream dengan broadcast ${cleanBroadcastId}...`);
          
          // Update stream with broadcast ID
          db.run(`
            UPDATE streams
            SET youtube_broadcast_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [cleanBroadcastId, selectedStream.id], function(err) {
            if (err) {
              console.error('❌ Error:', err);
              askForLink();
              return;
            }

            if (this.changes === 0) {
              console.log('❌ Stream tidak ditemukan atau tidak ada perubahan\n');
            } else {
              console.log('✅ Berhasil! Stream sudah terhubung dengan broadcast YouTube');
              console.log(`   Stream ID: ${selectedStream.id}`);
              console.log(`   Broadcast ID: ${cleanBroadcastId}`);
              console.log(`   Duration: ${selectedStream.duration} minutes`);
              console.log('\n💡 Auto-stop akan jalan sesuai duration!\n');
              
              // Remove from array
              streams.splice(streamIndex, 1);
              
              if (streams.length === 0) {
                console.log('✅ Semua stream sudah di-link!');
                db.close();
                rl.close();
                return;
              }
            }
            
            console.log('═══════════════════════════════════════════════════════════\n');
            console.log(`📺 ${streams.length} STREAM(S) TERSISA:\n`);
            
            streams.forEach((stream, idx) => {
              console.log(`[${idx + 1}] ${stream.title}`);
              console.log(`    Stream ID: ${stream.id}`);
              console.log(`    Stream Key: ${stream.stream_key}`);
              console.log('');
            });
            
            console.log('═══════════════════════════════════════════════════════════\n');
            askForLink();
          });
        });
      });
    }

    askForLink();
  });
});
