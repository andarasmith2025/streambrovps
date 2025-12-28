const { db } = require('./db/database');

console.log('Cleaning up streams with stale scheduled_end_time...\n');

const now = new Date();
console.log(`Current time: ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })} WIB)\n`);

// Find streams with scheduled_end_time in the past but status is 'live'
db.all(
  `SELECT 
    id, 
    title, 
    status,
    scheduled_end_time,
    active_schedule_id,
    start_time
  FROM streams 
  WHERE status = 'live'
    AND scheduled_end_time IS NOT NULL
    AND scheduled_end_time < datetime('now')
  ORDER BY scheduled_end_time ASC`,
  [],
  async (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('✓ No streams with stale end times found.');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} stream(s) with stale scheduled_end_time:\n`);
    
    for (const stream of rows) {
      const endTime = new Date(stream.scheduled_end_time);
      const hoursAgo = Math.floor((now - endTime) / (1000 * 60 * 60));
      
      console.log(`Stream: ${stream.title}`);
      console.log(`  ID: ${stream.id}`);
      console.log(`  Scheduled End Time: ${endTime.toISOString()} (${hoursAgo} hours ago)`);
      console.log(`  Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`  Start Time: ${stream.start_time || 'NOT SET'}`);
      
      // Clear stale end time and schedule ID
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE streams 
           SET scheduled_end_time = NULL,
               active_schedule_id = NULL
           WHERE id = ?`,
          [stream.id],
          (err) => {
            if (err) {
              console.log(`  ❌ Failed to clear: ${err.message}`);
              reject(err);
            } else {
              console.log(`  ✅ Cleared stale end time and schedule ID`);
              resolve();
            }
          }
        );
      });
      
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log(`Cleanup complete: ${rows.length} stream(s) cleaned`);
    console.log('These streams will no longer be auto-stopped by stale end times.');
    console.log('They will get new end times when scheduler starts them next time.');
    console.log('='.repeat(60));
    
    db.close();
  }
);
