/**
 * Force Stop All Streams and Clean Up YouTube Broadcasts
 * Use this to clean up stuck streams and broadcasts
 */

const { db } = require('./db/database');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function forceStopAllStreams() {
  console.log('\n========================================');
  console.log('FORCE STOP ALL STREAMS');
  console.log('========================================\n');
  
  try {
    // 1. Kill all FFmpeg processes
    console.log('1️⃣  Killing all FFmpeg processes...');
    try {
      await execPromise('pkill -9 ffmpeg');
      console.log('   ✅ All FFmpeg processes killed');
    } catch (error) {
      if (error.code === 1) {
        console.log('   ℹ️  No FFmpeg processes found');
      } else {
        console.error('   ❌ Error killing FFmpeg:', error.message);
      }
    }
    
    // 2. Get all live streams from database
    console.log('\n2️⃣  Finding live streams in database...');
    const liveStreams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, user_id, use_youtube_api, youtube_broadcast_id, youtube_stream_id 
         FROM streams 
         WHERE status = 'live'`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`   Found ${liveStreams.length} live stream(s)`);
    
    if (liveStreams.length === 0) {
      console.log('\n✅ No live streams found. All clean!');
      process.exit(0);
    }
    
    // 3. Transition YouTube broadcasts to complete
    console.log('\n3️⃣  Transitioning YouTube broadcasts...');
    
    for (const stream of liveStreams) {
      console.log(`\n   Stream: ${stream.title} (${stream.id})`);
      
      if (stream.use_youtube_api && stream.youtube_broadcast_id) {
        try {
          // Get user tokens
          const { getTokensForUser } = require('./routes/youtube');
          const youtubeService = require('./services/youtubeService');
          
          const tokens = await getTokensForUser(stream.user_id);
          
          if (tokens && tokens.access_token) {
            console.log(`   → Transitioning broadcast ${stream.youtube_broadcast_id} to complete...`);
            
            await youtubeService.transition(tokens, {
              broadcastId: stream.youtube_broadcast_id,
              status: 'complete'
            });
            
            console.log(`   ✅ Broadcast transitioned to complete`);
            
            // Clear broadcast IDs from stream
            await new Promise((resolve, reject) => {
              db.run(
                `UPDATE streams 
                 SET youtube_broadcast_id = NULL, 
                     youtube_stream_id = NULL 
                 WHERE id = ?`,
                [stream.id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
            
            console.log(`   ✅ Cleared broadcast IDs from stream`);
            
          } else {
            console.log(`   ⚠️  No valid tokens for user ${stream.user_id}`);
          }
        } catch (ytError) {
          console.error(`   ❌ Error transitioning broadcast: ${ytError.message}`);
        }
      } else {
        console.log(`   ℹ️  Not a YouTube API stream or no broadcast ID`);
      }
    }
    
    // 4. Update all live streams to offline
    console.log('\n4️⃣  Updating stream statuses to offline...');
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE streams 
         SET status = 'offline', 
             active_schedule_id = NULL,
             start_time = NULL,
             updated_at = CURRENT_TIMESTAMP 
         WHERE status = 'live'`,
        [],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`   ✅ Updated ${this.changes} stream(s) to offline`);
            resolve();
          }
        }
      );
    });
    
    // 5. Clear broadcast IDs from schedules
    console.log('\n5️⃣  Clearing broadcast IDs from schedules...');
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE stream_schedules 
         SET youtube_broadcast_id = NULL,
             broadcast_status = 'pending'
         WHERE youtube_broadcast_id IS NOT NULL`,
        [],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`   ✅ Cleared ${this.changes} schedule(s)`);
            resolve();
          }
        }
      );
    });
    
    console.log('\n========================================');
    console.log('✅ ALL STREAMS FORCE STOPPED');
    console.log('========================================\n');
    
    console.log('Summary:');
    console.log(`  • FFmpeg processes: Killed`);
    console.log(`  • YouTube broadcasts: Transitioned to complete`);
    console.log(`  • Stream statuses: Updated to offline`);
    console.log(`  • Broadcast IDs: Cleared`);
    console.log(`  • Schedules: Reset to pending`);
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
forceStopAllStreams();
