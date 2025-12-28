require('dotenv').config();
const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 FIXING HEALING EARTH SCHEDULES - SET DURATION');
console.log('═══════════════════════════════════════════════════════════\n');

// Get all Healing Earth schedules with NULL duration
const query = `
  SELECT 
    ss.id as schedule_id,
    ss.stream_id,
    ss.schedule_time,
    ss.duration,
    ss.is_recurring,
    ss.recurring_days,
    s.title as stream_title,
    yc.channel_title
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE yc.channel_title LIKE '%Healing Earth%'
    AND (ss.duration IS NULL OR ss.duration = 0)
  ORDER BY ss.schedule_time
`;

db.all(query, [], (err, schedules) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  console.log(`Found ${schedules.length} schedules with NULL/0 duration\n`);

  if (schedules.length === 0) {
    console.log('✅ All schedules already have duration set!');
    process.exit(0);
  }

  let fixed = 0;
  let errors = 0;

  // Default duration: 360 minutes (6 hours)
  const DEFAULT_DURATION = 360;

  schedules.forEach((sched, idx) => {
    console.log(`${idx + 1}. Schedule ID: ${sched.schedule_id}`);
    console.log(`   Stream: ${sched.stream_title}`);
    console.log(`   Time: ${sched.schedule_time}`);
    console.log(`   Current Duration: ${sched.duration || 'NULL'}`);
    console.log(`   Setting Duration: ${DEFAULT_DURATION} minutes (6 hours)`);

    db.run(
      `UPDATE stream_schedules SET duration = ? WHERE id = ?`,
      [DEFAULT_DURATION, sched.schedule_id],
      function(updateErr) {
        if (updateErr) {
          console.log(`   ❌ Error: ${updateErr.message}\n`);
          errors++;
        } else {
          console.log(`   ✅ Fixed!\n`);
          fixed++;
        }

        // Check if this is the last one
        if (idx === schedules.length - 1) {
          setTimeout(() => {
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`✅ Fixed: ${fixed} schedules`);
            console.log(`❌ Errors: ${errors} schedules`);
            console.log('═══════════════════════════════════════════════════════════');
            process.exit(0);
          }, 500);
        }
      }
    );
  });
});
