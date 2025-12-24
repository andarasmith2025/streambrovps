// Fix active_schedule_id for live streams - HANDLE CROSS-MIDNIGHT schedules
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== FIXING ACTIVE SCHEDULE IDs (CROSS-MIDNIGHT SUPPORT) ===\n');

const now = new Date();
const currentDay = now.getDay(); // 0 = Sunday
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
const currentTimeInMinutes = currentHour * 60 + currentMinute;

console.log(`Current time: ${now.toLocaleString()}`);
console.log(`Current day: ${currentDay} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][currentDay]})`);
console.log(`Current time in minutes: ${currentTimeInMinutes} (${currentHour}:${currentMinute.toString().padStart(2,'0')})\n`);

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
        
        // For cross-midnight schedules, also check yesterday
        const yesterday = (currentDay - 1 + 7) % 7;
        const isDayAllowed = allowedDays.includes(currentDay) || allowedDays.includes(yesterday);
        
        if (!isDayAllowed) {
          console.log(`  - Schedule ${sch.id.substring(0, 8)}... : Day ${currentDay} not in allowed days [${allowedDays}]`);
          continue;
        }
        
        // Parse schedule time
        const scheduleDate = new Date(sch.schedule_time);
        const scheduleHour = scheduleDate.getHours();
        const scheduleMinute = scheduleDate.getMinutes();
        const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
        const endTimeInMinutes = scheduleTimeInMinutes + parseInt(sch.duration);
        
        // Format end time for display
        let endHour = Math.floor(endTimeInMinutes / 60);
        let endMinute = endTimeInMinutes % 60;
        const crossesMidnight = endTimeInMinutes >= 1440; // 24 * 60
        
        if (crossesMidnight) {
          endHour = endHour % 24;
        }
        
        console.log(`  - Schedule ${sch.id.substring(0, 8)}... : ${scheduleHour}:${scheduleMinute.toString().padStart(2,'0')} - ${endHour}:${endMinute.toString().padStart(2,'0')} (${sch.duration}m)${crossesMidnight ? ' [CROSSES MIDNIGHT]' : ''}`);
        
        // Check if current time is within schedule window
        let isMatch = false;
        
        if (crossesMidnight) {
          // Schedule crosses midnight (e.g., 18:00 - 01:00)
          // Current time matches if:
          // 1. Current time >= start time (same day), OR
          // 2. Current time < end time (next day, after midnight)
          
          const endTimeNextDay = endTimeInMinutes - 1440; // Convert to next day minutes
          
          if (currentTimeInMinutes >= scheduleTimeInMinutes) {
            // Same day, after start time
            isMatch = true;
            console.log(`    ✓ MATCH! (same day, after start time: ${currentTimeInMinutes} >= ${scheduleTimeInMinutes})`);
          } else if (currentTimeInMinutes < endTimeNextDay) {
            // Next day, before end time
            isMatch = true;
            console.log(`    ✓ MATCH! (next day, before end time: ${currentTimeInMinutes} < ${endTimeNextDay})`);
          } else {
            console.log(`    ✗ No match (current: ${currentTimeInMinutes}, start: ${scheduleTimeInMinutes}, end next day: ${endTimeNextDay})`);
          }
        } else {
          // Normal schedule within same day
          if (currentTimeInMinutes >= scheduleTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
            isMatch = true;
            console.log(`    ✓ MATCH! (within same day: ${scheduleTimeInMinutes} <= ${currentTimeInMinutes} < ${endTimeInMinutes})`);
          } else {
            console.log(`    ✗ No match (current: ${currentTimeInMinutes}, start: ${scheduleTimeInMinutes}, end: ${endTimeInMinutes})`);
          }
        }
        
        if (isMatch) {
          matchedSchedule = sch;
          break;
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
              console.log('\n=== COMPLETED ===');
              console.log('Refresh your dashboard to see the checkmarks!\n');
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
