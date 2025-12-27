const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Fixing All Missing End Times ===\n');

db.all(`
  SELECT id, schedule_time, duration
  FROM stream_schedules
  WHERE end_time IS NULL
`, [], (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${schedules.length} schedule(s) to fix\n`);

  if (schedules.length === 0) {
    console.log('✅ Nothing to fix!');
    db.close();
    return;
  }

  let fixed = 0;
  let errors = 0;

  schedules.forEach((sched, idx) => {
    const startTime = new Date(sched.schedule_time);
    const endTime = new Date(startTime.getTime() + sched.duration * 60 * 1000);

    db.run(`
      UPDATE stream_schedules
      SET end_time = ?
      WHERE id = ?
    `, [endTime.toISOString(), sched.id], (err) => {
      if (err) {
        console.error(`❌ Error updating ${sched.id}:`, err.message);
        errors++;
      } else {
        fixed++;
        console.log(`✅ [${fixed}/${schedules.length}] Fixed schedule ${sched.id}`);
      }

      if (idx === schedules.length - 1) {
        console.log(`\n✅ Fixed ${fixed} schedule(s)`);
        if (errors > 0) {
          console.log(`❌ ${errors} error(s)`);
        }
        db.close();
      }
    });
  });
});
