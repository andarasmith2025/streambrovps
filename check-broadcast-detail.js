const youtubeTokenManager = require('./services/youtubeTokenManager');
const { google } = require('googleapis');

const broadcastId = 'UePznXgYg8A';
const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb'; // Admin user

console.log(`Checking broadcast: ${broadcastId}\n`);

(async () => {
  try {
    const tokens = await youtubeTokenManager.getTokensFromDB(userId, null);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
    
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    console.log('Fetching broadcast from YouTube API...\n');
    const response = await youtube.liveBroadcasts.list({
      part: 'id,snippet,status,contentDetails',
      id: broadcastId
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      console.log('❌ Broadcast not found in YouTube');
      process.exit(0);
    }
    
    const broadcast = response.data.items[0];
    console.log('✅ Broadcast found:');
    console.log('  ID:', broadcast.id);
    console.log('  Title:', broadcast.snippet.title);
    console.log('  Life Cycle Status:', broadcast.status.lifeCycleStatus);
    console.log('  Privacy Status:', broadcast.status.privacyStatus);
    console.log('  Recording Status:', broadcast.status.recordingStatus);
    console.log('  Scheduled Start:', broadcast.snippet.scheduledStartTime);
    console.log('  Actual Start:', broadcast.snippet.actualStartTime || 'NOT STARTED');
    console.log('  Actual End:', broadcast.snippet.actualEndTime || 'NOT ENDED');
    console.log('\nContent Details:');
    console.log('  Bound Stream ID:', broadcast.contentDetails.boundStreamId || 'NOT BOUND');
    console.log('  Enable Auto Start:', broadcast.contentDetails.enableAutoStart);
    console.log('  Enable Auto Stop:', broadcast.contentDetails.enableAutoStop);
    console.log('  Enable Monitor Stream:', broadcast.contentDetails.enableMonitorStream);
    
    if (broadcast.status.lifeCycleStatus === 'ready') {
      console.log('\n⚠️  Broadcast is READY but not LIVE yet');
      console.log('   Waiting for transition to live...');
    } else if (broadcast.status.lifeCycleStatus === 'live') {
      console.log('\n✅ Broadcast is LIVE');
    } else if (broadcast.status.lifeCycleStatus === 'complete') {
      console.log('\n✅ Broadcast is COMPLETE');
    } else {
      console.log(`\n⚠️  Broadcast status: ${broadcast.status.lifeCycleStatus}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
})();
