const sqlite3 = require('sqlite3').verbose();

console.log('=== TESTING SCHEDULE FLOW ===\n');

const db = new sqlite3.Database('./db/streambro.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to database\n');
  
  // 1. Check streams table
  console.log('1️⃣ CHECKING STREAMS TABLE:');
  db.all('SELECT id, title, status, schedule_time, duration, active_schedule_id, created_at FROM streams ORDER BY created_at DESC LIMIT 5', [], (err, streams) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log(`   Found ${streams.length} stream(s):\n`);
      streams.forEach((stream, i) => {
        console.log(`   ${i + 1}. ${stream.title}`);
        console.log(`      ID: ${stream.id}`);
        console.log(`      Status: ${stream.status}`);
        console.log(`      Schedule Time: ${stream.schedule_time || 'N/A'}`);
        console.log(`      Duration: ${stream.duration || 'N/A'} minutes`);
        console.log(`      Active Schedule ID: ${stream.active_schedule_id || 'N/A'}`);
        console.log(`      Created: ${stream.created_at}\n`);
      });
    }
    
    // 2. Check stream_schedules table
    console.log('\n2️⃣ CHECKING STREAM_SCHEDULES TABLE:');
    db.all('SELECT * FROM stream_schedules ORDER BY created_at DESC LIMIT 10', [], (err, schedules) => {
      if (err) {
        console.error('❌ Error:', err.message);
      } else {
        console.log(`   Found ${schedules.length} schedule(s):\n`);
        schedules.forEach((sch, i) => {
          console.log(`   ${i + 1}. Schedule ID: ${sch.id}`);
          console.log(`      Stream ID: ${sch.stream_id}`);
          console.log(`      Schedule Time: ${sch.schedule_time}`);
          console.log(`      Duration: ${sch.duration} minutes`);
          console.log(`      Status: ${sch.status}`);
          console.log(`      Is Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
          if (sch.is_recurring) {
            console.log(`      Recurring Days: ${sch.recurring_days}`);
          }
          console.log(`      User Timezone: ${sch.user_timezone || 'N/A'}`);
          console.log(`      Executed At: ${sch.executed_at || 'Not yet'}`);
          console.log(`      Created: ${sch.created_at}\n`);
        });
      }
      
      // 3. Check timezone consistency
      console.log('\n3️⃣ TIMEZONE ANALYSIS:');
      console.log(`   System Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
      console.log(`   Current Server Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (Asia/Jakarta)`);
      console.log(`   Current Server Time: ${new Date().toISOString()} (UTC)`);
      
      // 4. Test schedule time parsing
      if (schedules.length > 0) {
        console.log('\n4️⃣ SCHEDULE TIME PARSING TEST:');
        const testSchedule = schedules[0];
        console.log(`   Testing schedule: ${testSchedule.schedule_time}`);
        
        const scheduleDate = new Date(testSchedule.schedule_time);
        console.log(`   Parsed as Date object: ${scheduleDate}`);
        console.log(`   Local time: ${scheduleDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`   UTC time: ${scheduleDate.toISOString()}`);
        console.log(`   Hours (local): ${scheduleDate.getHours()}`);
        console.log(`   Minutes (local): ${scheduleDate.getMinutes()}`);
        
        // Check if it ends with Z (UTC) or not (local)
        if (testSchedule.schedule_time.endsWith('Z')) {
          console.log(`   ⚠️  WARNING: Schedule time has 'Z' suffix (UTC format)`);
          console.log(`   This will be converted to local time by JavaScript`);
        } else {
          console.log(`   ✅ Schedule time is in local format (no 'Z' suffix)`);
        }
      }
      
      db.close();
    });
  });
});
