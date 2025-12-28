const { db } = require('./db/database');

console.log('Checking pending schedules...\n');

db.all(
  `SELECT 
    ss.id,
    ss.stream_id,
    s.title,
    ss.schedule_time,
    ss.duration,
    ss.is_recurring,
    ss.recurring_days,
    ss.status
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.status = 'pending'
  ORDER BY ss.schedule_time ASC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('No pending schedules found.');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} pending schedule(s):\n`);
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let recurringCount = 0;
    let oneTimeCount = 0;
    
    rows.forEach((schedule, index) => {
      console.log(`${index + 1}. ${schedule.title}`);
      console.log(`   Schedule ID: ${schedule.id}`);
      console.log(`   Stream ID: ${schedule.stream_id}`);
      console.log(`   Schedule Time: ${schedule.schedule_time}`);
      console.log(`   Duration: ${schedule.duration} minutes`);
      console.log(`   Is Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
      
      if (schedule.is_recurring) {
        recurringCount++;
        if (schedule.recurring_days) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const allowedDays = schedule.recurring_days.split(',').map(d => days[parseInt(d)]);
          console.log(`   Recurring Days: ${allowedDays.join(', ')}`);
        }
      } else {
        oneTimeCount++;
      }
      
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log(`Summary:`);
    console.log(`  Total pending: ${rows.length}`);
    console.log(`  Recurring: ${recurringCount}`);
    console.log(`  One-time: ${oneTimeCount}`);
    console.log('='.repeat(60));
    
    db.close();
  }
);
