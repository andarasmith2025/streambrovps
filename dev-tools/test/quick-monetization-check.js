/**
 * Quick Monetization Check
 * 
 * Script sederhana untuk cek apakah broadcast yang sudah ada
 * memiliki monetization enabled atau tidak
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function quickMonetizationCheck(broadcastId = null) {
  console.log('🔍 QUICK MONETIZATION CHECK');
  console.log('========================================\n');
  
  const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
  
  try {
    // Get tokens
    console.log('1️⃣ Getting tokens...');
    const tokens = await getTokensForUser(userId);
    
    if (!tokens) {
      console.error('❌ No tokens found');
      return;
    }
    
    console.log('✅ Tokens OK');
    
    if (broadcastId) {
      // Check specific broadcast
      console.log(`\n2️⃣ Checking specific broadcast: ${broadcastId}`);
      await checkSpecificBroadcast(tokens, broadcastId);
    } else {
      // List recent broadcasts and check monetization
      console.log('\n2️⃣ Checking recent broadcasts...');
      await checkRecentBroadcasts(tokens);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkSpecificBroadcast(tokens, broadcastId) {
  try {
    const { getYouTubeClient } = require('./config/google');
    const yt = getYouTubeClient(tokens);
    
    const response = await yt.liveBroadcasts.list({
      part: 'id,snippet,status,contentDetails,monetizationDetails',
      id: broadcastId
    });
    
    const broadcast = response.data.items?.[0];
    
    if (!broadcast) {
      console.log('❌ Broadcast not found');
      return;
    }
    
    console.log('📺 BROADCAST INFO:');
    console.log(`   ID: ${broadcast.id}`);
    console.log(`   Title: ${broadcast.snippet?.title}`);
    console.log(`   Status: ${broadcast.status?.lifeCycleStatus}`);
    console.log(`   Privacy: ${broadcast.status?.privacyStatus}`);
    
    // Check monetization
    console.log('\n💰 MONETIZATION STATUS:');
    if (broadcast.monetizationDetails) {
      console.log('   ✅ MONETIZATION ENABLED!');
      
      const monetization = broadcast.monetizationDetails;
      if (monetization.cuepointSchedule) {
        const schedule = monetization.cuepointSchedule;
        console.log(`   📊 Details:`);
        console.log(`      Enabled: ${schedule.enabled}`);
        console.log(`      Type: ${schedule.type || 'N/A'}`);
        console.log(`      Interval: ${schedule.repeatIntervalSecs ? (schedule.repeatIntervalSecs / 60) + ' minutes' : 'N/A'}`);
      }
      
      console.log('\n🎉 RESULT: YouTube Studio monetization settings BERHASIL diterapkan!');
      
    } else {
      console.log('   ❌ NO MONETIZATION DETAILS');
      console.log('   💡 Kemungkinan:');
      console.log('      - Channel belum eligible');
      console.log('      - Setting YouTube Studio belum aktif');
      console.log('      - Broadcast type tidak support monetization');
    }
    
  } catch (error) {
    console.error('❌ Error checking broadcast:', error.message);
  }
}

async function checkRecentBroadcasts(tokens) {
  try {
    console.log('📋 Getting recent broadcasts...');
    
    const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 10 });
    
    if (!broadcasts || broadcasts.length === 0) {
      console.log('❌ No broadcasts found');
      return;
    }
    
    console.log(`✅ Found ${broadcasts.length} recent broadcasts\n`);
    
    // Check each broadcast for monetization
    for (let i = 0; i < Math.min(broadcasts.length, 5); i++) {
      const broadcast = broadcasts[i];
      
      console.log(`📺 BROADCAST ${i + 1}:`);
      console.log(`   ID: ${broadcast.id}`);
      console.log(`   Title: ${broadcast.snippet?.title}`);
      console.log(`   Status: ${broadcast.status?.lifeCycleStatus}`);
      console.log(`   Created: ${broadcast.snippet?.publishedAt ? new Date(broadcast.snippet.publishedAt).toLocaleString() : 'N/A'}`);
      
      // Quick monetization check
      await checkSpecificBroadcast(tokens, broadcast.id);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking recent broadcasts:', error.message);
  }
}

// Command line usage
const args = process.argv.slice(2);
const broadcastId = args[0];

if (broadcastId) {
  console.log(`🎯 Checking specific broadcast: ${broadcastId}\n`);
  quickMonetizationCheck(broadcastId);
} else {
  console.log('🔍 Checking recent broadcasts...\n');
  console.log('💡 Usage: node quick-monetization-check.js [broadcastId]');
  console.log('   Without broadcastId: checks recent broadcasts');
  console.log('   With broadcastId: checks specific broadcast\n');
  quickMonetizationCheck();
}

module.exports = { quickMonetizationCheck };