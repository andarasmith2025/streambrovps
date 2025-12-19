const { db } = require('./db/database');

console.log('=== Checking Today\'s Schedules ===\n');

// Get current time
const now = new Date();
console.log(`Current Server Time (UTC): ${now.toISOString()}`);
console.log(`Current Server Time (Local): ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
console.log('');

// Get schedules created today
db.all(`SELECT ss.*, s.title, s.status as stream_status
        FROM stream_schedules ss
        JOIN streams s ON ss.stream_id = s.id
        WHERE DATE(ss.created_at) = DATE('now')
        ORDER BY ss.schedule_time DESC`,
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!rows || rows.length === 0) {
      console.log('❌ No schedules created today');
      console.log('');
      console.log('Please create a new stream with schedule to test.');
    } else {
      console.log(`Found ${rows.length} schedule(s) created today:\n`);
      
      rows.forEach((row, i) => {
        const scheduleTime = new Date(row.schedule_time);
        const timeDiff = scheduleTime - now;
        const minutesDiff = Math.floor(timeDiff / (60 * 1000));
        
        console.log(`${i + 1}. ${row.title}`);
        console.log(`   Schedule ID: ${row.id}`);
        console.log(`   Schedule Time (UTC): ${row.schedule_time}`);
        console.log(`   Schedule Time (Local): ${scheduleTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`   Time Difference: ${minutesDiff} minutes ${minutesDiff > 0 ? '(future)' : '(past)'}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Stream Status: ${row.stream_status}`);
        console.log(`   Duration: ${row.duration} minutes`);
        console.log(`   Recurring: ${row.is_recurring ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    db.close();
    process.exit(0);
  }
);
