const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking live streams...\n');

db.all(
  `SELECT 
    id, 
    title, 
    status, 
    start_time,
    active_schedule_id
  FROM streams 
  WHERE status = 'live'
  ORDER BY start_time DESC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    const now = new Date();
    console.log('Current time:', now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    console.log('');

    if (!rows || rows.length === 0) {
      console.log('No live streams found');
      db.close();
      return;
    }

    console.log(`Found ${rows.length} live stream(s):\n`);
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Start Time: ${row.start_time}`);
      console.log(`   Active Schedule: ${row.active_schedule_id || 'None'}`);
      
      if (row.start_time) {
        const startTime = new Date(row.start_time);
        const elapsed = Math.round((now - startTime) / 60000);
        console.log(`   Elapsed: ${elapsed} minutes`);
      }
      console.log('');
    });

    // Check schedules
    db.all(
      `SELECT id, stream_id, schedule_time, status 
       FROM stream_schedules 
       WHERE status = 'pending' 
       AND schedule_time <= datetime('now', '+1 hour')
       ORDER BY schedule_time ASC`,
      [],
      (err2, schedules) => {
        if (err2) {
          console.error('Error checking schedules:', err2);
        } else if (schedules && schedules.length > 0) {
          console.log(`\nUpcoming schedules (next hour):`);
          schedules.forEach(s => {
            const schedTime = new Date(s.schedule_time);
            const minutesUntil = Math.round((schedTime - now) / 60000);
            console.log(`- ${s.stream_id.substring(0, 8)}... at ${schedTime.toLocaleTimeString()} (${minutesUntil} min)`);
          });
        }
        db.close();
      }
    );
  }
);
