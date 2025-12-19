const sqlite3 = require('sqlite3').verbose();

console.log('=== MONITORING SCHEDULE TEST ===\n');
console.log(`Current Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} (Asia/Jakarta)`);
console.log(`Current Time: ${new Date().toISOString()} (UTC)\n`);

const db = new sqlite3.Database('./db/streambro.db');

function checkData() {
  console.log('\n--- Checking at', new Date().toLocaleTimeString(), '---');
  
  // Check streams
  db.all('SELECT id, title, status, schedule_time, duration, active_schedule_id FROM streams ORDER BY created_at DESC LIMIT 3', [], (err, streams) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    
    console.log(`\n📊 STREAMS (${streams.length}):`);
    streams.forEach(s => {
      console.log(`  • ${s.title}`);
      console.log(`    Status: ${s.status}`);
      console.log(`    Schedule: ${s.schedule_time || 'N/A'}`);
      console.log(`    Duration: ${s.duration || 'N/A'}m`);
      console.log(`    Active Schedule: ${s.active_schedule_id || 'N/A'}`);
    });
    
    // Check schedules
    db.all('SELECT * FROM stream_schedules ORDER BY created_at DESC LIMIT 5', [], (err, schedules) => {
      if (err) {
        console.error('Error:', err.message);
        return;
      }
      
      console.log(`\n📅 SCHEDULES (${schedules.length}):`);
      schedules.forEach(sch => {
        const schedTime = new Date(sch.schedule_time);
        const now = new Date();
        const diff = Math.round((schedTime - now) / 60000); // minutes
        
        console.log(`  • Schedule ID: ${sch.id.substring(0, 8)}...`);
        console.log(`    Stream: ${sch.stream_id.substring(0, 8)}...`);
        console.log(`    Time: ${schedTime.toLocaleTimeString()}`);
        console.log(`    Duration: ${sch.duration}m`);
        console.log(`    Status: ${sch.status}`);
        console.log(`    Recurring: ${sch.is_recurring ? 'Yes (' + sch.recurring_days + ')' : 'No'}`);
        console.log(`    Time until start: ${diff > 0 ? diff + 'm' : 'PASSED (' + Math.abs(diff) + 'm ago)'}`);
      });
    });
  });
}

// Check immediately
checkData();

// Check every 30 seconds
setInterval(checkData, 30000);

console.log('\n⏱️  Monitoring every 30 seconds... (Press Ctrl+C to stop)\n');
