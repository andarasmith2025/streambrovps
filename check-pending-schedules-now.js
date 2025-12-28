const db = require('./db/database');

console.log('Checking pending schedules...\n');

const query = `
  SELECT 
    ss.id,
    ss.stream_id,
    ss.schedule_time,
    ss.duration,
    ss.is_recurring,
    ss.recurring_days,
    ss.status,
    ss.youtube_broadcast_id,
    s.title,
    s.use_youtube_api
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.status = 'pending'
    AND s.use_youtube_api = 1
  ORDER BY ss.schedule_time ASC
  LIMIT 10
`;

db.all(query, [], (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!schedules || schedules.length === 0) {
    console.log('No pending YouTube API schedules found.');
    process.exit(0);
  }
  
  const now = new Date();
  console.log(`Current time: ${now.toLocaleString()}\n`);
  console.log(`Found ${schedules.length} pending schedule(s):\n`);
  
  schedules.forEach((sch, i) => {
    const schedTime = new Date(sch.schedule_time);
    const diffMinutes = Math.round((schedTime - now) / 60000);
    
    console.log(`${i+1}. ${sch.title}`);
    console.log(`   Schedule ID: ${sch.id}`);
    console.log(`   Stream ID: ${sch.stream_id}`);
    console.log(`   Schedule Time: ${schedTime.toLocaleString()}`);
    console.log(`   Time until start: ${diffMinutes} minutes`);
    console.log(`   Duration: ${sch.duration} minutes`);
    console.log(`   Is Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
    if (sch.is_recurring) {
      console.log(`   Recurring Days: ${sch.recurring_days}`);
    }
    console.log(`   Broadcast ID: ${sch.youtube_broadcast_id || 'NOT SET'}`);
    console.log(`   Status: ${sch.status}`);
    console.log('');
  });
  
  process.exit(0);
});
