const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');

async function checkBroadcastStatus() {
  try {
    console.log('\n=== CHECKING CURRENT BROADCAST STATUS ===\n');

    const stream = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM streams WHERE id = ?',
        ['987a0ac9-c739-43b5-b639-98f65275bd89'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!stream) {
      console.log('❌ Stream not found');
      return;
    }

    console.log(`📺 Stream: ${stream.title}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);

    if (!stream.youtube_broadcast_id) {
      console.log('\n❌ No broadcast ID!');
      return;
    }

    // Get broadcast from YouTube
    console.log('\n🔍 Fetching from YouTube API...\n');
    const broadcast = await youtubeService.getBroadcast(
      stream.user_id,
      stream.youtube_broadcast_id
    );

    console.log('📡 YouTube Broadcast:');
    console.log(`   ID: ${broadcast.id}`);
    console.log(`   Title: ${broadcast.snippet.title}`);
    console.log(`   Life Cycle: ${broadcast.status.lifeCycleStatus}`);
    console.log(`   Privacy: ${broadcast.status.privacyStatus}`);
    console.log(`   Recording: ${broadcast.status.recordingStatus}`);

    if (broadcast.contentDetails.boundStreamId) {
      console.log(`\n📊 Stream Binding:`);
      console.log(`   Bound Stream ID: ${broadcast.contentDetails.boundStreamId}`);
      console.log(`   Monitor Stream: ${broadcast.contentDetails.enableMonitorStream}`);
      console.log(`   Auto Start: ${broadcast.contentDetails.enableAutoStart}`);
      
      // Get stream health
      const streamHealth = await youtubeService.getStreamHealth(
        stream.user_id,
        broadcast.contentDetails.boundStreamId
      );
      
      if (streamHealth) {
        console.log(`\n🏥 Stream Health:`);
        console.log(`   Status: ${streamHealth.status.streamStatus}`);
        console.log(`   Health: ${streamHealth.status.healthStatus?.status || 'N/A'}`);
      }
    } else {
      console.log(`\n❌ No stream bound to broadcast!`);
    }

    console.log(`\n💡 Diagnosis:`);
    if (broadcast.status.lifeCycleStatus === 'ready') {
      console.log(`   Broadcast is in "ready" state`);
      console.log(`   Can transition to: testing or live`);
    } else if (broadcast.status.lifeCycleStatus === 'testing') {
      console.log(`   Broadcast is in "testing" state`);
      console.log(`   Can transition to: live`);
    } else if (broadcast.status.lifeCycleStatus === 'live') {
      console.log(`   ✅ Broadcast is already LIVE!`);
    } else {
      console.log(`   Current state: ${broadcast.status.lifeCycleStatus}`);
    }

    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkBroadcastStatus();
