// Stop all live streams on VPS
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== STOPPING ALL LIVE STREAMS ===\n');

// Get all live streams
db.all("SELECT id, title FROM streams WHERE status = 'live'", [], (err, liveStreams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${liveStreams.length} live stream(s) to stop\n`);
  
  if (liveStreams.length === 0) {
    console.log('No live streams to stop\n');
    db.close();
    process.exit(0);
  }
  
  let stopped = 0;
  
  liveStreams.forEach((stream, idx) => {
    console.log(`${idx + 1}. Stopping: ${stream.title}`);
    console.log(`   ID: ${stream.id.substring(0, 8)}...`);
    
    // Update stream status to offline
    db.run(
      "UPDATE streams SET status = 'offline', active_schedule_id = NULL, end_time = CURRENT_TIMESTAMP WHERE id = ?",
      [stream.id],
      (err) => {
        if (err) {
          console.error(`   ✗ Failed to update database:`, err.message);
        } else {
          console.log(`   ✅ Database updated (status: offline)`);
        }
        
        stopped++;
        
        if (stopped === liveStreams.length) {
          console.log('\n=== KILLING FFMPEG PROCESSES ===\n');
          
          // Kill all FFmpeg processes
          exec('pkill -9 ffmpeg', (error, stdout, stderr) => {
            if (error) {
              console.log('⚠️  No FFmpeg processes found or already stopped');
            } else {
              console.log('✅ All FFmpeg processes killed');
            }
            
            console.log('\n=== COMPLETED ===');
            console.log(`\n✅ Stopped ${liveStreams.length} stream(s)`);
            console.log('📋 Streams will restart automatically tomorrow according to schedule\n');
            
            db.close();
            process.exit(0);
          });
        }
      }
    );
  });
});
