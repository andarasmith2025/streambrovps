const { db } = require('./db/database');
const Stream = require('./models/Stream');
const StreamSchedule = require('./models/StreamSchedule');

async function testScheduleComplete() {
  console.log('\n========================================');
  console.log('TEST: Schedule Creation & Database');
  console.log('========================================\n');
  
  try {
    // 1. Check if user has YouTube tokens
    console.log('1. Checking YouTube Connection...\n');
    
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.username, u.youtube_client_id, u.youtube_client_secret,
                yt.access_token, yt.refresh_token, yt.expiry_date
         FROM users u
         LEFT JOIN youtube_tokens yt ON u.id = yt.user_id
         WHERE u.user_role = 'admin'
         LIMIT 1`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!user) {
      console.log('❌ No admin user found');
      process.exit(1);
    }
    
    console.log(`✓ User: ${user.username} (${user.id})`);
    console.log(`  Has YouTube Client ID: ${!!user.youtube_client_id}`);
    console.log(`  Has YouTube Client Secret: ${!!user.youtube_client_secret}`);
    console.log(`  Has Access Token: ${!!user.access_token}`);
    console.log(`  Has Refresh Token: ${!!user.refresh_token}`);
    
    if (!user.access_token) {
      console.log('\n❌ User not connected to YouTube!');
      console.log('   Please connect YouTube first from dashboard.');
      process.exit(1);
    }
    
    // Check token expiry
    if (user.expiry_date) {
      const now = Date.now();
      const expiry = Number(user.expiry_date);
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      
      if (minutesUntilExpiry < 0) {
        console.log(`  ⚠️  Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
        console.log('     Will test auto-refresh...');
      } else {
        console.log(`  ✓ Token valid (expires in ${minutesUntilExpiry} minutes)`);
      }
    }
    
    // 2. Test token refresh
    console.log('\n2. Testing Token Auto-Refresh...\n');
    
    const { getTokensForUser } = require('./routes/youtube');
    const tokens = await getTokensForUser(user.id);
    
    if (!tokens || !tokens.access_token) {
      console.log('❌ Failed to get/refresh tokens');
      process.exit(1);
    }
    
    console.log('✓ Token refresh successful');
    console.log(`  Access Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`  Refresh Token: ${tokens.refresh_token ? 'present' : 'missing'}`);
    
    if (tokens.expiry_date) {
      const now = Date.now();
      const expiry = Number(tokens.expiry_date);
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      console.log(`  Expires in: ${minutesUntilExpiry} minutes`);
    }
    
    // 3. Check existing streams
    console.log('\n3. Checking Existing Streams...\n');
    
    const streams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, status, use_youtube_api, user_id, created_at
         FROM streams
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [user.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`Found ${streams.length} stream(s):\n`);
    
    if (streams.length === 0) {
      console.log('❌ No streams found. Please create a stream first from dashboard.');
      process.exit(1);
    }
    
    streams.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title}`);
      console.log(`   ID: ${s.id}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   YouTube API: ${s.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(s.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // 4. Check schedules for each stream
    console.log('4. Checking Schedules...\n');
    
    let totalSchedules = 0;
    
    for (const stream of streams) {
      const schedules = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, schedule_time, duration, status, is_recurring, recurring_days, started_at
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
        console.log(`Stream: ${stream.title}`);
        console.log(`  Schedules: ${schedules.length}\n`);
        
        schedules.forEach((sch, i) => {
          console.log(`  ${i + 1}. Schedule ID: ${sch.id}`);
          console.log(`     Time: ${sch.schedule_time}`);
          console.log(`     Duration: ${sch.duration} minutes`);
          console.log(`     Status: ${sch.status}`);
          console.log(`     Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
          if (sch.is_recurring) {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayNumbers = sch.recurring_days.split(',').map(d => parseInt(d));
            const dayNames = dayNumbers.map(d => days[d]).join(', ');
            console.log(`     Days: ${dayNames} (${sch.recurring_days})`);
          }
          if (sch.started_at) {
            console.log(`     Started: ${new Date(sch.started_at).toLocaleString()}`);
          }
          console.log('');
        });
        
        totalSchedules += schedules.length;
      }
    }
    
    if (totalSchedules === 0) {
      console.log('⚠️  No schedules found. Streams are set to "Stream Now" mode.');
      console.log('   To test scheduler, create a stream with schedule from dashboard.');
    } else {
      console.log(`✓ Total schedules: ${totalSchedules}\n`);
    }
    
    // 5. Test scheduler logic (without actually starting)
    console.log('5. Testing Scheduler Logic...\n');
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(`Current time: ${currentTime} on ${days[currentDay]} (day ${currentDay})`);
    console.log('');
    
    // Check which schedules would match
    const allSchedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ss.*, s.title, s.status as stream_status, s.use_youtube_api, s.user_id
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE ss.status = 'pending'
         ORDER BY ss.schedule_time ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`Found ${allSchedules.length} pending schedule(s)\n`);
    
    let matchingSchedules = 0;
    
    for (const schedule of allSchedules) {
      console.log(`Checking: ${schedule.title} (${schedule.id})`);
      
      if (schedule.is_recurring) {
        // Check if today is allowed
        const allowedDays = schedule.recurring_days.split(',').map(d => parseInt(d));
        const isAllowedDay = allowedDays.includes(currentDay);
        
        console.log(`  Recurring: ${days[allowedDays[0]]} to ${days[allowedDays[allowedDays.length - 1]]}`);
        console.log(`  Today allowed: ${isAllowedDay ? 'Yes' : 'No'}`);
        
        if (isAllowedDay) {
          // Extract time from schedule_time
          let scheduleHour, scheduleMinute;
          
          if (schedule.schedule_time.includes('T')) {
            const timePart = schedule.schedule_time.split('T')[1].split('.')[0];
            const timeParts = timePart.split(':');
            scheduleHour = parseInt(timeParts[0]);
            scheduleMinute = parseInt(timeParts[1]);
          } else {
            const timeParts = schedule.schedule_time.split(':');
            scheduleHour = parseInt(timeParts[0]);
            scheduleMinute = parseInt(timeParts[1]);
          }
          
          console.log(`  Schedule time: ${scheduleHour}:${scheduleMinute}`);
          console.log(`  Current time: ${currentHour}:${currentMinute}`);
          
          const timeDiff = (currentHour * 60 + currentMinute) - (scheduleHour * 60 + scheduleMinute);
          console.log(`  Time difference: ${timeDiff} minutes`);
          
          if (scheduleHour === currentHour && Math.abs(timeDiff) <= 1) {
            console.log(`  ✓ WOULD START NOW!`);
            matchingSchedules++;
          } else {
            console.log(`  ✗ Not time yet`);
          }
        }
      } else {
        // One-time schedule
        const scheduleTime = new Date(schedule.schedule_time);
        const diffMs = scheduleTime - now;
        const diffMinutes = Math.floor(diffMs / 60000);
        
        console.log(`  One-time: ${scheduleTime.toLocaleString()}`);
        console.log(`  Time until start: ${diffMinutes} minutes`);
        
        if (diffMinutes >= 0 && diffMinutes <= 1) {
          console.log(`  ✓ WOULD START NOW!`);
          matchingSchedules++;
        } else if (diffMinutes < 0) {
          console.log(`  ✗ Already passed`);
        } else {
          console.log(`  ✗ Not time yet`);
        }
      }
      
      console.log('');
    }
    
    if (matchingSchedules > 0) {
      console.log(`⚠️  ${matchingSchedules} schedule(s) would start NOW if scheduler is running!`);
    } else {
      console.log('✓ No schedules ready to start at this time.');
    }
    
    // 6. Summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================\n');
    
    console.log('✅ YouTube Connection: OK');
    console.log('✅ Token Refresh: OK');
    console.log(`✅ Streams in Database: ${streams.length}`);
    console.log(`✅ Schedules in Database: ${totalSchedules}`);
    console.log(`✅ Pending Schedules: ${allSchedules.length}`);
    console.log(`✅ Ready to Start Now: ${matchingSchedules}`);
    
    console.log('\n📋 Next Steps:\n');
    
    if (totalSchedules === 0) {
      console.log('1. Create a stream with schedule from dashboard');
      console.log('2. Set schedule time to current time + 2 minutes');
      console.log('3. Run this test again to verify');
    } else if (matchingSchedules === 0) {
      console.log('1. Schedules are in database ✓');
      console.log('2. Wait for scheduled time');
      console.log('3. Monitor logs: pm2 logs | grep Scheduler');
      console.log('4. Stream should start automatically');
    } else {
      console.log('1. Schedules are ready to start!');
      console.log('2. Check if PM2 is running: pm2 status');
      console.log('3. Monitor logs: pm2 logs --lines 50');
      console.log('4. Stream should start within 1 minute');
    }
    
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run test
testScheduleComplete();
