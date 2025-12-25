const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streamflow.db');

// Get current time + 2 minutes
const now = new Date();
now.setMinutes(now.getMinutes() + 2);

// Format as ISO string
const newScheduleTime = now.toISOString();

console.log(`Updating schedule time to: ${newScheduleTime}`);
console.log(`Local time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);

const scheduleId = 'd56c7ddb-6b2c-4bd2-9d97-b7b9c048a83b';

db.run(
  `UPDATE stream_schedules SET schedule_time = ? WHERE id = ?`,
  [newScheduleTime, scheduleId],
  function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(`✓ Schedule updated! Changes: ${this.changes}`);
      console.log('\nScheduler will check this in the next minute.');
    }
    db.close();
  }
);
