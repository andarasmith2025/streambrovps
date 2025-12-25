/**
 * Force Stop and Cleanup Stuck Streams
 * Stops FFmpeg, transitions YouTube broadcasts, and cleans up database
 */

const { db } = require('./db/database');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function forceStopAndCleanup() {
  console.log('\n========================================');
  console.log('FORCE STOP & CLEANUP STUCK STREAMS');
  console.log('========================================\n');
  
  try {
    // 1. Find all "live" streams
    const liveStreams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, status, use_youtube_api, youtube_broadcast_id, youtube_stream_id, user_id 
         FROM streams 
         WHERE status = 'live'`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (liveStreams.length === 0) {
      console.log('✓ No live streams found. All clean!');
      process.exit(0);
    }
    
    console.log(`Found ${liveStreams.length} live stream(s) to clean up:\n`);
    
    for (const stream of liveStreams) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Stream: ${stream.title}`);
      console.log(`ID: ${stream.id}`);
      console.log(`Status: ${stream.status}`);
      
      // 2. Kill FFmpeg processes
      console.log('\n[1/4] Killing FFmpeg processes...');
      try {
        // Find FFmpeg processes for this stream
        const { stdout } = await execPromise(`ps aux | grep ffmpeg | grep "${stream.id}" | grep -v grep || true`);
        
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          console.log(`Found ${lines.length} FFmpeg process(es)`);
          
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[1];
            
            if (pid && !isNaN(pid)) {
              console.log(`  Killing PID ${pid}...`);
              try {
                await execPromise(`kill -9 ${pid}`);
                console.log(`  ✓ Killed PID ${pid}`);
              } catch (killError) {
                console.log(`  ✗ Failed to kill PID ${pid}: ${killError.message}`);
              }
            }
          }
        } else {
          console.log('  ✓ No FFmpeg processes found');
        }
      } catch (psError) {
        console.log('  ✓ No FFmpeg processes found (or ps command failed)');
      }
      
      // 3. Transition YouTube broadcast to complete
      if (stream.use_youtube_api && stream.youtube_broadcast_id) {
        console.log('\n[2/4] Transitioning YouTube broadcast to complete...');
        console.log(`  Broadcast ID: ${stream.youtube_broadcast_id}`);
        
        try {
          const { getTokensForUser } = require('./routes/youtube');
          const youtubeService = require('./services/youtubeService');
          
          const tokens = await getTokensForUser(stream.user_id);
          
          if (tokens && tokens.access_token) {
            await youtubeService.transition(tokens, {
              broadcastId: stream.youtube_broadcast_id,
              status: 'complete'
            });
            console.log('  ✓ YouTube broadcast transitioned to complete');
          } else {
            console.log('  ✗ No valid YouTube tokens found');
          }
        } catch (ytError) {
          console.log(`  ✗ Failed to transition YouTube broadcast: ${ytError.message}`);
          console.log('  ⚠️  You may need to manually end the broadcast in YouTube Studio');
        }
      } else {
        console.log('\n[2/4] Skipping YouTube transition (not using YouTube API)');
      }
      
      // 4. Clear broadcast IDs from schedules
      console.log('\n[3/4] Clearing broadcast IDs from schedules...');
      try {
        const result = await new Promise((resolve, reject) => {
          db.run(
            `UPDATE stream_schedules 
             SET youtube_broadcast_id = NULL, broadcast_status = 'pending' 
             WHERE stream_id = ?`,
            [stream.id],
            function(err) {
              if (err) reject(err);
              else resolve(this.changes);
            }
          );
        });
        console.log(`  ✓ Cleared broadcast IDs from ${result} schedule(s)`);
      } catch (schedError) {
        console.log(`  ✗ Failed to clear schedule broadcast IDs: ${schedError.message}`);
      }
      
      // 5. Update stream status to offline and clear fields
      console.log('\n[4/4] Updating stream status to offline...');
      try {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE streams 
             SET status = 'offline',
                 youtube_broadcast_id = NULL,
                 youtube_stream_id = NULL,
                 active_schedule_id = NULL,
                 start_time = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [stream.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        console.log('  ✓ Stream status updated to offline');
        console.log('  ✓ Cleared youtube_broadcast_id');
        console.log('  ✓ Cleared youtube_stream_id');
        console.log('  ✓ Cleared active_schedule_id');
        console.log('  ✓ Cleared start_time');
      } catch (updateError) {
        console.log(`  ✗ Failed to update stream: ${updateError.message}`);
      }
      
      console.log('\n✅ Stream cleanup completed!\n');
    }
    
    console.log('========================================');
    console.log('ALL STREAMS CLEANED UP SUCCESSFULLY!');
    console.log('========================================\n');
    
    // Show final status
    console.log('Final status check:\n');
    const finalStreams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, status, youtube_broadcast_id, active_schedule_id 
         FROM streams 
         ORDER BY updated_at DESC 
         LIMIT 10`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    for (const stream of finalStreams) {
      console.log(`• ${stream.title}`);
      console.log(`  Status: ${stream.status}`);
      console.log(`  Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
      console.log(`  Active Schedule: ${stream.active_schedule_id || 'NULL'}`);
      console.log('');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

forceStopAndCleanup();
