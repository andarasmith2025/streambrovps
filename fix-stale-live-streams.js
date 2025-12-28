const { google } = require('googleapis');
const { getTokensForUser } = require('./routes/youtube');
const { db } = require('./db/database');

async function fixStaleLiveStreams() {
  console.log('Fixing stale live streams (marked live but broadcast is complete)...\n');
  
  // Get all live streams with broadcast IDs
  const streams = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        id, 
        title, 
        youtube_broadcast_id,
        youtube_channel_id,
        user_id
      FROM streams 
      WHERE status = 'live' 
        AND youtube_broadcast_id IS NOT NULL
        AND use_youtube_api = 1
      ORDER BY start_time DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  if (streams.length === 0) {
    console.log('No live streams with broadcast IDs found.');
    db.close();
    return;
  }
  
  console.log(`Found ${streams.length} live stream(s) to check\n`);
  
  let fixedCount = 0;
  let stillLiveCount = 0;
  let errorCount = 0;
  
  for (const stream of streams) {
    try {
      console.log(`Checking: ${stream.title}`);
      console.log(`  Stream ID: ${stream.id}`);
      console.log(`  Broadcast ID: ${stream.youtube_broadcast_id}`);
      
      // Get tokens
      const tokens = await getTokensForUser(stream.user_id, stream.youtube_channel_id);
      
      if (!tokens) {
        console.log(`  ⚠️ No tokens, skipping`);
        errorCount++;
        console.log('');
        continue;
      }
      
      // Query YouTube API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      
      const response = await youtube.liveBroadcasts.list({
        part: 'id,status',
        id: stream.youtube_broadcast_id
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        console.log(`  ⚠️ Broadcast not found in YouTube, marking as offline`);
        
        // Update to offline
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE streams 
             SET status = 'offline', 
                 youtube_broadcast_id = NULL,
                 active_schedule_id = NULL,
                 scheduled_end_time = NULL,
                 status_updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [stream.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        console.log(`  ✅ Fixed: Set to offline (broadcast not found)`);
        fixedCount++;
        
      } else {
        const broadcast = response.data.items[0];
        const lifeCycleStatus = broadcast.status.lifeCycleStatus;
        
        console.log(`  YouTube Status: ${lifeCycleStatus}`);
        
        if (lifeCycleStatus === 'complete' || lifeCycleStatus === 'revoked') {
          // Broadcast is done, update stream to offline
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE streams 
               SET status = 'offline', 
                   youtube_broadcast_id = NULL,
                   active_schedule_id = NULL,
                   scheduled_end_time = NULL,
                   status_updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`,
              [stream.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          console.log(`  ✅ Fixed: Set to offline (broadcast ${lifeCycleStatus})`);
          fixedCount++;
          
        } else if (lifeCycleStatus === 'live' || lifeCycleStatus === 'testing') {
          console.log(`  ✓ Still live/testing, no action needed`);
          stillLiveCount++;
          
        } else {
          console.log(`  ⚠️ Unknown status: ${lifeCycleStatus}`);
          errorCount++;
        }
      }
      
      console.log('');
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
      console.log('');
    }
  }
  
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  Total checked: ${streams.length}`);
  console.log(`  Fixed (set to offline): ${fixedCount}`);
  console.log(`  Still live: ${stillLiveCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('='.repeat(60));
  
  db.close();
}

fixStaleLiveStreams().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
