const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');

async function checkBroadcastStatus() {
  
  try {
    console.log('\n=== CHECKING BROADCAST TRANSITION STATUS ===\n');

    // Get the multi-test stream
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

    if (!stream) {
      console.log('❌ Stream not found');
      return;
    }

    console.log(`📺 Stream: ${stream.title}`);
    console.log(`   ID: ${stream.id}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id}`);
    console.log(`   Start Time: ${stream.start_time}`);
    console.log(`   Scheduled End: ${stream.scheduled_end_time}`);

    if (!stream.youtube_broadcast_id) {
      console.log('\n❌ No broadcast ID found');
      return;
    }

    // Get broadcast details from YouTube API
    console.log('\n🔍 Fetching broadcast details from YouTube API...\n');
    
    const broadcast = await youtubeService.getBroadcast(
      stream.user_id,
      stream.youtube_broadcast_id
    );

    console.log('📡 YouTube Broadcast Status:');
    console.log(`   ID: ${broadcast.id}`);
    console.log(`   Title: ${broadcast.snippet.title}`);
    console.log(`   Status: ${broadcast.status.lifeCycleStatus}`);
    console.log(`   Privacy: ${broadcast.status.privacyStatus}`);
    console.log(`   Recording: ${broadcast.status.recordingStatus}`);
    
    if (broadcast.contentDetails) {
      console.log('\n📊 Content Details:');
      console.log(`   Monitor Stream: ${broadcast.contentDetails.enableMonitorStream}`);
      console.log(`   Enable DVR: ${broadcast.contentDetails.enableDvr}`);
      console.log(`   Enable Auto Start: ${broadcast.contentDetails.enableAutoStart}`);
      console.log(`   Enable Auto Stop: ${broadcast.contentDetails.enableAutoStop}`);
      
      if (broadcast.contentDetails.boundStreamId) {
        console.log(`   Bound Stream ID: ${broadcast.contentDetails.boundStreamId}`);
        
        // Get stream health
        console.log('\n🏥 Checking stream health...');
        const streamHealth = await youtubeService.getStreamHealth(
          stream.user_id,
          broadcast.contentDetails.boundStreamId
        );
        
        if (streamHealth) {
          console.log(`   Stream Status: ${streamHealth.status.streamStatus}`);
          console.log(`   Health Status: ${streamHealth.status.healthStatus?.status || 'N/A'}`);
        }
      }
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
