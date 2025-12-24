/**
 * Debug Tags Issue - Cek langsung ke YouTube API
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function debugTags() {
  console.log('🔍 DEBUG: Tags Issue Investigation...\n');
  
  const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
  
  try {
    console.log('1️⃣ Getting tokens...');
    const tokens = await getTokensForUser(userId);
    if (!tokens) {
      console.error('❌ No tokens');
      return;
    }
    
    console.log('2️⃣ Creating broadcast with tags...');
    const result = await youtubeService.scheduleLive(tokens, {
      title: 'Tags Debug Test',
      description: 'Testing tags specifically',
      privacyStatus: 'private',
      scheduledStartTime: new Date(Date.now() + 300000).toISOString(),
      tags: ['debug', 'tags', 'test', 'youtube', 'api']
    });
    
    const broadcastId = result.broadcast.id;
    console.log(`✅ Broadcast created: ${broadcastId}`);
    
    // Wait 2 seconds for YouTube API to process
    console.log('3️⃣ Waiting 2 seconds for YouTube API to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('4️⃣ Checking broadcast details directly...');
    const broadcast = await youtubeService.getBroadcast(tokens, { broadcastId });
    
    console.log('\n📊 DIRECT BROADCAST CHECK:');
    console.log('========================================');
    console.log('Broadcast ID:', broadcast?.id);
    console.log('Title:', broadcast?.snippet?.title);
    console.log('Tags:', broadcast?.snippet?.tags);
    console.log('Tags Count:', broadcast?.snippet?.tags?.length || 0);
    console.log('Tags Array:', JSON.stringify(broadcast?.snippet?.tags || []));
    
    // Also check via YouTube API directly
    console.log('\n5️⃣ Double-checking with fresh API call...');
    const { getYouTubeClient } = require('./config/google');
    const yt = getYouTubeClient(tokens);
    
    const freshCheck = await yt.liveBroadcasts.list({
      part: 'snippet',
      id: broadcastId
    });
    
    const freshBroadcast = freshCheck.data.items?.[0];
    console.log('\n📊 FRESH API CHECK:');
    console.log('========================================');
    console.log('Fresh Tags:', freshBroadcast?.snippet?.tags);
    console.log('Fresh Tags Count:', freshBroadcast?.snippet?.tags?.length || 0);
    console.log('Fresh Tags Array:', JSON.stringify(freshBroadcast?.snippet?.tags || []));
    
    // Final verdict
    const finalTagsCount = freshBroadcast?.snippet?.tags?.length || 0;
    if (finalTagsCount > 0) {
      console.log('\n🎉 ✅ TAGS WORKING! Issue was timing/caching.');
      console.log(`✅ Successfully applied ${finalTagsCount} tags to broadcast`);
    } else {
      console.log('\n❌ TAGS STILL NOT WORKING');
      console.log('Need to investigate YouTube API requirements further');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  debugTags();
}

module.exports = { debugTags };