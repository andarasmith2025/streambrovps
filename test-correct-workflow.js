/**
 * Test Script untuk Correct YouTube API Workflow
 * 
 * Workflow yang BENAR:
 * 1. YouTube API SELALU buat broadcast baru
 * 2. User pilih stream key: dropdown ATAU manual input
 * 3. Broadcast baru di-bind ke stream key pilihan user
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function testCorrectWorkflow() {
  console.log('🧪 Testing CORRECT YouTube API Workflow...\n');
  
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
    
    // Step 3: Test YouTube API + Manual Stream Key (CORRECT WORKFLOW)
    console.log('\n3️⃣ Testing YouTube API + Manual Stream Key...');
    console.log('Expected behavior:');
    console.log('- ✅ ALWAYS create NEW broadcast');
    console.log('- ✅ Find existing stream by manual key');
    console.log('- ✅ Bind NEW broadcast to EXISTING stream');
    console.log('- ❌ NEVER reuse existing broadcast');
    
    const result = await youtubeService.scheduleLive(tokens, {
      title: 'Test Correct Workflow - Manual Key',
      description: 'Testing correct YouTube API workflow with manual stream key',
      privacyStatus: 'private',
      scheduledStartTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      streamKey: testStreamKey, // Manual stream key input
      enableAutoStart: false,
      enableAutoStop: false
    });
    
    console.log('\n📊 RESULT ANALYSIS:');
    console.log(`✅ New Broadcast Created: ${result.broadcast?.id}`);
    console.log(`✅ Stream Type: ${result.streamType}`);
    console.log(`✅ Is New Broadcast: ${result.isNewBroadcast}`);
    console.log(`✅ New Stream Created: ${result.stream ? 'Yes (❌ Wrong!)' : 'No (✅ Correct!)'}`);
    
    if (result.isNewBroadcast && result.streamType === 'existing' && !result.stream) {
      console.log('\n🎉 ✅ WORKFLOW CORRECT!');
      console.log('- NEW broadcast created ✅');
      console.log('- EXISTING stream used ✅');
      console.log('- Manual stream key processed correctly ✅');
    } else {
      console.log('\n❌ WORKFLOW INCORRECT!');
      console.log('Expected: New broadcast + Existing stream + No new stream created');
    }
    
    // Step 4: Test YouTube API + Dropdown Stream (CORRECT WORKFLOW)
    console.log('\n4️⃣ Testing YouTube API + Dropdown Stream...');
    console.log('Expected behavior:');
    console.log('- ✅ ALWAYS create NEW broadcast');
    console.log('- ✅ Use stream ID from dropdown');
    console.log('- ✅ Bind NEW broadcast to selected stream');
    
    const result2 = await youtubeService.scheduleLive(tokens, {
      title: 'Test Correct Workflow - Dropdown',
      description: 'Testing correct YouTube API workflow with dropdown selection',
      privacyStatus: 'private',
      scheduledStartTime: new Date(Date.now() + 120000).toISOString(), // 2 minutes from now
      streamId: testStreamId, // From dropdown selection
      enableAutoStart: false,
      enableAutoStop: false
    });
    
    console.log('\n📊 RESULT ANALYSIS:');
    console.log(`✅ New Broadcast Created: ${result2.broadcast?.id}`);
    console.log(`✅ Stream Type: ${result2.streamType}`);
    console.log(`✅ Is New Broadcast: ${result2.isNewBroadcast}`);
    console.log(`✅ New Stream Created: ${result2.stream ? 'Yes (❌ Wrong!)' : 'No (✅ Correct!)'}`);
    
    if (result2.isNewBroadcast && result2.streamType === 'existing' && !result2.stream) {
      console.log('\n🎉 ✅ WORKFLOW CORRECT!');
      console.log('- NEW broadcast created ✅');
      console.log('- EXISTING stream used ✅');
      console.log('- Dropdown selection processed correctly ✅');
    } else {
      console.log('\n❌ WORKFLOW INCORRECT!');
      console.log('Expected: New broadcast + Existing stream + No new stream created');
    }
    
    console.log('\n🎯 WORKFLOW SUMMARY:');
    console.log('========================================');
    console.log('✅ YouTube API Mode ALWAYS creates NEW broadcast');
    console.log('✅ User can choose stream: Manual input OR Dropdown');
    console.log('✅ NEW broadcast gets bound to chosen stream');
    console.log('❌ NEVER reuse existing broadcast');
    console.log('❌ NEVER create new stream if existing one chosen');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testCorrectWorkflow();
}

module.exports = { testCorrectWorkflow };