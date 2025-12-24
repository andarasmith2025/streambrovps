/**
 * Test Monetization Live Stream
 * 
 * Script untuk test apakah monetization setting dari YouTube Studio
 * benar-benar berlaku untuk stream yang dibuat via YouTube API
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function testMonetizationLive() {
  console.log('💰 MONETIZATION LIVE TEST');
  console.log('========================================');
  console.log('🎯 Tujuan: Verifikasi monetization setting YouTube Studio berlaku untuk YouTube API');
  console.log('⏱️ Durasi: 10 menit test stream');
  console.log('📊 Yang akan dicek: Monetization status di broadcast yang dibuat\n');
  
  // Test user ID (ganti dengan user ID yang sudah setup YouTube OAuth)
  const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
  
  try {
    // Step 1: Get tokens
    console.log('1️⃣ Getting YouTube tokens...');
    const tokens = await getTokensForUser(userId);
    
    if (!tokens || !tokens.access_token) {
      console.error('❌ No valid YouTube tokens found');
      console.log('💡 Please configure YouTube OAuth first in user settings');
      return;
    }
    
    console.log('✅ Tokens retrieved successfully');
    
    // Step 2: Create test broadcast
    console.log('\n2️⃣ Creating test broadcast...');
    
    const testTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const testParams = {
      title: 'Monetization Test Stream - 10 Minutes',
      description: 'Testing monetization settings from YouTube Studio via API. Duration: 10 minutes.',
      privacyStatus: 'unlisted', // Unlisted untuk test
      scheduledStartTime: testTime.toISOString().replace('Z', ''), // Fixed timezone
      enableAutoStart: true,
      enableAutoStop: false, // Manual stop setelah 10 menit
      tags: ['monetization', 'test', 'youtube-api', 'streambro']
    };
    
    console.log('📋 Test Parameters:');
    console.log(`   Title: ${testParams.title}`);
    console.log(`   Privacy: ${testParams.privacyStatus}`);
    console.log(`   Scheduled: ${testTime.toLocaleString()}`);
    console.log(`   Auto Start: ${testParams.enableAutoStart}`);
    console.log(`   Tags: ${testParams.tags.join(', ')}`);
    
    const result = await youtubeService.scheduleLive(tokens, testParams);
    
    if (!result || !result.broadcast) {
      console.error('❌ Failed to create broadcast');
      return;
    }
    
    const broadcastId = result.broadcast.id;
    const streamKey = result.stream?.cdn?.ingestionInfo?.streamName;
    const rtmpUrl = result.stream?.cdn?.ingestionInfo?.ingestionAddress;
    
    console.log('\n✅ Broadcast created successfully!');
    console.log(`📺 Broadcast ID: ${broadcastId}`);
    console.log(`🔑 Stream Key: ${streamKey ? streamKey.substring(0, 8) + '...' : 'N/A'}`);
    console.log(`📡 RTMP URL: ${rtmpUrl || 'N/A'}`);
    
    // Step 3: Check initial monetization status
    console.log('\n3️⃣ Checking initial monetization status...');
    await checkMonetizationStatus(tokens, broadcastId, 'INITIAL');
    
    // Step 4: Instructions for manual streaming
    console.log('\n4️⃣ MANUAL STREAMING INSTRUCTIONS:');
    console.log('========================================');
    console.log('🎬 Untuk test monetization, lakukan streaming manual:');
    console.log('');
    console.log('📱 Option 1 - OBS/Streaming Software:');
    if (rtmpUrl && streamKey) {
      console.log(`   RTMP URL: ${rtmpUrl}`);
      console.log(`   Stream Key: ${streamKey}`);
    } else {
      console.log('   ⚠️ RTMP info tidak tersedia, gunakan YouTube Studio');
    }
    console.log('');
    console.log('🌐 Option 2 - YouTube Studio:');
    console.log(`   1. Buka: https://studio.youtube.com/channel/UC.../livestreaming`);
    console.log(`   2. Cari broadcast: "${testParams.title}"`);
    console.log(`   3. Klik "GO LIVE" atau "START STREAMING"`);
    console.log(`   4. Stream selama 10 menit`);
    console.log('');
    console.log('⏱️ TIMELINE TEST:');
    console.log(`   ${new Date(Date.now() + 2 * 60 * 1000).toLocaleTimeString()} - Start streaming`);
    console.log(`   ${new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()} - Check monetization (3 menit streaming)`);
    console.log(`   ${new Date(Date.now() + 8 * 60 * 1000).toLocaleTimeString()} - Check ads appearance`);
    console.log(`   ${new Date(Date.now() + 12 * 60 * 1000).toLocaleTimeString()} - Stop streaming & final check`);
    
    // Step 5: Monitoring loop
    console.log('\n5️⃣ Starting monitoring loop...');
    console.log('🔄 Will check broadcast status every 2 minutes');
    console.log('⏹️ Press Ctrl+C to stop monitoring\n');
    
    let checkCount = 0;
    const monitoringInterval = setInterval(async () => {
      checkCount++;
      const timeElapsed = checkCount * 2;
      
      console.log(`\n📊 CHECK #${checkCount} (${timeElapsed} minutes elapsed)`);
      console.log('========================================');
      
      try {
        await checkBroadcastStatus(tokens, broadcastId, checkCount);
        await checkMonetizationStatus(tokens, broadcastId, `CHECK_${checkCount}`);
        
        // Stop monitoring after 15 minutes (7-8 checks)
        if (checkCount >= 8) {
          console.log('\n🏁 MONITORING COMPLETE');
          console.log('========================================');
          console.log('✅ Test selesai setelah ~15 menit monitoring');
          console.log('📋 Silakan review hasil monetization di atas');
          console.log('🎬 Jangan lupa stop streaming di YouTube Studio jika masih live');
          clearInterval(monitoringInterval);
        }
        
      } catch (error) {
        console.error(`❌ Error in check #${checkCount}:`, error.message);
      }
      
    }, 2 * 60 * 1000); // Every 2 minutes
    
    // Step 6: Final instructions
    console.log('📝 WHAT TO LOOK FOR:');
    console.log('========================================');
    console.log('✅ Monetization Status: Should be "enabled" or show monetization details');
    console.log('✅ Ad Insertion: Look for ads during stream (every ~5-10 minutes)');
    console.log('✅ Revenue Tracking: Check YouTube Analytics after stream');
    console.log('✅ Broadcast Lifecycle: ready → testing → live → complete');
    console.log('');
    console.log('❌ TROUBLESHOOTING:');
    console.log('   - No monetization: Channel might not be eligible');
    console.log('   - No ads: Content might not be advertiser-friendly');
    console.log('   - API errors: Token might be expired');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function checkBroadcastStatus(tokens, broadcastId, checkNumber) {
  try {
    const broadcast = await youtubeService.getBroadcast(tokens, { broadcastId });
    
    if (!broadcast) {
      console.log('❌ Broadcast not found');
      return;
    }
    
    const lifeCycleStatus = broadcast.status?.lifeCycleStatus;
    const privacyStatus = broadcast.status?.privacyStatus;
    const title = broadcast.snippet?.title;
    const scheduledStart = broadcast.snippet?.scheduledStartTime;
    const actualStart = broadcast.snippet?.actualStartTime;
    
    console.log(`📺 Broadcast Status (Check #${checkNumber}):`);
    console.log(`   Title: ${title}`);
    console.log(`   Lifecycle: ${lifeCycleStatus}`);
    console.log(`   Privacy: ${privacyStatus}`);
    console.log(`   Scheduled: ${scheduledStart ? new Date(scheduledStart).toLocaleString() : 'N/A'}`);
    console.log(`   Actual Start: ${actualStart ? new Date(actualStart).toLocaleString() : 'Not started'}`);
    
    // Status interpretation
    const statusMessages = {
      'ready': '🟡 Ready to stream (waiting for stream data)',
      'testing': '🟠 Testing (stream data received, not live yet)',
      'live': '🔴 LIVE (visible to viewers)',
      'complete': '🟢 Complete (stream ended)',
      'revoked': '❌ Revoked (cancelled)'
    };
    
    console.log(`   Status Meaning: ${statusMessages[lifeCycleStatus] || '❓ Unknown status'}`);
    
  } catch (error) {
    console.error('❌ Error checking broadcast status:', error.message);
  }
}

async function checkMonetizationStatus(tokens, broadcastId, phase) {
  try {
    console.log(`💰 Monetization Check (${phase}):`);
    
    // Get broadcast with monetization details
    const { getYouTubeClient } = require('./config/google');
    const yt = getYouTubeClient(tokens);
    
    const response = await yt.liveBroadcasts.list({
      part: 'id,snippet,status,contentDetails,monetizationDetails',
      id: broadcastId
    });
    
    const broadcast = response.data.items?.[0];
    
    if (!broadcast) {
      console.log('   ❌ Broadcast not found for monetization check');
      return;
    }
    
    // Check monetization details
    const monetization = broadcast.monetizationDetails;
    
    if (monetization) {
      console.log('   ✅ MONETIZATION DETECTED!');
      console.log(`   💰 Monetization Details:`);
      
      if (monetization.cuepointSchedule) {
        const schedule = monetization.cuepointSchedule;
        console.log(`      Enabled: ${schedule.enabled}`);
        console.log(`      Type: ${schedule.type}`);
        console.log(`      Interval: ${schedule.repeatIntervalSecs ? schedule.repeatIntervalSecs / 60 + ' minutes' : 'N/A'}`);
        console.log(`      Pause Until: ${schedule.pauseAdsUntil || 'No pause'}`);
      }
      
      console.log('   🎉 SUCCESS: YouTube Studio settings applied to API broadcast!');
      
    } else {
      console.log('   ⚠️ No monetization details found');
      console.log('   💡 Possible reasons:');
      console.log('      - Channel not eligible for monetization');
      console.log('      - YouTube Studio settings not applied yet');
      console.log('      - API doesn\'t return monetization for this broadcast type');
    }
    
    // Additional checks
    console.log(`   📊 Additional Info:`);
    console.log(`      Broadcast ID: ${broadcast.id}`);
    console.log(`      Privacy: ${broadcast.status?.privacyStatus}`);
    console.log(`      Lifecycle: ${broadcast.status?.lifeCycleStatus}`);
    
  } catch (error) {
    console.error('   ❌ Error checking monetization:', error.message);
    
    if (error.message.includes('monetizationDetails')) {
      console.log('   💡 API might not have access to monetization details');
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted by user');
  console.log('📋 SUMMARY:');
  console.log('   - Check YouTube Studio for any active broadcasts');
  console.log('   - Stop streaming if still active');
  console.log('   - Review monetization results above');
  process.exit(0);
});

// Run test if called directly
if (require.main === module) {
  testMonetizationLive().catch(console.error);
}

module.exports = { testMonetizationLive };