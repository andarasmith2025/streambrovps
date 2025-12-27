const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking HSN Stream Schedules ===\n');

const streamIds = [
  '1e191c57-888d-4d42-8266-508148246b40',
  '32bcf084-5af7-4ce7-a006-075793c1f688'
];

db.all(`
  SELECT 
    ss.id,
    ss.stream_id,
    ss.schedule_time,
    ss.end_time,
    ss.duration,
    ss.is_recurring,
    ss.recurring_days,
    s.title
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.stream_id IN ('${streamIds.join("','")}')
  ORDER BY ss.schedule_time
`, (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${schedules.length} schedule(s):\n`);
  
  schedules.forEach((sched, idx) => {
    console.log(`[${idx + 1}] ${sched.title}`);
    console.log(`    Schedule ID: ${sched.id}`);
    console.log(`    Stream ID: ${sched.stream_id}`);
    console.log(`    Schedule Time: ${sched.schedule_time}`);
    console.log(`    End Time: ${sched.end_time || 'Not set'}`);
    console.log(`    Duration: ${sched.duration} minutes`);
    console.log(`    Recurring: ${sched.is_recurring ? 'Yes' : 'No'}`);
    if (sched.is_recurring) {
      console.log(`    Days: ${sched.recurring_days}`);
    }
    
    // Convert to WIB
    if (sched.schedule_time) {
      const schedTime = new Date(sched.schedule_time);
      console.log(`    Schedule Time (WIB): ${schedTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
    }
    
    if (sched.end_time) {
      const endTime = new Date(sched.end_time);
      console.log(`    End Time (WIB): ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
    }
    
    console.log('');
  });

  db.close();
});
