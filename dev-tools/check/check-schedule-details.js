// Check detailed schedule information
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== DETAILED SCHEDULE CHECK ===\n');

db.all(`
  SELECT 
    s.id as stream_id,
    s.title,
    s.status,
    s.active_schedule_id,
    sc.id as schedule_id,
    sc.schedule_time,
    sc.duration,
    sc.recurring_days,
    sc.is_recurring
  FROM streams s
  LEFT JOIN stream_schedules sc ON s.id = sc.stream_id
  WHERE s.status = 'live'
  ORDER BY s.title, sc.schedule_time
`, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${rows.length} records\n`);
  
  let currentStream = null;
  
  rows.forEach(row => {
    if (currentStream !== row.stream_id) {
      if (currentStream !== null) console.log('');
      
      console.log(`Stream: ${row.title}`);
      console.log(`  ID: ${row.stream_id.substring(0, 8)}...`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Active Schedule ID: ${row.active_schedule_id || 'NULL'}`);
      console.log(`  Schedules:`);
      
      currentStream = row.stream_id;
    }
    
    if (row.schedule_id) {
      const scheduleDate = new Date(row.schedule_time);
      const startHour = scheduleDate.getHours();
      const startMinute = scheduleDate.getMinutes();
      const duration = parseInt(row.duration);
      const endMinutes = (startHour * 60 + startMinute + duration);
      const endHour = Math.floor(endMinutes / 60) % 24;
      const endMin = endMinutes % 60;
      
      console.log(`    - ${row.schedule_id.substring(0, 8)}...`);
      console.log(`      Time: ${startHour.toString().padStart(2,'0')}:${startMinute.toString().padStart(2,'0')} - ${endHour.toString().padStart(2,'0')}:${endMin.toString().padStart(2,'0')}`);
      console.log(`      Duration: ${duration} minutes`);
      console.log(`      Days: ${row.recurring_days}`);
      console.log(`      Recurring: ${row.is_recurring ? 'Yes' : 'No'}`);
    }
  });
  
  db.close();
  process.exit(0);
});
