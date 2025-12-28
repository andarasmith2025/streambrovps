const db = require('./db/database');

console.log('Checking current live streams...\n');

db.query(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.youtube_broadcast_id,
    s.start_time,
    s.scheduled_end_time,
    s.active_schedule_id,
    sch.schedule_time,
    sch.is_recurring
  FROM streams s
  LEFT JOIN schedules sch ON s.active_schedule_id = sch.id
  WHERE s.status IN ('starting', 'live')
  ORDER BY s.start_time DESC
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (rows.length === 0) {
    console.log('No live streams found.');
    process.exit(0);
  }
  
  console.log(`Found ${rows.length} live stream(s):\n`);
  rows.forEach((stream, i) => {
    console.log(`${i+1}. ${stream.title}`);
    console.log(`   ID: ${stream.id}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
    console.log(`   Start Time: ${stream.start_time || 'NOT SET'}`);
    console.log(`   Scheduled End: ${stream.scheduled_end_time || 'NOT SET'}`);
    console.log(`   Active Schedule: ${stream.active_schedule_id || 'NOT SET'}`);
    if (stream.active_schedule_id) {
      console.log(`   Schedule Time: ${stream.schedule_time}`);
      console.log(`   Is Recurring: ${stream.is_recurring ? 'Yes' : 'No'}`);
    }
    console.log('');
  });
  
  process.exit(0);
});
