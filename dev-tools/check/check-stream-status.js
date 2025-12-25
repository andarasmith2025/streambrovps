const { db } = require('./db/database');

console.log('=== CHECKING STREAM STATUS ===\n');

// Get the specific streams from the log
const streamIds = [
  'a6f93515-678d-4454-80fe-c11d5f01a15f',
  'e1fae681-fb10-475b-9bdd-67eefcdda416'
];

streamIds.forEach(streamId => {
  db.get("SELECT * FROM streams WHERE id = ?", [streamId], (err, stream) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    if (!stream) {
      console.log(`Stream ${streamId} NOT FOUND in database\n`);
      return;
    }
    
    console.log(`Stream: ${stream.title}`);
    console.log(`  ID: ${stream.id}`);
    console.log(`  Status: ${stream.status}`);
    console.log(`  Active Schedule ID: ${stream.active_schedule_id || 'NULL'}`);
    console.log(`  Start Time: ${stream.start_time || 'NULL'}`);
    console.log(`  Duration: ${stream.duration || 'NULL'} minutes`);
    console.log(`  Platform: ${stream.platform}`);
    console.log(`  Use YouTube API: ${stream.use_youtube_api}`);
    console.log(`  YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
    console.log('');
    
    // Get schedules
    db.all("SELECT * FROM stream_schedules WHERE stream_id = ?", [streamId], (err, schedules) => {
      if (err) {
        console.error('  Error getting schedules:', err);
        return;
      }
      
      console.log(`  Schedules (${schedules.length}):`);
      schedules.forEach((sch, idx) => {
        console.log(`  ${idx + 1}. Schedule ID: ${sch.id}`);
        console.log(`     Time: ${sch.schedule_time}`);
        console.log(`     Recurring Days: ${sch.recurring_days || 'N/A'}`);
        console.log(`     Duration: ${sch.duration}m`);
        console.log(`     Status: ${sch.status}`);
        console.log(`     Is Recurring: ${sch.is_recurring}`);
        console.log(`     YouTube Broadcast ID: ${sch.youtube_broadcast_id || 'NULL'}`);
        console.log('');
      });
    });
  });
});

// Also check all streams with status
setTimeout(() => {
  console.log('\n=== ALL STREAMS BY STATUS ===\n');
  db.all("SELECT id, title, status, active_schedule_id, start_time FROM streams ORDER BY status, created_at DESC", [], (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    const grouped = {};
    streams.forEach(s => {
      if (!grouped[s.status]) grouped[s.status] = [];
      grouped[s.status].push(s);
    });
    
    Object.keys(grouped).forEach(status => {
      console.log(`${status.toUpperCase()} (${grouped[status].length}):`);
      grouped[status].forEach(s => {
        console.log(`  - ${s.title} (${s.id.substring(0, 8)}...)`);
        console.log(`    Active Schedule: ${s.active_schedule_id || 'NULL'}`);
        console.log(`    Start Time: ${s.start_time || 'NULL'}`);
      });
      console.log('');
    });
    
    setTimeout(() => process.exit(0), 500);
  });
}, 1000);
