require('dotenv').config();
const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING HEALING EARTH RESONANCE SCHEDULES');
console.log('═══════════════════════════════════════════════════════════\n');

const now = new Date();
const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
const currentHour = now.getHours();
const currentMinute = now.getMinutes();
const currentTimeMinutes = currentHour * 60 + currentMinute;

console.log(`Current Time: ${currentHour}:${String(currentMinute).padStart(2, '0')}`);
console.log(`Current Day: ${currentDay} (0=Sun, 1=Mon, ..., 6=Sat)`);
console.log(`Current Time in Minutes: ${currentTimeMinutes}\n`);

// Get Healing Earth channel streams
db.all(
  `SELECT s.id, s.title, s.youtube_channel_id, yc.channel_title
   FROM streams s
   LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
   WHERE yc.channel_title LIKE '%Healing Earth%'
   ORDER BY s.title`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    console.log(`📺 Found ${streams.length} Healing Earth streams\n`);

    if (streams.length === 0) {
      console.log('No Healing Earth streams found!');
      process.exit(0);
    }

    streams.forEach(stream => {
      console.log(`Stream: ${stream.title}`);
      console.log(`ID: ${stream.id}`);
      console.log(`Channel: ${stream.channel_title}\n`);

      // Get schedules for this stream
      db.all(
        `SELECT * FROM stream_schedules 
         WHERE stream_id = ? 
         ORDER BY schedule_time`,
        [stream.id],
        (err, schedules) => {
          if (err) {
            console.error('Error getting schedules:', err);
            return;
          }

          console.log(`  📅 Schedules: ${schedules.length}\n`);

          schedules.forEach((sched, idx) => {
            const schedTime = new Date(sched.schedule_time);
            const schedHour = schedTime.getHours();
            const schedMinute = schedTime.getMinutes();
            const schedTimeMinutes = schedHour * 60 + schedMinute;

            console.log(`  ${idx + 1}. Schedule ID: ${sched.id}`);
            console.log(`     Time: ${schedHour}:${String(schedMinute).padStart(2, '0')}`);
            console.log(`     Duration: ${sched.duration_minutes || 'NOT SET'} minutes`);
            console.log(`     Status: ${sched.status}`);
            console.log(`     Recurring: ${sched.is_recurring ? 'YES' : 'NO'}`);
            
            if (sched.is_recurring) {
              console.log(`     Days: ${sched.recurring_days || 'NOT SET'}`);
              
              if (sched.recurring_days) {
                const allowedDays = sched.recurring_days.split(',').map(d => parseInt(d));
                const todayAllowed = allowedDays.includes(currentDay);
                console.log(`     Today (${currentDay}) allowed: ${todayAllowed ? 'YES ✓' : 'NO ✗'}`);
              }
            }
            
            console.log(`     Broadcast ID: ${sched.youtube_broadcast_id || 'NOT CREATED'}`);
            console.log(`     Broadcast Status: ${sched.broadcast_status || 'NULL'}`);
            
            // Check if should run now
            const threeMinutesLater = currentTimeMinutes + 3;
            const fiveMinutesLater = currentTimeMinutes + 5;
            
            if (sched.is_recurring && sched.recurring_days) {
              const allowedDays = sched.recurring_days.split(',').map(d => parseInt(d));
              if (allowedDays.includes(currentDay)) {
                if (schedTimeMinutes >= threeMinutesLater && schedTimeMinutes <= fiveMinutesLater) {
                  console.log(`     ⚠️  SHOULD CREATE BROADCAST NOW (in 3-5 min window)`);
                } else if (schedTimeMinutes < currentTimeMinutes) {
                  console.log(`     ⏰ Already passed today`);
                } else {
                  const minutesUntil = schedTimeMinutes - currentTimeMinutes;
                  console.log(`     ⏳ Will create broadcast in ${minutesUntil} minutes`);
                }
              }
            }
            
            console.log('');
          });

          console.log('─'.repeat(63) + '\n');
        }
      );
    });

    setTimeout(() => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('💡 TROUBLESHOOTING:\n');
      console.log('If schedules not executing, check:');
      console.log('1. duration_minutes is set (not NULL)');
      console.log('2. recurring_days includes today (0-6)');
      console.log('3. broadcast_status is NULL (not failed)');
      console.log('4. broadcastScheduler is running (check PM2 logs)');
      console.log('═══════════════════════════════════════════════════════════');
      process.exit(0);
    }, 2000);
  }
);
