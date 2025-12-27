const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Fixing End Time for 2 Schedules ===\n');

// Get schedules for the stream
const streamId = '3fb6b86c-e26e-4e60-ada8-e63ebc688cb2';

db.all(`
  SELECT id, schedule_time, duration, end_time
  FROM stream_schedules
  WHERE stream_id = ?
  ORDER BY schedule_time
`, [streamId], (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${schedules.length} schedules\n`);

  let updated = 0;
  schedules.forEach((sched, idx) => {
    const startTime = new Date(sched.schedule_time);
    const endTime = new Date(startTime.getTime() + (sched.duration * 60 * 1000));
    
    console.log(`[${idx + 1}] Schedule ID: ${sched.id}`);
    console.log(`    Start: ${startTime.toISOString()}`);
    console.log(`    Duration: ${sched.duration} min`);
    console.log(`    Calculated End: ${endTime.toISOString()}`);
    console.log(`    Current End: ${sched.end_time || 'NULL'}`);
    
    if (!sched.end_time) {
      db.run(`
        UPDATE stream_schedules
        SET end_time = ?
        WHERE id = ?
      `, [endTime.toISOString(), sched.id], (err) => {
        if (err) {
          console.error(`    ❌ Error updating: ${err.message}`);
        } else {
          console.log(`    ✅ Updated end_time`);
          updated++;
        }
        
        if (idx === schedules.length - 1) {
          console.log(`\n✅ Updated ${updated} schedule(s)`);
          db.close();
        }
      });
    } else {
      console.log(`    ⏭️  Already has end_time, skipping`);
      if (idx === schedules.length - 1) {
        console.log(`\n✅ Updated ${updated} schedule(s)`);
        db.close();
      }
    }
    console.log('');
  });
});
