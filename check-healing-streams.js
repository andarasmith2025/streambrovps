const { db } = require('./db/database');

console.log('Checking ALL streams that should have stopped...\n');

// Get all live streams with duration
db.all(
  `SELECT id, title, status, duration, start_time, 
          CAST((julianday('now') - julianday(start_time)) * 24 * 60 AS INTEGER) as elapsed_minutes
   FROM streams 
   WHERE status = 'live' 
   AND start_time IS NOT NULL
   AND duration IS NOT NULL
   AND duration > 0
   ORDER BY start_time`,
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${rows.length} live streams with duration:\n`);
    
    const shouldStopStreams = [];
    
    rows.forEach((stream, idx) => {
      const remaining = stream.duration - stream.elapsed_minutes;
      const shouldStop = remaining <= 0;
      
      if (shouldStop) {
        shouldStopStreams.push(stream);
      }
      
      console.log(`${idx + 1}. ${stream.title.substring(0, 50)}...`);
      console.log(`   Duration: ${stream.duration} min | Elapsed: ${stream.elapsed_minutes} min | Remaining: ${remaining} min`);
      console.log(`   ${shouldStop ? '⚠️  SHOULD STOP NOW!' : '✅ Still within duration'}`);
      console.log(`   Start: ${stream.start_time}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Summary: ${shouldStopStreams.length} stream(s) should be stopped`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (shouldStopStreams.length > 0) {
      console.log('\nStreams that exceeded duration:');
      shouldStopStreams.forEach(s => {
        console.log(`  - ${s.title.substring(0, 60)}...`);
        console.log(`    Exceeded by: ${s.elapsed_minutes - s.duration} minutes`);
      });
    }
    
    process.exit(0);
  }
);
