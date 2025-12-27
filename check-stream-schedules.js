const { db } = require('./db/database');

console.log('Checking schedules for live streams...\n');

// Get live streams
db.all(
  `SELECT id, title, status, start_time, duration FROM streams WHERE status = 'live' AND duration IS NOT NULL ORDER BY start_time`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${streams.length} live streams\n`);
    
    let processed = 0;
    
    streams.forEach((stream, idx) => {
      // Get schedules for this stream
      db.all(
        `SELECT id, schedule_time, duration, status FROM stream_schedules WHERE stream_id = ? ORDER BY schedule_time`,
        [stream.id],
        (err, schedules) => {
          if (err) {
            console.error('Error getting schedules:', err);
            return;
          }
          
          console.log(`${idx + 1}. ${stream.title.substring(0, 50)}...`);
          console.log(`   Stream Start: ${stream.start_time}`);
          console.log(`   Stream Duration: ${stream.duration} minutes`);
          console.log(`   Schedules (${schedules.length}):`);
          
          const now = new Date();
          
          schedules.forEach((sched, sidx) => {
            const schedStart = new Date(sched.schedule_time);
            const schedEnd = new Date(schedStart.getTime() + (sched.duration * 60 * 1000));
            const isNow = now >= schedStart && now <= schedEnd;
            const isPast = now > schedEnd;
            
            console.log(`     ${sidx + 1}. ${schedStart.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})} - ${schedEnd.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})} (${sched.duration}m) ${isNow ? '🟢 NOW' : isPast ? '⚫ PAST' : '🔵 FUTURE'}`);
          });
          
          console.log('');
          
          processed++;
          if (processed === streams.length) {
            process.exit(0);
          }
        }
      );
    });
  }
);
