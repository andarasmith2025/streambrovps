const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

const streamId = '3fb6b86c-e26e-4e60-ada8-e63ebc688cb2';

console.log('=== Fixing Live WidiWays Stream Schedule Info ===\n');

// Get stream info
db.get(`
  SELECT id, title, start_time
  FROM streams
  WHERE id = ?
`, [streamId], (err, stream) => {
  if (err || !stream) {
    console.error('Error:', err || 'Stream not found');
    db.close();
    return;
  }

  console.log(`Stream: ${stream.title}`);
  console.log(`Start Time: ${stream.start_time}\n`);

  const startTime = new Date(stream.start_time);
  const startTimeWIB = startTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
  console.log(`Start Time (WIB): ${startTimeWIB}`);

  // Find which schedule is currently active based on start time
  db.all(`
    SELECT 
      id,
      schedule_time,
      end_time,
      duration
    FROM stream_schedules
    WHERE stream_id = ?
    ORDER BY schedule_time
  `, [streamId], (err, schedules) => {
    if (err || !schedules || schedules.length === 0) {
      console.error('Error:', err || 'No schedules found');
      db.close();
      return;
    }

    console.log(`\nFound ${schedules.length} schedule(s):`);
    
    // Find the schedule that matches the start time (within 5 minutes)
    let activeSchedule = null;
    
    for (const sched of schedules) {
      const schedTime = new Date(sched.schedule_time);
      const schedTimeWIB = schedTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
      const endTime = sched.end_time ? new Date(sched.end_time) : null;
      const endTimeWIB = endTime ? endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false }) : 'NOT SET';
      
      console.log(`\n  Schedule ID: ${sched.id}`);
      console.log(`    Time (WIB): ${schedTimeWIB}`);
      console.log(`    End (WIB): ${endTimeWIB}`);
      console.log(`    Duration: ${sched.duration} min`);
      
      // Check if this schedule's time is close to stream start time (within 10 minutes)
      const timeDiff = Math.abs(startTime - schedTime) / (60 * 1000); // in minutes
      console.log(`    Time diff from start: ${Math.round(timeDiff)} minutes`);
      
      if (timeDiff <= 10) {
        activeSchedule = sched;
        console.log(`    ✓ This is the ACTIVE schedule`);
      }
    }

    if (!activeSchedule) {
      console.log('\n❌ Could not determine active schedule');
      db.close();
      return;
    }

    console.log(`\n✓ Active Schedule: ${activeSchedule.id}`);
    
    // Calculate or use end_time
    let endTime;
    if (activeSchedule.end_time) {
      endTime = activeSchedule.end_time;
      console.log(`Using schedule end_time: ${endTime}`);
    } else {
      const schedTime = new Date(activeSchedule.schedule_time);
      endTime = new Date(schedTime.getTime() + activeSchedule.duration * 60 * 1000).toISOString();
      console.log(`Calculated end_time: ${endTime}`);
    }

    const endTimeWIB = new Date(endTime).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
    console.log(`End Time (WIB): ${endTimeWIB}`);

    // Update stream
    db.run(`
      UPDATE streams
      SET 
        scheduled_end_time = ?,
        active_schedule_id = ?,
        duration = ?
      WHERE id = ?
    `, [endTime, activeSchedule.id, activeSchedule.duration, streamId], (err) => {
      if (err) {
        console.error('\n❌ Error updating stream:', err);
      } else {
        console.log('\n✅ Stream updated successfully!');
        console.log(`   scheduled_end_time: ${endTime}`);
        console.log(`   active_schedule_id: ${activeSchedule.id}`);
        console.log(`   duration: ${activeSchedule.duration} minutes`);
      }
      
      db.close();
    });
  });
});
