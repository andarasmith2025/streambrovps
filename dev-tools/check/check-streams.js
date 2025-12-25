const { db } = require('./db/database');

console.log('=== CHECKING LIVE STREAMS ===\n');

// Check live streams
db.all("SELECT id, title, status, active_schedule_id, manual_stop FROM streams WHERE status = 'live'", [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log(`Found ${streams.length} live stream(s):\n`);
  
  if (streams.length === 0) {
    console.log('No live streams found.');
    process.exit(0);
  }
  
  streams.forEach((stream, idx) => {
    console.log(`${idx + 1}. Stream ID: ${stream.id}`);
    console.log(`   Title: ${stream.title}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Active Schedule ID: ${stream.active_schedule_id || 'NULL'}`);
    console.log(`   Manual Stop: ${stream.manual_stop}`);
    console.log('');
    
    // Get schedules for this stream
    db.all("SELECT id, schedule_time, days, duration, status, is_recurring, recurring_days FROM stream_schedules WHERE stream_id = ?", [stream.id], (err, schedules) => {
      if (err) {
        console.error('   Error getting schedules:', err);
        return;
      }
      
      console.log(`   Schedules (${schedules.length}):`);
      schedules.forEach((sch, sidx) => {
        console.log(`   ${sidx + 1}. Schedule ID: ${sch.id}`);
        console.log(`      Time: ${sch.schedule_time}`);
        console.log(`      Days: ${sch.days || sch.recurring_days || 'N/A'}`);
        console.log(`      Duration: ${sch.duration}m`);
        console.log(`      Status: ${sch.status}`);
        console.log(`      Is Recurring: ${sch.is_recurring}`);
        console.log('');
      });
      
      if (idx === streams.length - 1) {
        process.exit(0);
      }
    });
  });
});
