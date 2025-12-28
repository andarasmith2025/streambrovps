const db = require('./db/database');
const youtubeTokenManager = require('./services/youtubeTokenManager');
const { google } = require('googleapis');

const streamId = '51203840-e0e1-41a1-a780-d5a72c5a7f4d';

console.log('Checking YouTube broadcast status for stream:', streamId);

const { promisify } = require('util');
const dbAll = promisify(db.all.bind(db));

(async () => {
  try {
    const rows = await dbAll(`
  SELECT 
    s.*,
    u.id as user_id
  FROM streams s
  JOIN users u ON s.user_id = u.id
  WHERE s.id = ?
`, [streamId]);
  
  const stream = rows && rows[0];
  
  if (!stream) {
    console.error('Stream not found');
    process.exit(1);
  }
  
  console.log('\nStream Info:');
  console.log('  Title:', stream.title);
  console.log('  Status:', stream.status);
  console.log('  Broadcast ID:', stream.youtube_broadcast_id || 'NOT SET');
  console.log('  Start Time:', stream.start_time);
  
  if (!stream.youtube_broadcast_id) {
    console.log('\n❌ No broadcast ID found');
    process.exit(0);
  }
  
  const tokens = await youtubeTokenManager.getTokensFromDB(stream.user_id, stream.youtube_channel_id);
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
  
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  
  console.log('\nFetching broadcast from YouTube API...');
  const response = await youtube.liveBroadcasts.list({
    part: 'id,snippet,status,contentDetails',
    id: stream.youtube_broadcast_id
  });
  
  if (!response.data.items || response.data.items.length === 0) {
    console.log('❌ Broadcast not found in YouTube');
    process.exit(0);
  }
  
  const broadcast = response.data.items[0];
  console.log('\n✅ Broadcast found in YouTube:');
  console.log('  ID:', broadcast.id);
  console.log('  Title:', broadcast.snippet.title);
  console.log('  Life Cycle Status:', broadcast.status.lifeCycleStatus);
  console.log('  Privacy Status:', broadcast.status.privacyStatus);
  console.log('  Recording Status:', broadcast.status.recordingStatus);
  console.log('  Bound Stream ID:', broadcast.contentDetails.boundStreamId || 'NOT BOUND');
  console.log('  Enable Auto Start:', broadcast.contentDetails.enableAutoStart);
  console.log('  Enable Auto Stop:', broadcast.contentDetails.enableAutoStop);
  console.log('  Scheduled Start:', broadcast.snippet.scheduledStartTime);
  
  if (broadcast.status.lifeCycleStatus !== 'live') {
    console.log('\n⚠️  BROADCAST IS NOT LIVE IN YOUTUBE!');
    console.log('   Current status:', broadcast.status.lifeCycleStatus);
  } else {
    console.log('\n✅ Broadcast is LIVE in YouTube');
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
