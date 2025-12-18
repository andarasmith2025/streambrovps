// Test script to check YouTube stream keys
const { google } = require('googleapis');
require('dotenv').config();

async function testYouTubeStreams() {
  try {
    console.log('Testing YouTube API stream keys...\n');
    
    // You need to provide your access token here
    const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'; // Get this from browser console after connecting
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      access_token: ACCESS_TOKEN
    });
    
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Method 1: Get live streams directly
    console.log('=== Method 1: liveStreams.list (direct) ===');
    const streamsResponse = await youtube.liveStreams.list({
      part: ['snippet', 'cdn', 'status'],
      mine: true,
      maxResults: 50
    });
    
    const streams = streamsResponse.data.items || [];
    console.log(`Found ${streams.length} live streams\n`);
    
    streams.forEach((stream, index) => {
      console.log(`Stream ${index + 1}:`);
      console.log(`  ID: ${stream.id}`);
      console.log(`  Title: ${stream.snippet?.title || 'N/A'}`);
      console.log(`  Status: ${stream.status?.streamStatus}`);
      console.log(`  Has Ingestion Info: ${!!stream.cdn?.ingestionInfo}`);
      if (stream.cdn?.ingestionInfo) {
        console.log(`  RTMP URL: ${stream.cdn.ingestionInfo.ingestionAddress}`);
        console.log(`  Stream Key: ${stream.cdn.ingestionInfo.streamName?.substring(0, 20)}...`);
      }
      console.log('');
    });
    
    // Method 2: Get broadcasts then fetch streams
    console.log('\n=== Method 2: liveBroadcasts.list then liveStreams ===');
    const broadcastsResponse = await youtube.liveBroadcasts.list({
      part: ['snippet', 'contentDetails', 'status'],
      mine: true,
      maxResults: 50
    });
    
    const broadcasts = broadcastsResponse.data.items || [];
    console.log(`Found ${broadcasts.length} broadcasts\n`);
    
    let streamKeysCount = 0;
    for (const broadcast of broadcasts) {
      const streamId = broadcast.contentDetails?.boundStreamId;
      if (streamId) {
        streamKeysCount++;
        console.log(`Broadcast: ${broadcast.snippet?.title}`);
        console.log(`  Bound Stream ID: ${streamId}`);
      }
    }
    
    console.log(`\nBroadcasts with bound streams: ${streamKeysCount}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testYouTubeStreams();
