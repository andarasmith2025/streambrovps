const { db } = require('./db/database');

console.log('Checking stream timeline and schedule details...\n');

db.all(
  `SELECT 
    s.id, 
    s.title, 
    s.status,
    s.start_time,
    s.end_time,
    s.duration,
    s.scheduled_end_time,
    s.active_schedule_id,
    s.youtube_broadcast_id,
    s.youtube_channel_id,
    ss.schedule_time,
    ss.duration as schedule_duration,
    ss.end_time as schedule_end_time,
    ss.is_recurring,
    ss.recurring_days
  FROM streams s
  LEFT JOIN stream_schedules ss ON s.active_schedule_id = ss.id
  WHERE s.status = 'live'
    AND s.use_youtube_api = 1
  ORDER BY s.start_time DESC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('No live streams found.');
      db.close();
      return;
    }
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB)\n`);
    console.log(`Found ${rows.length} live stream(s):\n`);
    
    rows.forEach((stream, index) => {
      console.log(`${'='.repeat(70)}`);
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`${'='.repeat(70)}`);
      console.log(`Stream ID: ${stream.id}`);
      console.log(`Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`Channel: ${stream.youtube_channel_id || 'NOT SET'}`);
      console.log('');
      
      // Stream times
      if (stream.start_time) {
        const startTime = new Date(stream.start_time);
        const elapsedMs = now - startTime;
        const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        console.log(`STREAM START TIME:`);
        console.log(`  UTC: ${startTime.toISOString()}`);
        console.log(`  WIB: ${startTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`  Elapsed: ${elapsedMinutes} minutes (${elapsedSeconds} seconds)`);
        console.log('');
      }
      
      // Scheduled end time
      if (stream.scheduled_end_time) {
        const endTime = new Date(stream.scheduled_end_time);
        const remainingMs = endTime - now;
        const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
        
        console.log(`SCHEDULED END TIME:`);
        console.log(`  UTC: ${endTime.toISOString()}`);
        console.log(`  WIB: ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`  Remaining: ${remainingMinutes} minutes`);
        
        if (remainingMinutes < 0) {
          console.log(`  ⚠️ ALREADY PASSED! Stream should have stopped ${Math.abs(remainingMinutes)} minutes ago!`);
        }
        console.log('');
      } else {
        console.log(`SCHEDULED END TIME: NOT SET`);
        console.log('');
      }
      
      // Schedule info
      if (stream.active_schedule_id) {
        console.log(`SCHEDULE INFO:`);
        console.log(`  Schedule ID: ${stream.active_schedule_id}`);
        console.log(`  Is Recurring: ${stream.is_recurring ? 'YES' : 'NO'}`);
        
        if (stream.schedule_time) {
          const scheduleTime = new Date(stream.schedule_time);
          console.log(`  Schedule Time: ${scheduleTime.toISOString()}`);
          console.log(`  Schedule Time WIB: ${scheduleTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
        }
        
        console.log(`  Duration: ${stream.schedule_duration || 'NOT SET'} minutes`);
        
        if (stream.schedule_end_time) {
          const schedEndTime = new Date(stream.schedule_end_time);
          console.log(`  Schedule End Time: ${schedEndTime.toISOString()}`);
          console.log(`  Schedule End Time WIB: ${schedEndTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
        }
        
        if (stream.recurring_days) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const allowedDays = stream.recurring_days.split(',').map(d => days[parseInt(d)]);
          console.log(`  Recurring Days: ${allowedDays.join(', ')}`);
        }
        console.log('');
      } else {
        console.log(`SCHEDULE INFO: NO ACTIVE SCHEDULE`);
        console.log('');
      }
      
      // Analysis
      console.log(`ANALYSIS:`);
      if (!stream.scheduled_end_time && !stream.active_schedule_id) {
        console.log(`  ⚠️ NO END TIME INFO - Stream won't be auto-stopped`);
      } else if (stream.scheduled_end_time) {
        const endTime = new Date(stream.scheduled_end_time);
        const remainingMinutes = Math.floor((endTime - now) / (1000 * 60));
        
        if (remainingMinutes < 0) {
          console.log(`  🛑 SHOULD BE STOPPED - End time passed ${Math.abs(remainingMinutes)} minutes ago`);
        } else if (remainingMinutes < 5) {
          console.log(`  ⏰ ENDING SOON - Will stop in ${remainingMinutes} minutes`);
        } else {
          console.log(`  ✓ RUNNING NORMALLY - Will stop in ${remainingMinutes} minutes`);
        }
      }
      
      console.log('');
    });
    
    db.close();
  }
);
