// Verify schedules in VPS database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== VERIFYING SCHEDULES IN VPS DATABASE ===\n');

// Get all streams with their schedules
db.all(`
  SELECT 
    s.id as stream_id,
    s.title,
    s.status,
    s.use_youtube_api,
    COUNT(sc.id) as schedule_count
  FROM streams s
  LEFT JOIN stream_schedules sc ON s.id = sc.stream_id
  GROUP BY s.id
  ORDER BY s.created_at DESC
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} stream(s)\n`);
  
  let totalSchedules = 0;
  let processedStreams = 0;
  
  streams.forEach((stream, idx) => {
    console.log(`${idx + 1}. ${stream.title}`);
    console.log(`   ID: ${stream.stream_id.substring(0, 8)}...`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   YouTube API: ${stream.use_youtube_api ? 'Yes' : 'No'}`);
    console.log(`   Schedules: ${stream.schedule_count}`);
    
    totalSchedules += stream.schedule_count;
    
    if (stream.schedule_count > 0) {
      // Get detailed schedules
      db.all(`
        SELECT 
          id,
          schedule_time,
          duration,
          is_recurring,
          recurring_days,
          status,
          youtube_broadcast_id
        FROM stream_schedules
        WHERE stream_id = ?
        ORDER BY schedule_time ASC
      `, [stream.stream_id], (err, schedules) => {
        if (err) {
          console.error('   Error getting schedules:', err);
        } else {
          schedules.forEach((sch, sidx) => {
            const schedDate = new Date(sch.schedule_time);
            const hour = schedDate.getHours().toString().padStart(2, '0');
            const minute = schedDate.getMinutes().toString().padStart(2, '0');
            
            console.log(`   ${sidx + 1}. ${hour}:${minute} (${sch.duration}m)`);
            console.log(`      ID: ${sch.id.substring(0, 8)}...`);
            console.log(`      Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
            if (sch.is_recurring) {
              const days = sch.recurring_days.split(',').map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseInt(d)]).join(', ');
              console.log(`      Days: ${days}`);
            }
            console.log(`      Status: ${sch.status}`);
            console.log(`      Broadcast ID: ${sch.youtube_broadcast_id || 'NULL'}`);
          });
        }
        
        processedStreams++;
        if (processedStreams === streams.length) {
          console.log('\n=== SUMMARY ===');
          console.log(`Total streams: ${streams.length}`);
          console.log(`Total schedules: ${totalSchedules}`);
          console.log('\n✅ Verification completed\n');
          db.close();
          process.exit(0);
        }
      });
    } else {
      console.log('   (No schedules)');
      processedStreams++;
      
      if (processedStreams === streams.length) {
        console.log('\n=== SUMMARY ===');
        console.log(`Total streams: ${streams.length}`);
        console.log(`Total schedules: ${totalSchedules}`);
        console.log('\n✅ Verification completed\n');
        db.close();
        process.exit(0);
      }
    }
    
    console.log('');
  });
  
  if (streams.length === 0) {
    console.log('No streams found in database\n');
    db.close();
    process.exit(0);
  }
});
