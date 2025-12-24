/**
 * Test Script untuk Fix Timezone dan Tags Issue
 * 
 * Test ini akan:
 * 1. Test timezone fix (tanpa "Z" suffix)
 * 2. Test tags update terpisah untuk reliability
 * 3. Verify semua parameter yang ada di form
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function testTimezoneAndTagsFix() {
  console.log('🔧 Testing Timezone and Tags Fix...\n');
  
  // Test user ID (admin user)
  const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
  
  try {
    // Step 1: Get user tokens
    console.log('1️⃣ Getting user tokens...');
    const tokens = await getTokensForUser(userId);
    
    if (!tokens) {
      console.log('❌ No tokens found. User needs to configure YouTube OAuth first.');
      console.log('📋 To test the fixes:');
      console.log('   1. Go to user settings and configure YouTube OAuth');
      console.log('   2. Or test with a user that has YouTube credentials');
      console.log('\n🔧 FIXES IMPLEMENTED:');
      console.log('   ✅ Timezone Fix: Removed "Z" suffix from scheduledStartTime');
      console.log('   ✅ Tags Fix: Added separate tags update after broadcast creation');
      console.log('   ✅ Enhanced logging for better debugging');
      return;
    }
    
    console.log('✅ Tokens retrieved successfully');
    
    // Step 2: Test timezone fix
    console.log('\n2️⃣ Testing timezone fix...');
    
    // Create scheduledStartTime without "Z" suffix (like the fix in app.js)
    const scheduledStartTime = new Date(Date.now() + 300000).toISOString().replace('Z', '');
    console.log(`📅 Scheduled time (without Z): ${scheduledStartTime}`);
    console.log(`📅 Original would be: ${new Date(Date.now() + 300000).toISOString()}`);
    
    // Step 3: Test with comprehensive parameters
    console.log('\n3️⃣ Testing broadcast creation with all fixes...');
    
    const testParams = {
      title: 'Timezone & Tags Fix Test',
      description: 'Testing timezone fix (no Z suffix) and separate tags update for better reliability',
      privacyStatus: 'private',
      scheduledStartTime: scheduledStartTime, // ✅ Fixed: No "Z" suffix
      enableAutoStart: true,
      enableAutoStop: true,
      tags: ['timezone-fix', 'tags-fix', 'youtube-api', 'test', 'reliability'], // ✅ Fixed: Separate update
      thumbnailPath: null
    };
    
    console.log('📋 Test parameters:');
    console.log(`   ✅ Title: ${testParams.title}`);
    console.log(`   ✅ Description: ${testParams.description.substring(0, 50)}...`);
    console.log(`   ✅ Privacy: ${testParams.privacyStatus}`);
    console.log(`   ✅ Scheduled Time: ${testParams.scheduledStartTime} (no Z suffix)`);
    console.log(`   ✅ Auto Start: ${testParams.enableAutoStart}`);
    console.log(`   ✅ Auto Stop: ${testParams.enableAutoStop}`);
    console.log(`   ✅ Tags: ${testParams.tags.length} tags`);
    
    const result = await youtubeService.scheduleLive(tokens, testParams);
    
    console.log('\n📊 BROADCAST CREATION RESULT:');
    console.log(`✅ Broadcast ID: ${result.broadcast?.id}`);
    console.log(`✅ Title: ${result.broadcast?.snippet?.title}`);
    console.log(`✅ Privacy: ${result.broadcast?.status?.privacyStatus}`);
    console.log(`✅ Auto Start: ${result.broadcast?.contentDetails?.enableAutoStart}`);
    console.log(`✅ Auto Stop: ${result.broadcast?.contentDetails?.enableAutoStop}`);
    console.log(`✅ Tags (initial): ${result.broadcast?.snippet?.tags?.length || 0} tags`);
    
    // Step 4: Wait and verify tags were applied
    console.log('\n4️⃣ Waiting 3 seconds then verifying tags...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const broadcastDetails = await youtubeService.getBroadcast(tokens, { 
      broadcastId: result.broadcast.id 
    });
    
    console.log('\n🔍 FINAL VERIFICATION:');
    console.log('========================================');
    
    const finalTagsCount = broadcastDetails?.snippet?.tags?.length || 0;
    const finalTags = broadcastDetails?.snippet?.tags || [];
    
    console.log(`📅 Scheduled Time: ${broadcastDetails?.snippet?.scheduledStartTime}`);
    console.log(`🏷️ Final Tags Count: ${finalTagsCount}`);
    console.log(`🏷️ Final Tags: ${JSON.stringify(finalTags)}`);
    
    // Check fixes
    const timezoneFix = !broadcastDetails?.snippet?.scheduledStartTime?.endsWith('Z');
    const tagsFix = finalTagsCount > 0;
    
    console.log('\n🎯 FIX VERIFICATION:');
    console.log('========================================');
    console.log(`${timezoneFix ? '✅' : '❌'} Timezone Fix: ${timezoneFix ? 'SUCCESS - No Z suffix' : 'FAILED - Still has Z suffix'}`);
    console.log(`${tagsFix ? '✅' : '❌'} Tags Fix: ${tagsFix ? `SUCCESS - ${finalTagsCount} tags applied` : 'FAILED - No tags applied'}`);
    
    if (timezoneFix && tagsFix) {
      console.log('\n🎉 ✅ ALL FIXES WORKING PERFECTLY!');
      console.log('   ✅ Timezone issue resolved');
      console.log('   ✅ Tags issue resolved');
      console.log('   ✅ YouTube API parameters working correctly');
    } else {
      console.log('\n⚠️ Some fixes need more work:');
      if (!timezoneFix) console.log('   ❌ Timezone fix needs investigation');
      if (!tagsFix) console.log('   ❌ Tags fix needs investigation');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testTimezoneAndTagsFix();
}

module.exports = { testTimezoneAndTagsFix };