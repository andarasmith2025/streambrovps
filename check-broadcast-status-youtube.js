require('dotenv').config();
const { getTokensForUser } = require('./routes/youtube');
const youtubeService = require('./services/youtubeService');

async function checkBroadcastStatus() {
  try {
    console.log('\n=== CHECKING BROADCAST STATUS IN YOUTUBE ===\n');
    
    const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
    const broadcastId = 'b0BIUFipoqY';
    
    // Get tokens
    const tokens = await getTokensForUser(userId);
    if (!tokens || !tokens.access_token) {
      console.error('❌ No tokens found');
      return;
    }
    
    console.log('✓ Tokens found');
    console.log('Broadcast ID:', broadcastId);
    console.log('');
    
    // Get broadcast status from YouTube API
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
    
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    const response = await youtube.liveBroadcasts.list({
      part: 'id,snippet,status,contentDetails',
      id: broadcastId
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const broadcast = response.data.items[0];
      
      console.log('📺 BROADCAST INFO:');
      console.log('  Title:', broadcast.snippet.title);
      console.log('  Life Cycle Status:', broadcast.status.lifeCycleStatus);
      console.log('  Privacy Status:', broadcast.status.privacyStatus);
      console.log('  Recording Status:', broadcast.status.recordingStatus);
      console.log('  Scheduled Start:', broadcast.snippet.scheduledStartTime);
      console.log('  Actual Start:', broadcast.snippet.actualStartTime || 'Not started');
      console.log('  Actual End:', broadcast.snippet.actualEndTime || 'Not ended');
      
      if (broadcast.contentDetails && broadcast.contentDetails.boundStreamId) {
        console.log('  Bound Stream ID:', broadcast.contentDetails.boundStreamId);
        
        // Check stream status
        const streamResponse = await youtube.liveStreams.list({
          part: 'id,snippet,status',
          id: broadcast.contentDetails.boundStreamId
        });
        
        if (streamResponse.data.items && streamResponse.data.items.length > 0) {
          const stream = streamResponse.data.items[0];
          console.log('\n📡 STREAM INFO:');
          console.log('  Stream Status:', stream.status.streamStatus);
          console.log('  Health Status:', stream.status.healthStatus?.status || 'N/A');
        }
      }
      
      console.log('\n✅ STATUS SUMMARY:');
      if (broadcast.status.lifeCycleStatus === 'live') {
        console.log('  🟢 BROADCAST IS LIVE!');
      } else if (broadcast.status.lifeCycleStatus === 'ready') {
        console.log('  🟡 Broadcast is ready but not live yet');
      } else if (broadcast.status.lifeCycleStatus === 'testing') {
        console.log('  🟡 Broadcast is in testing mode');
      } else {
        console.log('  🔴 Broadcast status:', broadcast.status.lifeCycleStatus);
      }
      
    } else {
      console.log('❌ Broadcast not found in YouTube');
    }
    
    console.log('\n=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response && error.response.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkBroadcastStatus();
