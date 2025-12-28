const { db } = require('./db/database');

console.log('Force cleanup ALL stale live streams...\n');

// Get all streams with status "live"
db.all(
  `SELECT id, title, status, start_time, scheduled_end_time, active_schedule_id 
   FROM streams 
   WHERE status = 'live'
   ORDER BY start_time DESC`,
  [],
  async (err, rows) => {
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
    
    console.log(`Found ${rows.length} stream(s) with status "live"\n`);
    
    let cleanedCount = 0;
    
    for (const stream of rows) {
      console.log(`Stream: ${stream.title}`);
      console.log(`  ID: ${stream.id}`);
      console.log(`  Start Time: ${stream.start_time || 'NOT SET'}`);
      console.log(`  Scheduled End Time: ${stream.scheduled_end_time || 'NOT SET'}`);
      console.log(`  Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      
      // Set to offline and clear schedule info
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE streams 
           SET status = 'offline',
               scheduled_end_time = NULL,
               active_schedule_id = NULL,
               status_updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [stream.id],
          (err) => {
            if (err) {
              console.log(`  ❌ Failed: ${err.message}`);
              reject(err);
            } else {
              console.log(`  ✅ Set to offline`);
              cleanedCount++;
              resolve();
            }
          }
        );
      });
      
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log(`Cleanup complete: ${cleanedCount}/${rows.length} stream(s) set to offline`);
    console.log('All streams are now ready for fresh scheduler start.');
    console.log('='.repeat(60));
    
    db.close();
  }
);
