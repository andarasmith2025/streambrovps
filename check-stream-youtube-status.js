/**
 * Check Stream and YouTube Broadcast Status
 * Helps debug schedule and broadcast issues
 */

const { db } = require('./db/database');

async function checkStreamStatus() {
  console.log('\n========================================');
  console.log('STREAM & YOUTUBE BROADCAST STATUS CHECK');
  console.log('========================================\n');
  
  // Get all streams
  const streams = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, title, status, use_youtube_api, youtube_broadcast_id, youtube_stream_id, active_schedule_id, start_time, duration 
       FROM streams 
       ORDER BY updated_at DESC 
       LIMIT 10`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  console.log(`Found ${streams.length} stream(s):\n`);
  
  for (const stream of streams) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Stream: ${stream.title}`);
    console.log(`ID: ${stream.id}`);
    console.log(`Status: ${stream.status}`);
    console.log(`YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
    
    if (stream.use_youtube_api) {
      console.log(`YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
      console.log(`YouTube Stream ID: ${stream.youtube_stream_id || 'NULL'}`);
    }
    
    console.log(`Active Schedule ID: ${stream.active_schedule_id || 'NULL'}`);
    
    if (stream.status === 'live') {
      console.log(`Start Time: ${stream.start_time}`);
      console.log(`Duration: ${stream.duration} minutes`);
      
      if (stream.start_time && stream.duration) {
        const startTime = new Date(stream.start_time);
        const now = new Date();
        const elapsedMs = now - startTime;
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const remainingMinutes = stream.duration - elapsedMinutes;
        
        console.log(`Elapsed: ${elapsedMinutes} minutes`);
        console.log(`Remaining: ${remainingMinutes} minutes`);
        
        if (remainingMinutes <= 0) {
          console.log(`⚠️  WARNING: Stream should have stopped ${Math.abs(remainingMinutes)} minutes ago!`);
        }
      }
    }
    
    // Get schedules for this stream
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, schedule_time, duration, status, is_recurring, recurring_days, youtube_broadcast_id, broadcast_status 
         FROM stream_schedules 
         WHERE stream_id = ? 
         ORDER BY schedule_time ASC`,
        [stream.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (schedules.length > 0) {
      console.log(`\nSchedules (${schedules.length}):`);
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      for (const schedule of schedules) {
        console.log(`  • Schedule ID: ${schedule.id}`);
        console.log(`    Time: ${schedule.schedule_time}`);
        console.log(`    Duration: ${schedule.duration} minutes`);
        console.log(`    Status: ${schedule.status}`);
        console.log(`    Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
        
        if (schedule.is_recurring && schedule.recurring_days) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const allowedDays = schedule.recurring_days.split(',').map(d => days[parseInt(d)]);
          console.log(`    Days: ${allowedDays.join(', ')}`);
          
          // Check if today is allowed
          const allowedDayNumbers = schedule.recurring_days.split(',').map(d => parseInt(d));
          if (allowedDayNumbers.includes(currentDay)) {
            console.log(`    ✓ Today (${days[currentDay]}) is allowed`);
            
            // Parse time
            let scheduleHour, scheduleMinute;
            if (schedule.schedule_time.includes(':') && !schedule.schedule_time.includes('T')) {
              const timeParts = schedule.schedule_time.split(':');
              scheduleHour = parseInt(timeParts[0]);
              scheduleMinute = parseInt(timeParts[1]);
            } else if (schedule.schedule_time.includes('T')) {
              if (schedule.schedule_time.endsWith('Z')) {
                const utcDate = new Date(schedule.schedule_time);
                scheduleHour = utcDate.getHours();
                scheduleMinute = utcDate.getMinutes();
              } else {
                const timePart = schedule.schedule_time.split('T')[1].split('.')[0];
                const timeParts = timePart.split(':');
                scheduleHour = parseInt(timeParts[0]);
                scheduleMinute = parseInt(timeParts[1]);
              }
            }
            
            const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
            const nowTimeInMinutes = now.getHours() * 60 + now.getMinutes();
            const diffMinutes = nowTimeInMinutes - scheduleTimeInMinutes;
            
            if (diffMinutes < 0) {
              console.log(`    ⏰ Starts in ${Math.abs(diffMinutes)} minutes`);
            } else if (diffMinutes === 0) {
              console.log(`    ⏰ Should start NOW!`);
            } else if (diffMinutes < schedule.duration) {
              console.log(`    ▶️  Should be RUNNING (${diffMinutes}/${schedule.duration} minutes elapsed)`);
            } else {
              console.log(`    ✓ Completed ${diffMinutes - schedule.duration} minutes ago`);
            }
          } else {
            console.log(`    ✗ Today (${days[currentDay]}) is NOT allowed`);
          }
        }
        
        if (schedule.youtube_broadcast_id) {
          console.log(`    YouTube Broadcast: ${schedule.youtube_broadcast_id}`);
          console.log(`    Broadcast Status: ${schedule.broadcast_status || 'unknown'}`);
        }
        
        console.log('');
      }
    } else {
      console.log('\nNo schedules found');
    }
    
    console.log('');
  }
  
  console.log('========================================\n');
  process.exit(0);
}

checkStreamStatus().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
