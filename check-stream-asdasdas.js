const { db } = require('./db/database');

console.log('Checking stream "asdasdas"...\n');

db.get(`SELECT * FROM streams WHERE title LIKE '%asdasdas%' OR title LIKE '%asdadas%' ORDER BY created_at DESC LIMIT 1`, 
  (err, stream) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!stream) {
      console.log('❌ Stream not found in database');
      console.log('This means the stream was not created through StreamBro backend.');
      process.exit(1);
    }
    
    console.log('=== STREAM FOUND ===');
    console.log(`ID: ${stream.id}`);
    console.log(`Title: ${stream.title}`);
    console.log(`Status: ${stream.status}`);
    console.log(`Platform: ${stream.platform}`);
    console.log(`Use YouTube API: ${stream.use_youtube_api}`);
    console.log(`Created: ${stream.created_at}`);
    console.log('');
    
    // Check schedules for this stream
    db.all(`SELECT * FROM stream_schedules WHERE stream_id = ?`, [stream.id], (err2, schedules) => {
      if (err2) {
        console.error('Error checking schedules:', err2);
        process.exit(1);
      }
      
      if (!schedules || schedules.length === 0) {
        console.log('❌ NO SCHEDULES found for this stream!');
        console.log('');
        console.log('PROBLEM: Stream was created but schedule was not saved to database.');
        console.log('This is why scheduler cannot detect and start the stream.');
      } else {
        console.log(`✓ Found ${schedules.length} schedule(s):\n`);
        schedules.forEach((sch, i) => {
          const now = new Date();
          const scheduleTime = new Date(sch.schedule_time);
          const diff = Math.floor((scheduleTime - now) / (60 * 1000));
          
          console.log(`${i + 1}. Schedule Time: ${sch.schedule_time}`);
          console.log(`   Local Time: ${scheduleTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
          console.log(`   Time Diff: ${diff} minutes ${diff > 0 ? '(future)' : '(PAST - should have started)'}`);
          console.log(`   Duration: ${sch.duration} minutes`);
          console.log(`   Status: ${sch.status}`);
          console.log('');
        });
      }
      
      db.close();
      process.exit(0);
    });
  }
);
