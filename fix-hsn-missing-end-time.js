const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Fixing HSN Streams Missing End Time ===\n');

// Get HSN streams that are live but missing scheduled_end_time
db.all(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.start_time,
    s.scheduled_end_time,
    s.active_schedule_id,
    s.duration
  FROM streams s
  WHERE s.youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w'
    AND s.status = 'live'
    AND s.scheduled_end_time IS NULL
`, (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} HSN stream(s) missing scheduled_end_time\n`);
  
  if (streams.length === 0) {
    console.log('No streams to fix.');
    db.close();
    return;
  }

  let fixed = 0;
  let errors = 0;

  streams.forEach((stream, idx) => {
    console.log(`[${idx + 1}] ${stream.title}`);
    console.log(`    ID: ${stream.id}`);
    console.log(`    Start Time: ${stream.start_time}`);
    console.log(`    Duration: ${stream.duration} minutes`);

    // Find matching schedule for this stream
    db.get(`
      SELECT id, schedule_time, end_time, duration
      FROM stream_schedules
      WHERE stream_id = ?
      ORDER BY schedule_time
      LIMIT 1
    `, [stream.id], (err, schedule) => {
      if (err) {
        console.error(`    ❌ Error finding schedule:`, err.message);
        errors++;
        return;
      }

      if (!schedule) {
        console.log(`    ⚠️  No schedule found for this stream`);
        errors++;
        
        if (idx === streams.length - 1) {
          console.log(`\n✅ Fixed: ${fixed}, ❌ Errors: ${errors}`);
          db.close();
        }
        return;
      }

      console.log(`    Found schedule: ${schedule.id}`);
      console.log(`      Schedule time: ${schedule.schedule_time}`);
      console.log(`      Schedule end_time: ${schedule.end_time || 'Not set'}`);
      console.log(`      Schedule duration: ${schedule.duration} minutes`);

      // Calculate scheduled_end_time
      let scheduledEndTime;
      
      if (schedule.end_time) {
        // Use schedule's end_time directly (it's already a timestamp)
        scheduledEndTime = schedule.end_time;
        console.log(`    Using schedule end_time: ${scheduledEndTime}`);
      } else if (stream.start_time && schedule.duration) {
        // Calculate from start_time + duration
        const startDate = new Date(stream.start_time);
        const endDate = new Date(startDate.getTime() + schedule.duration * 60 * 1000);
        scheduledEndTime = endDate.toISOString();
        console.log(`    Calculated from start_time + duration: ${scheduledEndTime}`);
      } else {
        console.log(`    ⚠️  Cannot calculate end time - missing data`);
        errors++;
        
        if (idx === streams.length - 1) {
          console.log(`\n✅ Fixed: ${fixed}, ❌ Errors: ${errors}`);
          db.close();
        }
        return;
      }

      // Update stream with scheduled_end_time and active_schedule_id
      db.run(`
        UPDATE streams
        SET scheduled_end_time = ?,
            active_schedule_id = ?,
            duration = ?
        WHERE id = ?
      `, [scheduledEndTime, schedule.id, schedule.duration, stream.id], function(err) {
        if (err) {
          console.error(`    ❌ Error updating stream:`, err.message);
          errors++;
        } else {
          console.log(`    ✅ Updated stream with:`);
          console.log(`       scheduled_end_time: ${scheduledEndTime}`);
          console.log(`       active_schedule_id: ${schedule.id}`);
          console.log(`       duration: ${schedule.duration} minutes`);
          fixed++;
        }

        // Close DB after last stream
        if (idx === streams.length - 1) {
          console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`✅ Fixed: ${fixed} stream(s)`);
          console.log(`❌ Errors: ${errors} stream(s)`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          db.close();
        }
      });
    });
  });
});
