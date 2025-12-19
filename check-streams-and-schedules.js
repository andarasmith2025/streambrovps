const sqlite3 = require('sqlite3').verbose();

console.log('=== CHECKING STREAMS & SCHEDULES ===\n');

const db = new sqlite3.Database('./db/streambro.db', (err) => {
  if (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
  
  // Check streams
  db.all('SELECT id, title, status, schedule_time, duration, user_id, created_at FROM streams ORDER BY created_at DESC', [], (err, streams) => {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }
    
    console.log(`📊 STREAMS (${streams.length}):\n`);
    
    if (streams.length === 0) {
      console.log('   No streams found.\n');
    } else {
      streams.forEach((s, i) => {
        console.log(`${i + 1}. ${s.title}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   Status: ${s.status}`);
        console.log(`   Schedule: ${s.schedule_time || 'N/A'}`);
        console.log(`   Duration: ${s.duration || 'N/A'}m`);
        console.log(`   User ID: ${s.user_id}`);
        console.log(`   Created: ${s.created_at}\n`);
      });
    }
    
    // Check schedules
    db.all('SELECT * FROM stream_schedules ORDER BY created_at DESC', [], (err, schedules) => {
      if (err) {
        console.error('❌ Error:', err.message);
        db.close();
        return;
      }
      
      console.log(`📅 SCHEDULES (${schedules.length}):\n`);
      
      if (schedules.length === 0) {
        console.log('   No schedules found.\n');
      } else {
        schedules.forEach((sch, i) => {
          console.log(`${i + 1}. Schedule ID: ${sch.id}`);
          console.log(`   Stream ID: ${sch.stream_id}`);
          console.log(`   Time: ${sch.schedule_time}`);
          console.log(`   Duration: ${sch.duration}m`);
          console.log(`   Status: ${sch.status}`);
          console.log(`   Recurring: ${sch.is_recurring ? 'Yes (' + sch.recurring_days + ')' : 'No'}`);
          console.log(`   Created: ${sch.created_at}\n`);
        });
      }
      
      console.log('\n💡 TO DELETE ALL:');
      console.log('   Run: node delete-all-streams.js\n');
      
      db.close();
    });
  });
});
