/**
 * Test Script untuk Manual Stream Key Implementation
 * 
 * Script ini akan test:
 * 1. findBroadcastByStreamKey function
 * 2. findStreamIdByStreamKey function  
 * 3. scheduleLive dengan manual stream key
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function testManualStreamKey() {
  console.log('🧪 Testing Manual Stream Key Implementation...\n');
  
  // Test user ID (admin user)
  const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
  
  try {
    // Step 1: Get user tokens
    console.log('1️⃣ Getting user tokens...');
    const tokens = await getTokensForUser(userId);
    
    if (!tokens) {
      console.error('❌ Failed to get tokens for user');
      return;
    }
    console.log('✅ Tokens retrieved successfully');
    
    // Step 2: List existing streams to get a valid stream key
    console.log('\n2️⃣ Listing existing streams...');
    const streams = await youtubeService.listStreams(tokens, { maxResults: 10 });
    
    if (!streams || streams.length === 0) {
      console.log('⚠️ No streams found in channel');
      return;
    }
    
    console.log(`✅ Found ${streams.length} streams`);
    
    // Find a stream with valid stream key
    let testStreamKey = null;
    let testStreamId = null;
    
    for (const stream of streams) {
      const streamKey = stream.cdn?.ingestionInfo?.streamName;
      if (streamKey) {
        testStreamKey = streamKey;
        testStreamId = stream.id;
        console.log(`✅ Using test stream key: ${streamKey.substring(0, 8)}... (Stream ID: ${testStreamId})`);
        break;
      }
    }
    
    if (!testStreamKey) {
      console.log('⚠️ No valid stream key found in existing streams');
      return;
    }
    
    // Step 3: Test findStreamIdByStreamKey
    console.log('\n3️⃣ Testing findStreamIdByStreamKey...');
    const foundStreamId = await youtubeService.findStreamIdByStreamKey(tokens, { 
      streamKey: testStreamKey 
    });
    
    if (foundStreamId === testStreamId) {
      console.log('✅ findStreamIdByStreamKey works correctly');
    } else {
      console.log(`❌ findStreamIdByStreamKey failed. Expected: ${testStreamId}, Got: ${foundStreamId}`);
    }
    
    // Step 4: Test findBroadcastByStreamKey
    console.log('\n4️⃣ Testing findBroadcastByStreamKey...');
    const broadcastInfo = await youtubeService.findBroadcastByStreamKey(tokens, { 
      streamKey: testStreamKey 
    });
    
    if (broadcastInfo) {
      console.log('✅ findBroadcastByStreamKey found existing broadcast:');
      console.log(`   - Broadcast ID: ${broadcastInfo.broadcast.id}`);
      console.log(`   - Title: ${broadcastInfo.broadcast.snippet?.title}`);
      console.log(`   - Status: ${broadcastInfo.broadcast.status?.lifeCycleStatus}`);
    } else {
      console.log('⚠️ No broadcast found bound to this stream key (this is normal if no broadcast is bound)');
    }
    
    // Step 5: Test scheduleLive with manual stream key
    console.log('\n5️⃣ Testing scheduleLive with manual stream key...');
    
    try {
      const result = await youtubeService.scheduleLive(tokens, {
        title: 'Test Manual Stream Key',
        description: 'Testing manual stream key implementation',
        privacyStatus: 'private',
        scheduledStartTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
        streamKey: testStreamKey, // Manual stream key
        enableAutoStart: false,
        enableAutoStop: false
      });
      
      if (result.reusedExisting) {
        console.log('✅ scheduleLive correctly reused existing broadcast:');
        console.log(`   - Broadcast ID: ${result.broadcast.id}`);
        console.log(`   - Reused: ${result.reusedExisting}`);
      } else {
        console.log('✅ scheduleLive created new broadcast (expected if no existing broadcast bound):');
        console.log(`   - Broadcast ID: ${result.broadcast.id}`);
        console.log(`   - New Stream Created: ${result.stream ? 'Yes' : 'No'}`);
      }
      
    } catch (error) {
      if (error.message.includes('Stream key not found')) {
        console.log('✅ scheduleLive correctly threw error for invalid stream key');
      } else {
        console.log(`❌ scheduleLive failed with unexpected error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Manual Stream Key Test Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testManualStreamKey();
}

module.exports = { testManualStreamKey };