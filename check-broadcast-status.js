/**
 * Check YouTube Broadcast Status
 * Usage: node check-broadcast-status.js <broadcastId>
 */

const { google } = require('googleapis');
const { db } = require('./db/database');

const broadcastId = process.argv[2];

if (!broadcastId) {
  console.error('❌ Usage: node check-broadcast-status.js <broadcastId>');
  process.exit(1);
}

async function checkBroadcastStatus() {
  try {
    console.log(`\n🔍 Checking broadcast status for: ${broadcastId}\n`);
    
    // Get user tokens from database
    const tokens = await new Promise((resolve, reject) => {
      db.get(
        `SELECT access_token, refresh_token, expiry_date 
         FROM youtube_channels 
         WHERE is_default = 1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!tokens || !tokens.access_token) {
      console.error('❌ No YouTube tokens found in database');
      console.log('💡 Please connect YouTube account first');
      process.exit(1);
    }
    
    console.log('✅ Found YouTube tokens');
    
    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
    
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Get broadcast details
    console.log('📡 Fetching broadcast details from YouTube API...\n');
    
    const broadcastResponse = await youtube.liveBroadcasts.list({
      part: 'id,snippet,status,contentDetails',
      id: broadcastId
    });
    
    if (!broadcastResponse.data.items || broadcastResponse.data.items.length === 0) {
      console.error('❌ Broadcast not found');
      console.log('💡 Possible reasons:');
      console.log('   - Broadcast ID is incorrect');
      console.log('   - Broadcast was deleted');
      console.log('   - Broadcast belongs to different channel');
      process.exit(1);
    }
    
    const broadcast = broadcastResponse.data.items[0];
    
    // Display broadcast info
    console.log('📺 BROADCAST INFORMATION');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Title:              ${broadcast.snippet.title}`);
    console.log(`Broadcast ID:       ${broadcast.id}`);
    console.log(`Life Cycle Status:  ${broadcast.status.lifeCycleStatus}`);
    console.log(`Privacy Status:     ${broadcast.status.privacyStatus}`);
    console.log(`Recording Status:   ${broadcast.status.recordingStatus || 'N/A'}`);
    console.log(`Scheduled Start:    ${broadcast.snippet.scheduledStartTime}`);
    console.log(`Actual Start:       ${broadcast.snippet.actualStartTime || 'Not started yet'}`);
    console.log(`Actual End:         ${broadcast.snippet.actualEndTime || 'Not ended yet'}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get bound stream info
    const boundStreamId = broadcast.contentDetails.boundStreamId;
    
    if (boundStreamId) {
      console.log('🎥 BOUND STREAM INFORMATION');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Stream ID:          ${boundStreamId}`);
      
      try {
        const streamResponse = await youtube.liveStreams.list({
          part: 'id,snippet,cdn,status',
          id: boundStreamId
        });
        
        if (streamResponse.data.items && streamResponse.data.items.length > 0) {
          const stream = streamResponse.data.items[0];
          console.log(`Stream Status:      ${stream.status.streamStatus}`);
          console.log(`Health Status:      ${stream.status.healthStatus?.status || 'N/A'}`);
          console.log(`Ingestion Type:     ${stream.cdn.ingestionType}`);
          console.log(`Resolution:         ${stream.cdn.resolution || 'N/A'}`);
          console.log(`Frame Rate:         ${stream.cdn.frameRate || 'N/A'}`);
          
          if (stream.cdn.ingestionInfo) {
            console.log(`\n📡 INGESTION INFO:`);
            console.log(`   RTMP URL:        ${stream.cdn.ingestionInfo.rtmpsIngestionAddress || stream.cdn.ingestionInfo.ingestionAddress || 'N/A'}`);
            console.log(`   Stream Name:     ${stream.cdn.ingestionInfo.streamName || 'N/A'}`);
          }
        }
      } catch (streamErr) {
        console.log(`⚠️  Could not fetch stream details: ${streamErr.message}`);
      }
      
      console.log('═══════════════════════════════════════════════════════════\n');
    } else {
      console.log('⚠️  No stream bound to this broadcast\n');
    }
    
    // Analyze status
    console.log('🔍 STATUS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════');
    
    const lifeCycleStatus = broadcast.status.lifeCycleStatus;
    
    switch (lifeCycleStatus) {
      case 'created':
        console.log('📝 Status: CREATED');
        console.log('   Broadcast has been created but not ready yet');
        console.log('   ➡️  Next: Transition to "ready" or "testing"');
        break;
        
      case 'ready':
        console.log('✅ Status: READY');
        console.log('   Broadcast is ready but not live yet');
        console.log('   ➡️  Next: Transition to "testing" or "live"');
        console.log('   💡 Action: Start streaming to transition to live');
        break;
        
      case 'testing':
        console.log('🧪 Status: TESTING');
        console.log('   Broadcast is in testing mode (private stream)');
        console.log('   ➡️  Next: Transition to "live"');
        console.log('   💡 Action: Call transition API to go live');
        break;
        
      case 'live':
        console.log('🔴 Status: LIVE');
        console.log('   Broadcast is currently live!');
        console.log('   ➡️  Next: Transition to "complete"');
        console.log('   💡 Action: Stop streaming to end broadcast');
        break;
        
      case 'complete':
        console.log('✅ Status: COMPLETE');
        console.log('   Broadcast has ended successfully');
        console.log('   VOD processing may still be in progress');
        break;
        
      case 'revoked':
        console.log('❌ Status: REVOKED');
        console.log('   Broadcast was cancelled or revoked');
        break;
        
      default:
        console.log(`❓ Status: ${lifeCycleStatus} (unknown)`);
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Recommendations
    if (lifeCycleStatus === 'ready') {
      console.log('💡 RECOMMENDATIONS:');
      console.log('   1. Start streaming to RTMP URL with stream key');
      console.log('   2. Wait for stream to become active (check stream status)');
      console.log('   3. Transition broadcast to "live" using API');
      console.log('   4. Or enable Auto Start in broadcast settings\n');
    } else if (lifeCycleStatus === 'testing') {
      console.log('💡 RECOMMENDATIONS:');
      console.log('   1. Stream is active but in testing mode');
      console.log('   2. Transition to "live" to make it public');
      console.log('   3. Use: youtubeService.transitionBroadcast(tokens, broadcastId, "live")\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.code === 403) {
      console.log('\n💡 Possible reasons:');
      console.log('   - YouTube API quota exceeded');
      console.log('   - Insufficient permissions');
      console.log('   - Token expired (try refreshing)');
    } else if (error.code === 401) {
      console.log('\n💡 Token expired or invalid');
      console.log('   - Reconnect YouTube account');
    }
    
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

checkBroadcastStatus();
