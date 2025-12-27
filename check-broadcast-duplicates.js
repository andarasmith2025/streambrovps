const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking for Duplicate Broadcast Creation ===\n');

// Check schedules that might create broadcasts
db.all(`
  SELECT 
    ss.id,
    ss.stream_id,
    ss.schedule_time,
    ss.is_recurring,
    ss.recurring_days,
    ss.status,
    ss.broadcast_status,
    ss.youtube_broadcast_id,
    s.title,
    s.youtube_channel_id,
    yc.channel_title
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE ss.status = 'pending'
    AND s.use_youtube_api = 1
  ORDER BY ss.schedule_time
  LIMIT 20
`, (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${schedules.length} pending schedule(s) with YouTube API:\n`);
  
  // Group by stream_id to find duplicates
  const byStream = {};
  
  schedules.forEach((sched) => {
    if (!byStream[sched.stream_id]) {
      byStream[sched.stream_id] = [];
    }
    byStream[sched.stream_id].push(sched);
  });
  
  // Check for streams with multiple schedules
  Object.keys(byStream).forEach((streamId) => {
    const schedList = byStream[streamId];
    
    if (schedList.length > 1) {
      console.log(`⚠️  MULTIPLE SCHEDULES for stream: ${schedList[0].title}`);
      console.log(`   Channel: ${schedList[0].channel_title || 'Unknown'}`);
      console.log(`   Stream ID: ${streamId}`);
      console.log(`   Number of schedules: ${schedList.length}\n`);
      
      schedList.forEach((s, idx) => {
        console.log(`   [${idx + 1}] Schedule ID: ${s.id}`);
        console.log(`       Time: ${s.schedule_time}`);
        console.log(`       Recurring: ${s.is_recurring ? 'Yes' : 'No'}`);
        if (s.is_recurring) {
          console.log(`       Days: ${s.recurring_days}`);
        }
        console.log(`       Broadcast Status: ${s.broadcast_status || 'NOT SET'}`);
        console.log(`       Broadcast ID: ${s.youtube_broadcast_id || 'NOT CREATED'}`);
        console.log('');
      });
    } else {
      console.log(`✓ Single schedule: ${schedList[0].title}`);
      console.log(`  Channel: ${schedList[0].channel_title || 'Unknown'}`);
      console.log(`  Schedule ID: ${schedList[0].id}`);
      console.log(`  Time: ${schedList[0].schedule_time}`);
      console.log(`  Broadcast Status: ${schedList[0].broadcast_status || 'NOT SET'}`);
      console.log(`  Broadcast ID: ${schedList[0].youtube_broadcast_id || 'NOT CREATED'}`);
      console.log('');
    }
  });
  
  // Check for schedules with broadcast_status = 'failed' that might retry
  const failedSchedules = schedules.filter(s => s.broadcast_status === 'failed');
  if (failedSchedules.length > 0) {
    console.log(`\n⚠️  Found ${failedSchedules.length} schedule(s) with FAILED broadcast status:`);
    console.log('These might retry creating broadcasts!\n');
    
    failedSchedules.forEach((s) => {
      console.log(`- ${s.title}`);
      console.log(`  Schedule ID: ${s.id}`);
      console.log(`  Channel: ${s.channel_title || 'Unknown'}`);
      console.log(`  Time: ${s.schedule_time}`);
      console.log('');
    });
  }

  db.close();
});
