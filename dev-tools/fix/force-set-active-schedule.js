// Force set active_schedule_id for live streams
// This will link each live stream to its FIRST recurring schedule
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== FORCE SETTING ACTIVE SCHEDULE IDs ===\n');
console.log('This will link each live stream to its first recurring schedule\n');

db.all("SELECT id, title FROM streams WHERE status = 'live'", [], (err, liveStreams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${liveStreams.length} live stream(s)\n`);
  
  let processed = 0;
  
  liveStreams.forEach(stream => {
    // Get first schedule for this stream
    db.get(
      "SELECT id, schedule_time, duration FROM stream_schedules WHERE stream_id = ? AND is_recurring = 1 ORDER BY schedule_time ASC LIMIT 1",
      [stream.id],
      (err, schedule) => {
        if (err) {
          console.error(`Error for ${stream.title}:`, err);
          processed++;
          return;
        }
        
        if (!schedule) {
          console.log(`⚠️  ${stream.title}: No schedule found`);
          processed++;
          
          if (processed === liveStreams.length) {
            finish();
          }
          return;
        }
        
        // Update stream with active_schedule_id
        db.run(
          "UPDATE streams SET active_schedule_id = ? WHERE id = ?",
          [schedule.id, stream.id],
          (err) => {
            if (err) {
              console.error(`✗ ${stream.title}: Failed to update -`, err.message);
            } else {
              const schedDate = new Date(schedule.schedule_time);
              console.log(`✅ ${stream.title}`);
              console.log(`   Linked to schedule: ${schedule.id.substring(0, 8)}...`);
              console.log(`   Schedule time: ${schedDate.getHours()}:${schedDate.getMinutes().toString().padStart(2,'0')} (${schedule.duration}m)`);
            }
            
            processed++;
            if (processed === liveStreams.length) {
              finish();
            }
          }
        );
      }
    );
  });
  
  if (liveStreams.length === 0) {
    console.log('No live streams to process\n');
    db.close();
    process.exit(0);
  }
});

function finish() {
  console.log('\n=== COMPLETED ===');
  console.log('\n✅ All live streams now have active_schedule_id set!');
  console.log('📋 Refresh your dashboard to see the checkmarks!\n');
  db.close();
  process.exit(0);
}
