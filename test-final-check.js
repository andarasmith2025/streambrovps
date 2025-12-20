const { db } = require('./db/database');

console.log('\n========================================');
console.log('FINAL CHECK - All Systems');
console.log('========================================\n');

async function runTests() {
  let allPassed = true;
  
  // Test 1: Database Connection
  console.log('1. Testing Database Connection...');
  try {
    await new Promise((resolve, reject) => {
      db.get('SELECT 1', [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('   ✅ Database connected\n');
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    allPassed = false;
  }
  
  // Test 2: Check Users
  console.log('2. Checking Users...');
  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, user_role FROM users', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`   ✅ Found ${users.length} user(s)`);
    users.forEach(u => {
      console.log(`      - ${u.username} (${u.user_role})`);
    });
    console.log('');
  } catch (error) {
    console.log('   ❌ Failed to get users:', error.message);
    allPassed = false;
  }
  
  // Test 3: Check YouTube Tokens
  console.log('3. Checking YouTube Connections...');
  try {
    const tokens = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.username, yt.access_token, yt.refresh_token, yt.expiry_date
         FROM users u
         LEFT JOIN youtube_tokens yt ON u.id = yt.user_id`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    const connected = tokens.filter(t => t.access_token);
    console.log(`   ✅ ${connected.length} user(s) connected to YouTube`);
    
    connected.forEach(t => {
      const now = Date.now();
      const expiry = t.expiry_date ? Number(t.expiry_date) : 0;
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      
      console.log(`      - ${t.username}:`);
      if (minutesUntilExpiry < 0) {
        console.log(`        ⚠️  Token expired ${Math.abs(minutesUntilExpiry)} min ago (will auto-refresh)`);
      } else {
        console.log(`        ✓ Token valid (expires in ${minutesUntilExpiry} min)`);
      }
    });
    
    if (connected.length === 0) {
      console.log('   ⚠️  No users connected to YouTube');
      console.log('      Please connect from dashboard to test schedules');
    }
    console.log('');
  } catch (error) {
    console.log('   ❌ Failed to check tokens:', error.message);
    allPassed = false;
  }
  
  // Test 4: Check Streams
  console.log('4. Checking Streams...');
  try {
    const streams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, status, use_youtube_api, created_at
         FROM streams
         ORDER BY created_at DESC
         LIMIT 10`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`   ✅ Found ${streams.length} stream(s)`);
    
    if (streams.length > 0) {
      console.log('\n   Recent streams:');
      streams.slice(0, 5).forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.title}`);
        console.log(`      Status: ${s.status}`);
        console.log(`      YouTube API: ${s.use_youtube_api ? 'Yes' : 'No'}`);
        console.log(`      Created: ${new Date(s.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️  No streams found');
      console.log('      Create a stream from dashboard to test');
    }
    console.log('');
  } catch (error) {
    console.log('   ❌ Failed to get streams:', error.message);
    allPassed = false;
  }
  
  // Test 5: Check Schedules
  console.log('5. Checking Schedules...');
  try {
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ss.*, s.title
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
    
    console.log(`   ✅ Found ${schedules.length} pending schedule(s)`);
    
    if (schedules.length > 0) {
      const now = new Date();
      const currentDay = now.getDay();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      console.log(`\n   Current time: ${now.toLocaleTimeString()} on ${days[currentDay]}`);
      console.log('\n   Pending schedules:');
      
      schedules.forEach((sch, i) => {
        console.log(`\n   ${i + 1}. ${sch.title}`);
        console.log(`      Time: ${sch.schedule_time}`);
        console.log(`      Duration: ${sch.duration} min`);
        
        if (sch.is_recurring) {
          const dayNumbers = sch.recurring_days.split(',').map(d => parseInt(d));
          const dayNames = dayNumbers.map(d => days[d]).join(', ');
          console.log(`      Recurring: ${dayNames}`);
          
          const isToday = dayNumbers.includes(currentDay);
          console.log(`      Today (${days[currentDay]}): ${isToday ? '✓ Will run' : '✗ Not scheduled'}`);
        } else {
          const scheduleTime = new Date(sch.schedule_time);
          const diffMinutes = Math.floor((scheduleTime - now) / 60000);
          
          if (diffMinutes < 0) {
            console.log(`      Status: ⏰ Passed (${Math.abs(diffMinutes)} min ago)`);
          } else if (diffMinutes <= 1) {
            console.log(`      Status: 🔥 STARTING NOW!`);
          } else {
            console.log(`      Status: ⏰ In ${diffMinutes} minutes`);
          }
        }
      });
    } else {
      console.log('   ⚠️  No pending schedules');
      console.log('      Create a scheduled stream to test scheduler');
    }
    console.log('');
  } catch (error) {
    console.log('   ❌ Failed to get schedules:', error.message);
    allPassed = false;
  }
  
  // Test 6: Check PM2 Status
  console.log('6. Checking PM2 Status...');
  try {
    const { execSync } = require('child_process');
    const output = execSync('pm2 jlist', { encoding: 'utf-8' });
    const processes = JSON.parse(output);
    
    const streambro = processes.find(p => p.name === 'streambro');
    
    if (streambro) {
      console.log(`   ✅ PM2 running`);
      console.log(`      Status: ${streambro.pm2_env.status}`);
      console.log(`      Uptime: ${Math.floor(streambro.pm2_env.pm_uptime / 1000 / 60)} minutes`);
      console.log(`      Restarts: ${streambro.pm2_env.restart_time}`);
    } else {
      console.log('   ❌ PM2 not running');
      allPassed = false;
    }
    console.log('');
  } catch (error) {
    console.log('   ⚠️  Could not check PM2 status');
    console.log('      Run: pm2 status');
    console.log('');
  }
  
  // Test 7: Check Scheduler Service
  console.log('7. Testing Scheduler Service...');
  try {
    const StreamSchedule = require('./models/StreamSchedule');
    const schedules = await StreamSchedule.findPending();
    console.log(`   ✅ Scheduler can query database`);
    console.log(`      Found ${schedules.length} schedule(s) to process`);
    console.log('');
  } catch (error) {
    console.log('   ❌ Scheduler error:', error.message);
    allPassed = false;
  }
  
  // Final Summary
  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================\n');
  
  if (allPassed) {
    console.log('✅ All systems operational!\n');
    console.log('Next steps:');
    console.log('1. Open dashboard in browser');
    console.log('2. Connect YouTube (if not connected)');
    console.log('3. Create a stream with schedule');
    console.log('4. Monitor logs: pm2 logs --lines 50');
    console.log('5. Stream should start automatically at scheduled time\n');
  } else {
    console.log('⚠️  Some tests failed. Check errors above.\n');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
