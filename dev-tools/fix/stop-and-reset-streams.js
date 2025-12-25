const { db } = require('./db/database');
const streamingService = require('./services/streamingService');

async function stopAndResetStreams() {
  try {
    console.log('=== Stopping Admin Live Streams and Resetting Broadcasts ===\n');
    
    // Get admin user
    const admin = await new Promise((resolve, reject) => {
      db.get('SELECT id, username FROM users LIMIT 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log(`Admin user: ${admin.username} (${admin.id})\n`);
    
    // Get all live streams for admin
    const streams = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, title, status, active_schedule_id, use_youtube_api FROM streams WHERE status = ? AND user_id = ?',
        ['live', admin.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    if (!streams || streams.length === 0) {
      console.log('No live streams found for admin');
      return;
    }
    
    console.log(`Found ${streams.length} live stream(s) for admin:\n`);
    
    // Separate YouTube API streams from manual RTMP
    const youtubeStreams = streams.filter(s => s.use_youtube_api === 1);
    const manualStreams = streams.filter(s => s.use_youtube_api !== 1);
    
    console.log(`  YouTube API streams: ${youtubeStreams.length}`);
    console.log(`  Manual RTMP streams: ${manualStreams.length}\n`);
    
    // Only stop YouTube API streams that don't have broadcasts
    for (const stream of youtubeStreams) {
      console.log(`Checking stream: ${stream.title}`);
      console.log(`  Stream ID: ${stream.id}`);
      console.log(`  Active Schedule: ${stream.active_schedule_id || 'None'}`);
      
      // Check if this stream has a broadcast
      const schedule = stream.active_schedule_id ? await new Promise((resolve, reject) => {
        db.get(
          'SELECT youtube_broadcast_id FROM stream_schedules WHERE id = ?',
          [stream.active_schedule_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      }) : null;
      
      const hasBroadcast = schedule && schedule.youtube_broadcast_id;
      
      if (hasBroadcast) {
        console.log(`  ✓ Has broadcast: ${schedule.youtube_broadcast_id} - SKIP (let it finish normally)\n`);
        continue;
      }
      
      console.log(`  ❌ No broadcast - STOPPING...\n`);
      
      try {
        // Stop the stream
        await streamingService.stopStream(stream.id);
        console.log(`  ✅ Stream stopped\n`);
        
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  ❌ Error stopping stream: ${error.message}\n`);
      }
    }
    
    // Clear broadcast_id from all recurring schedules for admin
    console.log('\n=== Clearing Broadcast IDs from Admin Recurring Schedules ===\n');
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE stream_schedules 
         SET youtube_broadcast_id = NULL, broadcast_status = ? 
         WHERE is_recurring = 1 
         AND stream_id IN (SELECT id FROM streams WHERE user_id = ?)`,
        ['pending', admin.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
    
    console.log(`✅ Cleared broadcast_id from ${result} recurring schedule(s)`);
    console.log('\nDone! Broadcasts will be created fresh tomorrow with thumbnails.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

stopAndResetStreams();
