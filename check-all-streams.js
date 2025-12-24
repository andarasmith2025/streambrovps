const { db } = require('./db/database');

console.log('=== CHECKING ALL STREAMS ===\n');

// Check all streams
db.all("SELECT id, title, status, active_schedule_id, start_time, created_at FROM streams ORDER BY created_at DESC LIMIT 20", [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log(`Found ${streams.length} stream(s):\n`);
  
  streams.forEach((stream, idx) => {
    console.log(`${idx + 1}. Stream ID: ${stream.id}`);
    console.log(`   Title: ${stream.title}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Active Schedule ID: ${stream.active_schedule_id || 'NULL'}`);
    console.log(`   Start Time: ${stream.start_time || 'NULL'}`);
    console.log(`   Created: ${stream.created_at}`);
    console.log('');
  });
  
  // Check schedules
  console.log('\n=== CHECKING SCHEDULES ===\n');
  db.all("SELECT id, stream_id, schedule_time, recurring_days, duration, status, is_recurring FROM stream_schedules ORDER BY schedule_time DESC LIMIT 20", [], (err, schedules) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log(`Found ${schedules.length} schedule(s):\n`);
    
    schedules.forEach((sch, idx) => {
      console.log(`${idx + 1}. Schedule ID: ${sch.id}`);
      console.log(`   Stream ID: ${sch.stream_id}`);
      console.log(`   Time: ${sch.schedule_time}`);
      console.log(`   Days: ${sch.days || sch.recurring_days || 'N/A'}`);
      console.log(`   Duration: ${sch.duration}m`);
      console.log(`   Status: ${sch.status}`);
      console.log(`   Is Recurring: ${sch.is_recurring}`);
      console.log('');
    });
    
    process.exit(0);
  });
});
