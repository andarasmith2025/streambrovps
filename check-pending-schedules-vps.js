const { db } = require('./db/database');

console.log('Checking pending schedules...\n');

db.all(
  `SELECT 
    id, stream_id, schedule_time, duration, 
    is_recurring, recurring_days, 
    status, broadcast_status, youtube_broadcast_id
   FROM stream_schedules 
   WHERE status = 'pending'
   ORDER BY schedule_time ASC 
   LIMIT 10`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(`Found ${rows.length} pending schedule(s):\n`);
      rows.forEach((row, i) => {
        console.log(`${i + 1}. Schedule ID: ${row.id}`);
        console.log(`   Stream ID: ${row.stream_id}`);
        console.log(`   Time: ${row.schedule_time}`);
        console.log(`   Duration: ${row.duration} minutes`);
        console.log(`   Recurring: ${row.is_recurring ? 'Yes' : 'No'}`);
        if (row.is_recurring) {
          console.log(`   Days: ${row.recurring_days}`);
        }
        console.log(`   Broadcast Status: ${row.broadcast_status || 'NULL'}`);
        console.log(`   Broadcast ID: ${row.youtube_broadcast_id || 'NULL'}`);
        console.log('');
      });
    }
    db.close();
  }
);
