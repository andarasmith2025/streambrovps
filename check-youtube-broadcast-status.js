const { google } = require('googleapis');
const { getTokensForUser } = require('./routes/youtube');
const { db } = require('./db/database');

async function checkBroadcastStatus() {
  console.log('Checking YouTube broadcast status for live streams...\n');
  
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
      ORDER BY youtube_channel_id, start_time DESC`,
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
  
  console.log(`Found ${streams.length} live stream(s) with broadcast IDs\n`);
  
  const channelStats = {};
  
  for (const stream of streams) {
    try {
      console.log(`Checking: ${stream.title}`);
      console.log(`  Broadcast ID: ${stream.youtube_broadcast_id}`);
      console.log(`  Channel ID: ${stream.youtube_channel_id}`);
      
      // Get tokens for this user/channel
      const tokens = await getTokensForUser(stream.user_id, stream.youtube_channel_id);
      
      if (!tokens) {
        console.log(`  ❌ No tokens found for user ${stream.user_id}`);
        console.log('');
        continue;
      }
      
      // Query YouTube API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      
      const response = await youtube.liveBroadcasts.list({
        part: 'id,snippet,status,contentDetails',
        id: stream.youtube_broadcast_id
      });
      
      if (!response.data.items || response.data.items.length === 0) {
        console.log(`  ⚠️ Broadcast NOT FOUND in YouTube API!`);
        console.log(`  ⚠️ Broadcast may have been deleted or doesn't exist`);
      } else {
        const broadcast = response.data.items[0];
        const lifeCycleStatus = broadcast.status.lifeCycleStatus;
        const privacyStatus = broadcast.status.privacyStatus;
        const boundStreamId = broadcast.contentDetails?.boundStreamId;
        
        console.log(`  ✓ Broadcast found in YouTube`);
        console.log(`    Status: ${lifeCycleStatus}`);
        console.log(`    Privacy: ${privacyStatus}`);
        console.log(`    Bound Stream: ${boundStreamId || 'NOT BOUND'}`);
        
        // Track stats by channel
        const channelId = stream.youtube_channel_id;
        if (!channelStats[channelId]) {
          channelStats[channelId] = {
            total: 0,
            live: 0,
            testing: 0,
            ready: 0,
            complete: 0,
            notFound: 0
          };
        }
        channelStats[channelId].total++;
        
        if (lifeCycleStatus === 'live') {
          channelStats[channelId].live++;
        } else if (lifeCycleStatus === 'testing') {
          channelStats[channelId].testing++;
        } else if (lifeCycleStatus === 'ready') {
          channelStats[channelId].ready++;
        } else if (lifeCycleStatus === 'complete') {
          channelStats[channelId].complete++;
        }
        
        if (lifeCycleStatus !== 'live' && lifeCycleStatus !== 'testing') {
          console.log(`  ⚠️ Broadcast is ${lifeCycleStatus} but stream is marked as live in DB!`);
        }
      }
      
      console.log('');
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`  ❌ Error checking broadcast: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('='.repeat(60));
  console.log('Summary by Channel:');
  Object.keys(channelStats).forEach(channelId => {
    const stats = channelStats[channelId];
    console.log(`\n  Channel: ${channelId}`);
    console.log(`    Total broadcasts: ${stats.total}`);
    console.log(`    Live: ${stats.live}`);
    console.log(`    Testing: ${stats.testing}`);
    console.log(`    Ready: ${stats.ready}`);
    console.log(`    Complete: ${stats.complete}`);
    console.log(`    Not Found: ${stats.notFound}`);
  });
  console.log('='.repeat(60));
  
  db.close();
}

checkBroadcastStatus().catch(err => {
  console.error('Fatal error:', err);
  db.close();
  process.exit(1);
});
