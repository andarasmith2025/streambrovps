const { db } = require('./db/database');

console.log('=== MONITORING STREAM CREATION ===');
console.log('Waiting for stream creation...\n');

let lastStreamCount = 0;
let lastScheduleCount = 0;

function checkDatabase() {
  // Check streams
  db.all('SELECT id, title, platform, status, schedule_time, use_youtube_api, created_at FROM streams ORDER BY created_at DESC LIMIT 5', [], (err, streams) => {
    if (err) {
      console.error('Error querying streams:', err);
      return;
    }
    
    if (streams.length !== lastStreamCount) {
      console.log('\n🔔 STREAMS TABLE CHANGED!');
      console.log(`Total streams: ${streams.length}`);
      lastStreamCount = streams.length;
      
      if (streams.length > 0) {
        console.log('\n📊 Latest Streams:');
        streams.forEach((s, i) => {
          console.log(`${i + 1}. [${s.id}] ${s.title}`);
          console.log(`   Platform: ${s.platform} | Status: ${s.status}`);
          console.log(`   YouTube API: ${s.use_youtube_api ? 'YES' : 'NO'}`);
          console.log(`   Schedule: ${s.schedule_time || 'None'}`);
          console.log(`   Created: ${s.created_at}`);
        });
      }
    }
  });
  
  // Check schedules
  db.all(`SELECT ss.*, s.title as stream_title 
          FROM stream_schedules ss 
          LEFT JOIN streams s ON ss.stream_id = s.id 
          ORDER BY ss.created_at DESC LIMIT 5`, [], (err, schedules) => {
    if (err) {
      console.error('Error querying schedules:', err);
      return;
    }
    
    if (schedules.length !== lastScheduleCount) {
      console.log('\n🔔 SCHEDULES TABLE CHANGED!');
      console.log(`Total schedules: ${schedules.length}`);
      lastScheduleCount = schedules.length;
      
      if (schedules.length > 0) {
        console.log('\n📅 Latest Schedules:');
        schedules.forEach((sch, i) => {
          console.log(`${i + 1}. [${sch.id}] ${sch.stream_title || 'Unknown'}`);
          console.log(`   Stream ID: ${sch.stream_id}`);
          console.log(`   Schedule Time: ${sch.schedule_time}`);
          console.log(`   Duration: ${sch.duration} minutes`);
          console.log(`   Status: ${sch.status}`);
          console.log(`   Recurring: ${sch.is_recurring ? 'YES' : 'NO'}`);
          if (sch.is_recurring) {
            console.log(`   Days: ${sch.recurring_days}`);
          }
          console.log(`   Created: ${sch.created_at}`);
        });
      }
    }
  });
}

// Check every 2 seconds
setInterval(checkDatabase, 2000);

// Initial check
checkDatabase();

console.log('\n⏳ Monitoring... (Press Ctrl+C to stop)');
console.log('Silakan buat stream dengan schedule sekarang!\n');
