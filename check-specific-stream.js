const { db } = require('./db/database');

const streamId = '435a373e-3e1c-45d7-84e3-9aa1fd740656';

console.log('\n=== Checking Stream & Schedule ===\n');
console.log(`Stream ID: ${streamId}\n`);

// Check stream
db.get('SELECT * FROM streams WHERE id = ?', [streamId], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!stream) {
    console.log('❌ Stream not found in database');
    process.exit(1);
  }
  
  console.log('✓ Stream found:\n');
  console.log(`Title: ${stream.title}`);
  console.log(`Status: ${stream.status}`);
  console.log(`User ID: ${stream.user_id}`);
  console.log(`Use YouTube API: ${stream.use_youtube_api}`);
  console.log(`Video ID: ${stream.video_id}`);
  console.log(`RTMP URL: ${stream.rtmp_url}`);
  console.log(`Stream Key: ${stream.stream_key ? '***' + stream.stream_key.slice(-4) : 'missing'}`);
  console.log(`Created: ${stream.created_at}`);
  
  // Check schedules
  console.log('\n--- Schedules for this stream ---\n');
  
  db.all('SELECT * FROM stream_schedules WHERE stream_id = ?', [streamId], (err2, schedules) => {
    if (err2) {
      console.error('Error:', err2);
      process.exit(1);
    }
    
    if (!schedules || schedules.length === 0) {
      console.log('❌ No schedules found for this stream!');
      console.log('\n⚠️  PROBLEM: Stream is marked as "scheduled" but has no schedule records!');
      console.log('   This means the schedule was not saved to database.');
      console.log('\n   Possible causes:');
      console.log('   1. Frontend did not send schedules in request');
      console.log('   2. Backend failed to save schedules');
      console.log('   3. Database error during schedule creation');
      process.exit(1);
    }
    
    console.log(`Found ${schedules.length} schedule(s):\n`);
    
    schedules.forEach((sch, i) => {
      console.log(`${i + 1}. Schedule ID: ${sch.id}`);
      console.log(`   Time: ${sch.schedule_time}`);
      console.log(`   Duration: ${sch.duration} minutes`);
      console.log(`   Status: ${sch.status}`);
      console.log(`   Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
      
      if (sch.is_recurring) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayNumbers = sch.recurring_days.split(',').map(d => parseInt(d));
        const dayNames = dayNumbers.map(d => days[d]).join(', ');
        console.log(`   Days: ${dayNames} (${sch.recurring_days})`);
      }
      
      if (sch.started_at) {
        console.log(`   Started: ${sch.started_at}`);
      }
      
      console.log('');
    });
    
    // Check if schedule should run now
    console.log('--- Checking if schedule should run now ---\n');
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    console.log(`Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')} on ${days[currentDay]} (day ${currentDay})`);
    console.log('');
    
    schedules.forEach((sch, i) => {
      console.log(`Schedule ${i + 1}:`);
      
      if (sch.is_recurring) {
        const allowedDays = sch.recurring_days.split(',').map(d => parseInt(d));
        const isAllowedDay = allowedDays.includes(currentDay);
        
        console.log(`  Allowed days: ${allowedDays.join(', ')}`);
        console.log(`  Today (${currentDay}) allowed: ${isAllowedDay ? 'YES' : 'NO'}`);
        
        if (isAllowedDay) {
          // Parse time
          let scheduleHour, scheduleMinute;
          
          if (sch.schedule_time.includes('T')) {
            const timePart = sch.schedule_time.split('T')[1].split('.')[0];
            const timeParts = timePart.split(':');
            scheduleHour = parseInt(timeParts[0]);
            scheduleMinute = parseInt(timeParts[1]);
          } else {
            const timeParts = sch.schedule_time.split(':');
            scheduleHour = parseInt(timeParts[0]);
            scheduleMinute = parseInt(timeParts[1]);
          }
          
          console.log(`  Schedule time: ${scheduleHour}:${scheduleMinute.toString().padStart(2, '0')}`);
          console.log(`  Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`);
          
          const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
          const nowTimeInMinutes = currentHour * 60 + currentMinute;
          const timeDiff = nowTimeInMinutes - scheduleTimeInMinutes;
          
          console.log(`  Time difference: ${timeDiff} minutes`);
          
          if (scheduleHour === currentHour && timeDiff >= 0 && timeDiff <= 1) {
            console.log(`  ✅ SHOULD START NOW!`);
          } else if (timeDiff < 0) {
            console.log(`  ⏰ Not yet (starts in ${Math.abs(timeDiff)} minutes)`);
          } else {
            console.log(`  ⏰ Already passed (${timeDiff} minutes ago)`);
          }
        }
      } else {
        const scheduleTime = new Date(sch.schedule_time);
        const diffMs = scheduleTime - now;
        const diffMinutes = Math.floor(diffMs / 60000);
        
        console.log(`  Schedule time: ${scheduleTime.toLocaleString()}`);
        console.log(`  Current time: ${now.toLocaleString()}`);
        console.log(`  Time difference: ${diffMinutes} minutes`);
        
        if (diffMinutes >= 0 && diffMinutes <= 1) {
          console.log(`  ✅ SHOULD START NOW!`);
        } else if (diffMinutes < 0) {
          console.log(`  ⏰ Already passed (${Math.abs(diffMinutes)} minutes ago)`);
        } else {
          console.log(`  ⏰ Not yet (starts in ${diffMinutes} minutes)`);
        }
      }
      
      console.log('');
    });
    
    // Check YouTube tokens
    console.log('--- Checking YouTube Tokens ---\n');
    
    db.get(
      `SELECT yt.access_token, yt.refresh_token, yt.expiry_date
       FROM youtube_tokens yt
       WHERE yt.user_id = ?`,
      [stream.user_id],
      (err3, tokens) => {
        if (err3) {
          console.error('Error:', err3);
          process.exit(1);
        }
        
        if (!tokens) {
          console.log('❌ No YouTube tokens found for this user!');
          console.log('   User must connect YouTube from dashboard.');
        } else {
          console.log('✓ YouTube tokens found');
          console.log(`  Has access token: ${!!tokens.access_token}`);
          console.log(`  Has refresh token: ${!!tokens.refresh_token}`);
          
          if (tokens.expiry_date) {
            const now = Date.now();
            const expiry = Number(tokens.expiry_date);
            const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
            
            if (minutesUntilExpiry < 0) {
              console.log(`  Status: ⚠️  EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
              console.log('  Will auto-refresh when scheduler starts stream');
            } else {
              console.log(`  Status: ✓ Valid (expires in ${minutesUntilExpiry} minutes)`);
            }
          }
        }
        
        console.log('\n');
        process.exit(0);
      }
    );
  });
});
