const { db } = require('./db/database');

console.log('=== CHECKING HEALING EARTH STREAMS ===\n');

// Get all live streams
db.all(`
  SELECT 
    s.id, s.title, s.status, s.duration, s.start_time, s.end_time,
    s.active_schedule_id, s.youtube_channel_id, s.user_id
  FROM streams s
  WHERE s.status = 'live'
  ORDER BY s.start_time DESC
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} live stream(s)\n`);
  
  if (streams.length === 0) {
    console.log('No live streams found');
    process.exit(0);
  }
  
  streams.forEach((stream, index) => {
    console.log(`\n📺 STREAM ${index + 1}:`);
    console.log('  ID:', stream.id);
    console.log('  Title:', stream.title);
    console.log('  Status:', stream.status);
    console.log('  Duration:', stream.duration, 'minutes');
    console.log('  Start Time:', stream.start_time);
    console.log('  End Time:', stream.end_time || '(not set)');
    console.log('  Active Schedule ID:', stream.active_schedule_id || '(none)');
    console.log('  YouTube Channel ID:', stream.youtube_channel_id || '(default)');
    
    // Calculate elapsed time
    if (stream.start_time) {
      const start = new Date(stream.start_time);
      const now = new Date();
      const elapsedMs = now - start;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedHours = Math.floor(elapsedMinutes / 60);
      const elapsedMins = elapsedMinutes % 60;
      
      console.log(`  Elapsed Time: ${elapsedHours}h ${elapsedMins}m (${elapsedMinutes} minutes total)`);
      
      if (stream.duration) {
        const remainingMinutes = stream.duration - elapsedMinutes;
        if (remainingMinutes > 0) {
          console.log(`  Remaining: ${remainingMinutes} minutes`);
          console.log(`  Should End At: ${new Date(start.getTime() + stream.duration * 60000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        } else {
          console.log(`  ⚠️ EXCEEDED DURATION by ${Math.abs(remainingMinutes)} minutes!`);
          console.log(`  Should have ended at: ${new Date(start.getTime() + stream.duration * 60000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        }
      } else {
        console.log(`  ⚠️ NO DURATION SET - Stream will run indefinitely!`);
      }
    }
    
    // Check if has active schedule
    if (stream.active_schedule_id) {
      console.log('\n  📅 CHECKING SCHEDULE:');
      db.get(`
        SELECT id, schedule_time, duration, status, is_recurring, recurring_days
        FROM stream_schedules
        WHERE id = ?
      `, [stream.active_schedule_id], (err, schedule) => {
        if (err) {
          console.error('  Error fetching schedule:', err);
          return;
        }
        
        if (schedule) {
          console.log('    Schedule ID:', schedule.id);
          console.log('    Schedule Time:', schedule.schedule_time);
          console.log('    Schedule Duration:', schedule.duration, 'minutes');
          console.log('    Schedule Status:', schedule.status);
          console.log('    Is Recurring:', schedule.is_recurring ? 'YES' : 'NO');
          console.log('    Recurring Days:', schedule.recurring_days || '(none)');
          
          // Calculate based on schedule
          const scheduleStart = new Date(schedule.schedule_time);
          const now = new Date();
          const elapsedMs = now - scheduleStart;
          const elapsedMinutes = Math.floor(elapsedMs / 60000);
          const remainingMinutes = schedule.duration - elapsedMinutes;
          
          console.log(`    Elapsed (from schedule): ${elapsedMinutes} minutes`);
          if (remainingMinutes > 0) {
            console.log(`    Remaining: ${remainingMinutes} minutes`);
          } else {
            console.log(`    ⚠️ EXCEEDED by ${Math.abs(remainingMinutes)} minutes!`);
          }
        } else {
          console.log('    ⚠️ Schedule not found!');
        }
        
        if (index === streams.length - 1) {
          console.log('\n=== SUMMARY ===');
          console.log('Total live streams:', streams.length);
          const withDuration = streams.filter(s => s.duration).length;
          const withSchedule = streams.filter(s => s.active_schedule_id).length;
          console.log('Streams with duration:', withDuration);
          console.log('Streams with active schedule:', withSchedule);
          console.log('Streams without duration:', streams.length - withDuration);
          
          if (withDuration === 0 && withSchedule === 0) {
            console.log('\n⚠️ WARNING: No streams have duration or schedule!');
            console.log('These streams will run indefinitely and never auto-stop!');
          }
          
          process.exit(0);
        }
      });
    } else if (index === streams.length - 1) {
      console.log('\n=== SUMMARY ===');
      console.log('Total live streams:', streams.length);
      const withDuration = streams.filter(s => s.duration).length;
      const withSchedule = streams.filter(s => s.active_schedule_id).length;
      console.log('Streams with duration:', withDuration);
      console.log('Streams with active schedule:', withSchedule);
      console.log('Streams without duration:', streams.length - withDuration);
      
      if (withDuration === 0 && withSchedule === 0) {
        console.log('\n⚠️ WARNING: No streams have duration or schedule!');
        console.log('These streams will run indefinitely and never auto-stop!');
      }
      
      process.exit(0);
    }
  });
});
