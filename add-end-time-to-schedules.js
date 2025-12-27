const { db } = require('./db/database');

console.log('=== ADDING END_TIME TO STREAM_SCHEDULES ===\n');

// Add end_time column
db.run("ALTER TABLE stream_schedules ADD COLUMN end_time TIMESTAMP", (err) => {
  if (err) {
    if (err.message.includes('duplicate column')) {
      console.log('✓ Column end_time already exists');
    } else {
      console.error('Error adding column:', err);
      process.exit(1);
    }
  } else {
    console.log('✓ Added end_time column');
  }
  
  // Update existing schedules to calculate end_time from schedule_time + duration
  console.log('\nUpdating existing schedules...');
  
  db.all("SELECT id, schedule_time, duration FROM stream_schedules WHERE end_time IS NULL", [], (err, schedules) => {
    if (err) {
      console.error('Error fetching schedules:', err);
      process.exit(1);
    }
    
    console.log(`Found ${schedules.length} schedules to update`);
    
    let updated = 0;
    schedules.forEach((schedule, index) => {
      const startTime = new Date(schedule.schedule_time);
      const endTime = new Date(startTime.getTime() + schedule.duration * 60 * 1000);
      const endTimeIso = endTime.toISOString();
      
      db.run(
        "UPDATE stream_schedules SET end_time = ? WHERE id = ?",
        [endTimeIso, schedule.id],
        (err) => {
          if (err) {
            console.error(`Error updating schedule ${schedule.id}:`, err);
          } else {
            updated++;
            console.log(`  ${index + 1}. Updated schedule ${schedule.id}: ${schedule.schedule_time} → ${endTimeIso}`);
          }
          
          if (index === schedules.length - 1) {
            console.log(`\n✓ Updated ${updated} schedules`);
            process.exit(0);
          }
        }
      );
    });
    
    if (schedules.length === 0) {
      console.log('No schedules to update');
      process.exit(0);
    }
  });
});
