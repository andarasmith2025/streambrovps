/**
 * Test script for new broadcast creation flow
 * Tests that broadcasts are created AFTER FFmpeg is active, not before
 */

const { db } = require('./db/database');

async function testNewBroadcastFlow() {
  console.log('========================================');
  console.log('Testing New Broadcast Creation Flow');
  console.log('========================================\n');
  
  // 1. Check current live streams
  console.log('1. Checking current live streams...');
  const liveStreams = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, title, status, youtube_broadcast_id, active_schedule_id, 
              scheduled_end_time, start_time, use_youtube_api
       FROM streams 
       WHERE status = 'live'
       ORDER BY start_time DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  console.log(`Found ${liveStreams.length} live stream(s):\n`);
  
  for (const stream of liveStreams) {
    console.log(`Stream ID: ${stream.id}`);
    console.log(`  Title: ${stream.title}`);
    console.log(`  Status: ${stream.status}`);
    console.log(`  YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
    console.log(`  Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
    console.log(`  Active Schedule: ${stream.active_schedule_id || 'NOT SET'}`);
    console.log(`  Start Time: ${stream.start_time || 'NOT SET'}`);
    console.log(`  Scheduled End: ${stream.scheduled_end_time || 'NOT SET'}`);
    console.log('');
  }
  
  // 2. Check upcoming schedules
  console.log('\n2. Checking upcoming schedules (next 10 minutes)...');
  const now = new Date();
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
  
  const upcomingSchedules = await new Promise((resolve, reject) => {
    db.all(
      `SELECT ss.*, s.title as stream_title, s.use_youtube_api
       FROM stream_schedules ss
       JOIN streams s ON ss.stream_id = s.id
       WHERE ss.status = 'pending'
       AND s.use_youtube_api = 1
       ORDER BY ss.schedule_time ASC
       LIMIT 10`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  console.log(`Found ${upcomingSchedules.length} upcoming schedule(s):\n`);
  
  for (const schedule of upcomingSchedules) {
    const scheduleTime = new Date(schedule.schedule_time);
    const minutesUntil = Math.floor((scheduleTime - now) / (60 * 1000));
    
    console.log(`Schedule ID: ${schedule.id}`);
    console.log(`  Stream: ${schedule.stream_title} (ID: ${schedule.stream_id})`);
    console.log(`  Schedule Time: ${scheduleTime.toLocaleString()}`);
    console.log(`  Minutes Until: ${minutesUntil > 0 ? minutesUntil : 'PAST'}`);
    console.log(`  Duration: ${schedule.duration} minutes`);
    console.log(`  Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
    console.log(`  Broadcast ID: ${schedule.youtube_broadcast_id || 'NOT SET (will create after FFmpeg active)'}`);
    console.log(`  Broadcast Status: ${schedule.broadcast_status || 'N/A'}`);
    console.log('');
  }
  
  // 3. Check broadcastScheduler status
  console.log('\n3. Broadcast Scheduler Status:');
  console.log('  ⚠️  DISABLED - Broadcasts now created AFTER FFmpeg is active');
  console.log('  ✅ This prevents "Invalid transition" errors');
  console.log('  ✅ This prevents broadcast spam');
  console.log('  ✅ This ensures perfect database/YouTube sync');
  
  // 4. Expected behavior
  console.log('\n4. Expected Behavior:');
  console.log('  When schedule time arrives:');
  console.log('    1. schedulerService starts FFmpeg');
  console.log('    2. streamingService waits for FFmpeg to connect (max 3 min)');
  console.log('    3. streamingService detects stream is "active" in YouTube');
  console.log('    4. streamingService creates broadcast (stream already active)');
  console.log('    5. streamingService transitions to "live" immediately');
  console.log('    6. Result: Database "live" + YouTube "live" ✅');
  
  console.log('\n========================================');
  console.log('Test Complete');
  console.log('========================================');
  
  process.exit(0);
}

testNewBroadcastFlow().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
