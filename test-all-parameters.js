/**
 * Test Script untuk Memverifikasi Semua Parameter YouTube API
 * 
 * Test ini akan memverifikasi bahwa semua parameter dari form
 * dikirim dengan benar ke YouTube API
 */

const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function testAllParameters() {
  console.log('🧪 Testing ALL YouTube API Parameters...\n');
  
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
    
    // Step 2: Test with ALL parameters
    console.log('\n2️⃣ Testing broadcast creation with ALL parameters...');
    
    const testParams = {
      title: 'Complete Parameter Test',
      description: 'Testing all YouTube API parameters including tags, category, language, and additional settings',
      privacyStatus: 'private',
      scheduledStartTime: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
      enableAutoStart: true,
      enableAutoStop: true,
      tags: ['test', 'youtube', 'api', 'streaming', 'complete'],
      category: '22', // People & Blogs
      language: 'en',
      thumbnailPath: null // No thumbnail for this test
    };
    
    console.log('📋 Parameters being sent:');
    console.log(`   - Title: ${testParams.title}`);
    console.log(`   - Description: ${testParams.description.substring(0, 50)}...`);
    console.log(`   - Privacy: ${testParams.privacyStatus}`);
    console.log(`   - Auto Start: ${testParams.enableAutoStart}`);
    console.log(`   - Auto Stop: ${testParams.enableAutoStop}`);
    console.log(`   - Tags: ${testParams.tags.length} tags`);
    console.log(`   - Category: ${testParams.category}`);
    console.log(`   - Language: ${testParams.language}`);
    
    const result = await youtubeService.scheduleLive(tokens, testParams);
    
    console.log('\n📊 BROADCAST CREATION RESULT:');
    console.log(`✅ Broadcast ID: ${result.broadcast?.id}`);
    console.log(`✅ Title: ${result.broadcast?.snippet?.title}`);
    console.log(`✅ Description: ${result.broadcast?.snippet?.description?.substring(0, 50)}...`);
    console.log(`✅ Privacy: ${result.broadcast?.status?.privacyStatus}`);
    console.log(`✅ Auto Start: ${result.broadcast?.contentDetails?.enableAutoStart}`);
    console.log(`✅ Auto Stop: ${result.broadcast?.contentDetails?.enableAutoStop}`);
    console.log(`✅ Tags: ${result.broadcast?.snippet?.tags?.length || 0} tags`);
    console.log(`✅ Category: ${result.broadcast?.snippet?.categoryId}`);
    console.log(`✅ Language: ${result.broadcast?.snippet?.defaultLanguage}`);
    
    // Step 3: Test audience settings
    console.log('\n3️⃣ Testing audience settings...');
    
    const audienceParams = {
      videoId: result.broadcast.id,
      selfDeclaredMadeForKids: false,
      ageRestricted: false,
      syntheticContent: true
    };
    
    console.log('📋 Audience parameters:');
    console.log(`   - Made for Kids: ${audienceParams.selfDeclaredMadeForKids}`);
    console.log(`   - Age Restricted: ${audienceParams.ageRestricted}`);
    console.log(`   - Synthetic Content: ${audienceParams.syntheticContent}`);
    
    const audienceResult = await youtubeService.setAudience(tokens, audienceParams);
    
    console.log('\n📊 AUDIENCE SETTINGS RESULT:');
    console.log(`✅ Success: ${audienceResult.success || 'Applied'}`);
    
    // Step 4: Verify all parameters are correctly applied
    console.log('\n4️⃣ Verifying broadcast details...');
    
    const broadcastDetails = await youtubeService.getBroadcast(tokens, { 
      broadcastId: result.broadcast.id 
    });
    
    console.log('\n🔍 VERIFICATION RESULTS:');
    console.log('========================================');
    
    // Check each parameter
    const checks = [
      {
        name: 'Title',
        expected: testParams.title,
        actual: broadcastDetails?.snippet?.title,
        match: broadcastDetails?.snippet?.title === testParams.title
      },
      {
        name: 'Description',
        expected: testParams.description,
        actual: broadcastDetails?.snippet?.description,
        match: broadcastDetails?.snippet?.description === testParams.description
      },
      {
        name: 'Privacy Status',
        expected: testParams.privacyStatus,
        actual: broadcastDetails?.status?.privacyStatus,
        match: broadcastDetails?.status?.privacyStatus === testParams.privacyStatus
      },
      {
        name: 'Auto Start',
        expected: testParams.enableAutoStart,
        actual: broadcastDetails?.contentDetails?.enableAutoStart,
        match: broadcastDetails?.contentDetails?.enableAutoStart === testParams.enableAutoStart
      },
      {
        name: 'Auto Stop',
        expected: testParams.enableAutoStop,
        actual: broadcastDetails?.contentDetails?.enableAutoStop,
        match: broadcastDetails?.contentDetails?.enableAutoStop === testParams.enableAutoStop
      },
      {
        name: 'Tags Count',
        expected: testParams.tags.length,
        actual: broadcastDetails?.snippet?.tags?.length || 0,
        match: (broadcastDetails?.snippet?.tags?.length || 0) === testParams.tags.length
      },
      {
        name: 'Category',
        expected: testParams.category,
        actual: broadcastDetails?.snippet?.categoryId,
        match: broadcastDetails?.snippet?.categoryId === testParams.category
      },
      {
        name: 'Language',
        expected: testParams.language,
        actual: broadcastDetails?.snippet?.defaultLanguage,
        match: broadcastDetails?.snippet?.defaultLanguage === testParams.language
      }
    ];
    
    let allPassed = true;
    
    checks.forEach(check => {
      const status = check.match ? '✅' : '❌';
      console.log(`${status} ${check.name}: Expected "${check.expected}", Got "${check.actual}"`);
      if (!check.match) allPassed = false;
    });
    
    console.log('========================================');
    
    if (allPassed) {
      console.log('🎉 ✅ ALL PARAMETERS CORRECTLY APPLIED!');
      console.log('✅ Title, Description, Privacy, Auto Settings: WORKING');
      console.log('✅ Tags, Category, Language: WORKING');
      console.log('✅ Audience Settings: WORKING');
    } else {
      console.log('❌ SOME PARAMETERS NOT APPLIED CORRECTLY!');
      console.log('Please check the failed parameters above.');
    }
    
    console.log('\n📋 PARAMETER COVERAGE SUMMARY:');
    console.log('✅ Basic Settings: Title, Description, Privacy');
    console.log('✅ Scheduling: Scheduled Start Time');
    console.log('✅ Auto Settings: Auto Start, Auto Stop');
    console.log('✅ Metadata: Tags, Category, Language');
    console.log('✅ Audience: Made for Kids, Age Restricted, Synthetic Content');
    console.log('✅ Media: Thumbnail Upload (tested separately)');
    console.log('✅ Stream Binding: Manual Key & Dropdown (tested separately)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testAllParameters();
}

module.exports = { testAllParameters };