const { db } = require('./db/database');

console.log('Checking today schedules...\n');

db.all(
  `SELECT ss.id, ss.schedule_time, ss.status, ss.is_recurring, ss.recurring_days, ss.created_at, s.user_id
   FROM stream_schedules ss
   LEFT JOIN streams s ON ss.stream_id = s.id
   WHERE ss.schedule_time LIKE '2025-12-22%' 
   ORDER BY ss.schedule_time`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (rows.length === 0) {
      console.log('No schedules found for today (2025-12-22)');
    } else {
      console.log(`Found ${rows.length} schedule(s) for today:\n`);
      rows.forEach((row, index) => {
        const scheduleTime = new Date(row.schedule_time);
        const timeStr = scheduleTime.toLocaleTimeString('id-ID', { 
          timeZone: 'Asia/Jakarta', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        console.log(`${index + 1}. Schedule ID: ${row.id.substring(0, 8)}...`);
        console.log(`   Time: ${timeStr} WIB (${row.schedule_time})`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Recurring: ${row.is_recurring ? 'Yes' : 'No'}`);
        if (row.is_recurring) {
          console.log(`   Days: ${row.recurring_days}`);
        }
        console.log(`   User ID: ${row.user_id ? row.user_id.substring(0, 8) + '...' : 'N/A'}`);
        console.log(`   Created: ${row.created_at}`);
        console.log('');
      });
    }
    
    process.exit(0);
  }
);
