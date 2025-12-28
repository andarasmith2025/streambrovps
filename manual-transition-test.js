const { getTokensForUser } = require('./routes/youtube');
const youtubeService = require('./services/youtubeService');

const ADMIN_USER_ID = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
const BROADCAST_ID = 'gqLXRpkY0e4';
const CHANNEL_ID = 'UC-bgj2tX3FLGV67q6SiZBJA';

async function test() {
  try {
    console.log('Getting tokens...');
    const tokens = await getTokensForUser(ADMIN_USER_ID, CHANNEL_ID);
    
    if (!tokens) {
      console.error('No tokens found');
      return;
    }
    
    console.log('✓ Tokens found');
    console.log('\nGetting broadcast info...');
    
    const broadcast = await youtubeService.getBroadcast(tokens, { broadcastId: BROADCAST_ID });
    
    console.log('\nBroadcast Info:');
    console.log('  ID:', broadcast.id);
    console.log('  Title:', broadcast.snippet.title);
    console.log('  Status:', broadcast.status.lifeCycleStatus);
    console.log('  Recording Status:', broadcast.status.recordingStatus);
    console.log('  Bound Stream ID:', broadcast.contentDetails.boundStreamId);
    console.log('  Enable Auto Start:', broadcast.contentDetails.enableAutoStart);
    console.log('  Enable Auto Stop:', broadcast.contentDetails.enableAutoStop);
    
    const streamId = broadcast.contentDetails.boundStreamId;
    
    if (streamId) {
      console.log('\nChecking stream status...');
      const streamActive = await youtubeService.isStreamActive(tokens, { streamId });
      console.log('  Stream Active:', streamActive);
      
      if (streamActive && broadcast.status.lifeCycleStatus !== 'live') {
        console.log('\n✅ Stream is active and broadcast is not live yet');
        console.log('You can manually transition to live from YouTube Studio or use the Go Live button');
        
        // Optionally attempt transition
        console.log('\nAttempting transition to live...');
        try {
          await youtubeService.transition(tokens, { 
            broadcastId: BROADCAST_ID, 
            status: 'live',
            channelId: CHANNEL_ID
          });
          console.log('✅ Transition successful!');
        } catch (err) {
          console.error('❌ Transition failed:', err.message);
          if (err.response?.data) {
            console.error('Error details:', JSON.stringify(err.response.data, null, 2));
          }
        }
      } else if (broadcast.status.lifeCycleStatus === 'live') {
        console.log('\n✅ Broadcast is already LIVE!');
      } else {
        console.log('\n⚠️ Stream is not active yet. FFmpeg may still be connecting.');
      }
    } else {
      console.log('\n❌ No stream bound to broadcast');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
