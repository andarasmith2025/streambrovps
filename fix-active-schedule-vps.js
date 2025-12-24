// Fix active_schedule_id for live streams on VPS
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== FIXING ACTIVE SCHEDULE IDs ===\n');

const now = new Date();
const currentDay = now.getDay(); // 0 = Sunday
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
const currentTimeInMinutes = currentHour * 60 + currentMinute;

console.log(`Current time: ${now.toLocaleString()}`);
console.log(`Current day: ${currentDay} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentDay]})`);
console.log(`Current time in minutes: ${currentTimeInMinutes}\n`);

// Get live streams
db.all("SELECT id, title FROM streams WHERE status = 'live'", [], (err, liveStreams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${liveStreams.length} live stream(s)\n`);
  
  let processed = 0;
  
  liveStreams.forEach(stream => {
    // Get schedules for this stream
    db.all("SELECT * FROM stream_schedules WHERE stream_id = ? AND is_recurring = 1", [stream.id], (err, schedules) => {
      if (err) {
        console.error(`Error getting schedules for ${stream.title}:`, err);
        processed++;
        return;
      }
      
      console.log(`\nStream: ${stream.title}`);
      console.log(`  Schedules: ${schedules.length}`);
      
      // Find matching schedule based on current time
      let matchedSchedule = null;
      
      for (const sch of schedules) {
        // Check if today is in recurring days
        const allowedDays = sch.recurring_days.split(',').map(d => parseInt(d));
        
        if (!allowedDays.includes(currentDay)) {
          console.log(`  - Schedule ${sch.id.substring(0, 8)}... : Day ${currentDay} not in allowed days [${allowedDays}]`);
          continue;
        }
        
        // Parse schedule time
        const scheduleDate = new Date(sch.schedule_time);
        const scheduleHour = scheduleDate.getHours();
        const scheduleMinute = scheduleDate.getMinutes();
        const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
        const endTimeInMinutes = scheduleTimeInMinutes + parseInt(sch.duration);
        
        console.log(`  - Schedule ${sch.id.substring(0, 8)}... : ${scheduleHour}:${scheduleMinute.toString().padStart(2,'0')} - ${Math.floor(endTimeInMinutes/60)}:${(endTimeInMinutes%60).toString().padStart(2,'0')} (${sch.duration}m)`);
        
        // Check if current time is within schedule window
        if (currentTimeInMinutes >= scheduleTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
          console.log(`    ✓ MATCH! Current time is within this schedule window`);
          matchedSchedule = sch;
          break;
        } else {
          console.log(`    ✗ No match (current: ${currentTimeInMinutes}, start: ${scheduleTimeInMinutes}, end: ${endTimeInMinutes})`);
        }
      }
      
      if (matchedSchedule) {
        // Update stream with active_schedule_id
        db.run(
          "UPDATE streams SET active_schedule_id = ? WHERE id = ?",
          [matchedSchedule.id, stream.id],
          (err) => {
            if (err) {
              console.error(`  ✗ Failed to update:`, err.message);
            } else {
              console.log(`  ✅ Updated active_schedule_id to: ${matchedSchedule.id.substring(0, 8)}...`);
            }
            
            processed++;
            if (processed === liveStreams.length) {
              console.log('\n=== COMPLETED ===\n');
              db.close();
              process.exit(0);
            }
          }
        );
      } else {
        console.log(`  ⚠️  No matching schedule found for current time`);
        processed++;
        
        if (processed === liveStreams.length) {
          console.log('\n=== COMPLETED ===\n');
          db.close();
          process.exit(0);
        }
      }
    });
  });
  
  if (liveStreams.length === 0) {
    console.log('No live streams to process\n');
    db.close();
    process.exit(0);
  }
});
