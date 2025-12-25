const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking latest pending schedules...\n');

db.all(
  `SELECT 
    ss.id, 
    ss.stream_id, 
    ss.schedule_time, 
    ss.duration, 
    ss.is_recurring,
    ss.recurring_days,
    ss.status, 
    ss.youtube_broadcast_id, 
    ss.broadcast_status,
    s.title,
    s.stream_key,
    s.use_youtube_api
  FROM stream_schedules ss 
  JOIN streams s ON ss.stream_id = s.id 
  WHERE ss.status = 'pending'
  ORDER BY ss.schedule_time DESC 
  LIMIT 5`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('No pending schedules found');
      db.close();
      return;
    }

    console.log(`Found ${rows.length} pending schedule(s):\n`);
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. Schedule ID: ${row.id}`);
      console.log(`   Stream: ${row.title}`);
      console.log(`   Stream ID: ${row.stream_id}`);
      console.log(`   Schedule Time: ${row.schedule_time}`);
      console.log(`   Duration: ${row.duration} minutes`);
      console.log(`   Recurring: ${row.is_recurring ? 'Yes' : 'No'}`);
      if (row.is_recurring) {
        console.log(`   Recurring Days: ${row.recurring_days}`);
      }
      console.log(`   Status: ${row.status}`);
      console.log(`   Use YouTube API: ${row.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`   Stream Key: ${row.stream_key ? row.stream_key.substring(0, 8) + '...' : 'NOT SET'}`);
      console.log(`   Broadcast ID: ${row.youtube_broadcast_id || 'Not created yet'}`);
      console.log(`   Broadcast Status: ${row.broadcast_status || 'N/A'}`);
      console.log('');
    });

    // Check current time
    const now = new Date();
    console.log(`Current VPS time: ${now.toISOString()}`);
    console.log(`Current local time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
    
    // Check next schedule
    const nextSchedule = rows[0];
    const scheduleTime = new Date(nextSchedule.schedule_time);
    const minutesUntil = Math.round((scheduleTime - now) / 60000);
    
    console.log(`\nNext schedule: ${nextSchedule.title}`);
    console.log(`Scheduled for: ${scheduleTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`Time until execution: ${minutesUntil} minutes`);
    
    if (minutesUntil >= 5 && minutesUntil <= 15) {
      console.log('✅ Schedule is in broadcast creation window (5-15 minutes)');
    } else if (minutesUntil < 5 && minutesUntil > 0) {
      console.log('⚠️ Schedule is close (< 5 minutes) - broadcast should already be created');
    } else if (minutesUntil <= 0) {
      console.log('⚠️ Schedule time has passed - should be executing now');
    } else {
      console.log('⏳ Schedule is too far (> 15 minutes) - broadcast not created yet');
    }

    db.close();
  }
);
