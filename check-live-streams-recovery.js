const { db } = require('./db/database');

console.log('Checking live streams and their recovery status...\n');

db.all(
  `SELECT 
    id, 
    title, 
    status, 
    active_schedule_id, 
    scheduled_end_time, 
    start_time,
    duration
  FROM streams 
  WHERE status = 'live' 
  ORDER BY start_time DESC 
  LIMIT 10`,
  [],
  (err, rows) => {
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
    
    console.log(`Found ${rows.length} live stream(s):\n`);
    
    rows.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   ID: ${stream.id}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`   Scheduled End Time: ${stream.scheduled_end_time || 'NOT SET'}`);
      console.log(`   Start Time: ${stream.start_time || 'NOT SET'}`);
      console.log(`   Duration: ${stream.duration || 'NOT SET'} minutes`);
      
      if (stream.start_time) {
        const startTime = new Date(stream.start_time);
        const now = new Date();
        const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));
        console.log(`   Elapsed: ${elapsedMinutes} minutes`);
        
        if (stream.scheduled_end_time) {
          const endTime = new Date(stream.scheduled_end_time);
          const remainingMinutes = Math.floor((endTime - now) / (1000 * 60));
          console.log(`   Remaining: ${remainingMinutes} minutes`);
        }
      }
      console.log('');
    });
    
    db.close();
  }
);
