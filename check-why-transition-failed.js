const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');

async function checkWhyTransitionFailed() {
  try {
    console.log('\n=== ANALYZING WHY TRANSITION FAILED ===\n');

    const stream = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM streams WHERE title LIKE ?',
        ['%jadwal multi baru%'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!stream || !stream.youtube_broadcast_id) {
      console.log('❌ No broadcast found');
      return;
    }

    console.log(`📺 Stream: ${stream.title}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id}`);
    console.log(`   DB Status: ${stream.status}`);
    console.log(`   Start Time: ${stream.start_time}`);
    console.log(`   Running for: ${Math.floor((Date.now() - new Date(stream.start_time)) / 1000 / 60)} minutes\n`);

    // Get broadcast from YouTube API
    console.log('🔍 Fetching broadcast from YouTube API...\n');
    const broadcast = await youtubeService.getBroadcast(
      stream.user_id,
      stream.youtube_broadcast_id
    );

    console.log('📡 YouTube Broadcast Status:');
    console.log(`   Life Cycle: ${broadcast.status.lifeCycleStatus}`);
    console.log(`   Privacy: ${broadcast.status.privacyStatus}`);
    console.log(`   Recording: ${broadcast.status.recordingStatus}`);

    if (broadcast.status.lifeCycleStatus !== 'live') {
      console.log('\n❌ PROBLEM: Broadcast is NOT live on YouTube!');
      console.log(`   Current status: ${broadcast.status.lifeCycleStatus}`);
      console.log('   Expected: live');
    }

    // Check if stream is bound
    if (!broadcast.contentDetails.boundStreamId) {
      console.log('\n❌ CRITICAL: No stream bound to broadcast!');
      console.log('   This means FFmpeg never connected or binding failed.');
      return;
    }

    console.log(`\n✅ Stream bound: ${broadcast.contentDetails.boundStreamId}`);

    // Get stream health
    console.log('\n🏥 Checking stream health...');
    const streamHealth = await youtubeService.getStreamHealth(
      stream.user_id,
      broadcast.contentDetails.boundStreamId
    );

    if (streamHealth) {
      console.log(`   Stream Status: ${streamHealth.status.streamStatus}`);
      console.log(`   Health Status: ${streamHealth.status.healthStatus?.status || 'N/A'}`);

      if (streamHealth.status.streamStatus !== 'active') {
        console.log('\n❌ PROBLEM: Stream is NOT active!');
        console.log(`   Current: ${streamHealth.status.streamStatus}`);
        console.log('   YouTube won\'t allow transition if stream is inactive.');
      } else {
        console.log('\n✅ Stream is active');
      }

      if (streamHealth.status.healthStatus) {
        if (streamHealth.status.healthStatus.status !== 'good') {
          console.log(`\n⚠️  WARNING: Stream health is ${streamHealth.status.healthStatus.status}`);
          console.log('   This might prevent transition.');
        } else {
          console.log('✅ Stream health is good');
        }
      }
    }

    // Check content details
    console.log('\n📊 Broadcast Settings:');
    console.log(`   Monitor Stream: ${broadcast.contentDetails.enableMonitorStream}`);
    console.log(`   Auto Start: ${broadcast.contentDetails.enableAutoStart}`);
    console.log(`   Auto Stop: ${broadcast.contentDetails.enableAutoStop}`);

    if (broadcast.contentDetails.enableMonitorStream) {
      console.log('\n⚠️  WARNING: Monitor Stream is ENABLED');
      console.log('   This requires testing→live flow (can\'t go direct to live)');
      console.log('   Current lifecycle: ' + broadcast.status.lifeCycleStatus);
      
      if (broadcast.status.lifeCycleStatus === 'ready') {
        console.log('\n💡 SOLUTION: Broadcast is stuck in "ready" state');
        console.log('   Need to transition: ready → testing → live');
      }
    }

    console.log('\n=== DIAGNOSIS ===\n');
    
    if (broadcast.status.lifeCycleStatus === 'ready' && broadcast.contentDetails.enableMonitorStream) {
      console.log('🔴 ROOT CAUSE: Monitor Stream enabled + stuck in "ready" state');
      console.log('   Fix: Set enableMonitorStream: false in youtubeService.js');
    } else if (streamHealth && streamHealth.status.streamStatus !== 'active') {
      console.log('🔴 ROOT CAUSE: Stream not active yet');
      console.log('   Fix: Wait longer for FFmpeg to stabilize');
    } else if (!broadcast.contentDetails.boundStreamId) {
      console.log('🔴 ROOT CAUSE: Stream not bound to broadcast');
      console.log('   Fix: Check FFmpeg connection and stream key');
    } else {
      console.log('🟡 UNKNOWN: All checks passed but transition still failed');
      console.log('   Check PM2 logs for transition error messages');
    }

    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkWhyTransitionFailed();
