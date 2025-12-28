const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');

async function diagnose() {
  try {
    console.log('\n=== DIAGNOSING TRANSITION FAILURE ===\n');

    // Get the failed stream
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

    if (!stream || !stream.youtube_broadcast_id) {
      console.log('❌ No broadcast found');
      return;
    }

    console.log(`📺 Stream: ${stream.title}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id}\n`);

    // Get broadcast details
    const broadcast = await youtubeService.getBroadcast(
      stream.user_id,
      stream.youtube_broadcast_id
    );

    console.log('📡 BROADCAST STATUS:');
    console.log(`   Life Cycle: ${broadcast.status.lifeCycleStatus}`);
    console.log(`   Recording: ${broadcast.status.recordingStatus}`);
    console.log(`   Privacy: ${broadcast.status.privacyStatus}\n`);

    console.log('📊 CONTENT DETAILS:');
    console.log(`   Monitor Stream: ${broadcast.contentDetails.enableMonitorStream}`);
    console.log(`   Auto Start: ${broadcast.contentDetails.enableAutoStart}`);
    console.log(`   Auto Stop: ${broadcast.contentDetails.enableAutoStop}`);
    console.log(`   Bound Stream: ${broadcast.contentDetails.boundStreamId || 'NOT BOUND'}\n`);

    // Check if stream is bound
    if (!broadcast.contentDetails.boundStreamId) {
      console.log('🔴 ROOT CAUSE: Stream NOT bound to broadcast!');
      console.log('   This is why transition fails.');
      console.log('   Broadcast must be bound to a stream before transition.\n');
      return;
    }

    // Get stream health
    const streamHealth = await youtubeService.getStreamHealth(
      stream.user_id,
      broadcast.contentDetails.boundStreamId
    );

    console.log('🏥 STREAM HEALTH:');
    console.log(`   Stream Status: ${streamHealth.status.streamStatus}`);
    console.log(`   Health Status: ${streamHealth.status.healthStatus?.status || 'N/A'}\n`);

    // Analyze the issue
    console.log('🔍 ANALYSIS:\n');

    if (broadcast.status.lifeCycleStatus === 'complete') {
      console.log('🔴 Broadcast is COMPLETE - cannot transition');
      console.log('   Solution: Create new broadcast\n');
    } else if (broadcast.status.lifeCycleStatus === 'live') {
      console.log('✅ Broadcast is already LIVE!\n');
    } else if (streamHealth.status.streamStatus !== 'active') {
      console.log('🔴 Stream is NOT active');
      console.log(`   Current: ${streamHealth.status.streamStatus}`);
      console.log('   Solution: Wait for FFmpeg to send data\n');
    } else if (broadcast.contentDetails.enableMonitorStream) {
      console.log('🟡 Monitor Stream is ENABLED');
      console.log('   Must transition: ready → testing → live');
      console.log(`   Current state: ${broadcast.status.lifeCycleStatus}`);
      
      if (broadcast.status.lifeCycleStatus === 'ready') {
        console.log('   ✅ Can transition to testing now\n');
      } else if (broadcast.status.lifeCycleStatus === 'testing') {
        console.log('   ✅ Can transition to live now\n');
      }
    } else {
      console.log('🟢 All checks passed!');
      console.log(`   Current state: ${broadcast.status.lifeCycleStatus}`);
      console.log('   Stream is active and healthy');
      console.log('   Should be able to transition to live\n');
    }

    // Check valid transitions
    console.log('📋 VALID TRANSITIONS:');
    const state = broadcast.status.lifeCycleStatus;
    if (state === 'ready') {
      console.log('   ready → testing (if monitor enabled)');
      console.log('   ready → live (if monitor disabled)');
    } else if (state === 'testing') {
      console.log('   testing → live');
    } else if (state === 'live') {
      console.log('   live → complete');
    } else {
      console.log(`   ${state} → (check YouTube docs)`);
    }

    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response?.data) {
      console.error('\nAPI Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

diagnose();
