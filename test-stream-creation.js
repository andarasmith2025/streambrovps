const Stream = require('./models/Stream');
const StreamSchedule = require('./models/StreamSchedule');
const { db } = require('./db/database');

async function testStreamCreation() {
  console.log('=== TESTING STREAM CREATION ===\n');
  
  try {
    // Test 1: Create a simple stream
    console.log('Test 1: Creating a simple YouTube stream...');
    const streamData = {
      title: 'Test Stream - YouTube API',
      video_id: null,
      rtmp_url: 'rtmp://a.rtmp.youtube.com/live2',
      stream_key: 'test-key-123',
      platform: 'YouTube',
      platform_icon: 'ti-brand-youtube',
      loop_video: true,
      use_youtube_api: true,
      youtube_description: 'Test description',
      youtube_privacy: 'unlisted',
      youtube_made_for_kids: false,
      youtube_age_restricted: false,
      youtube_synthetic_content: false,
      youtube_auto_start: false,
      youtube_auto_end: false,
      user_id: 'test-user-id'
    };
    
    const stream = await Stream.create(streamData);
    console.log('✅ Stream created successfully!');
    console.log('   Stream ID:', stream.id);
    console.log('   Title:', stream.title);
    console.log('   Status:', stream.status);
    console.log('');
    
    // Test 2: Create a schedule for the stream
    console.log('Test 2: Creating a schedule for the stream...');
    const scheduleData = {
      stream_id: stream.id,
      schedule_time: '2025-12-20T23:00:00',
      duration: 3600,
      is_recurring: false,
      user_timezone: 'Asia/Jakarta'
    };
    
    const schedule = await StreamSchedule.create(scheduleData);
    console.log('✅ Schedule created successfully!');
    console.log('   Schedule ID:', schedule.id);
    console.log('   Schedule Time:', schedule.schedule_time);
    console.log('   Duration:', schedule.duration, 'seconds');
    console.log('');
    
    // Test 3: Verify data in database
    console.log('Test 3: Verifying data in database...');
    const streams = await Stream.findAll('test-user-id');
    console.log('✅ Found', streams.length, 'stream(s) in database');
    
    const schedules = await StreamSchedule.findByStreamId(stream.id);
    console.log('✅ Found', schedules.length, 'schedule(s) for stream');
    console.log('');
    
    // Test 4: Test findPending
    console.log('Test 4: Testing StreamSchedule.findPending()...');
    const pendingSchedules = await StreamSchedule.findPending();
    console.log('✅ Found', pendingSchedules.length, 'pending schedule(s)');
    if (pendingSchedules.length > 0) {
      console.log('   First schedule:', {
        id: pendingSchedules[0].id,
        title: pendingSchedules[0].title,
        schedule_time: pendingSchedules[0].schedule_time,
        platform: pendingSchedules[0].platform
      });
    }
    console.log('');
    
    // Cleanup
    console.log('Cleaning up test data...');
    await StreamSchedule.delete(schedule.id);
    await Stream.delete(stream.id, 'test-user-id');
    console.log('✅ Test data cleaned up');
    console.log('');
    
    console.log('=== ALL TESTS PASSED ===');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testStreamCreation();
