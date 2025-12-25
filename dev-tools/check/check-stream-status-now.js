const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('[Check Stream Status] Checking active/scheduled streams...\n');

db.all(`
  SELECT 
    s.id, 
    s.title, 
    s.status, 
    s.use_youtube_api,
    s.youtube_broadcast_id,
    s.active_schedule_id,
    s.updated_at,
    u.username
  FROM streams s
  LEFT JOIN users u ON s.user_id = u.id
  WHERE s.status IN ('live', 'scheduled', 'streaming')
  ORDER BY s.updated_at DESC
  LIMIT 10
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${streams.length} active/scheduled stream(s):\n`);
  
  streams.forEach((stream, index) => {
    console.log(`${index + 1}. Stream: ${stream.title}`);
    console.log(`   ID: ${stream.id}`);
    console.log(`   User: ${stream.username}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'none'}`);
    console.log(`   Active Schedule: ${stream.active_schedule_id || 'none'}`);
    console.log(`   Updated: ${stream.updated_at}`);
    console.log('');
  });
  
  // Check schedules for these streams
  if (streams.length > 0) {
    const streamIds = streams.map(s => `'${s.id}'`).join(',');
    
    db.all(`
      SELECT 
        id,
        stream_id,
        schedule_time,
        duration_minutes,
        status,
        is_recurring,
        recurring_days,
        youtube_broadcast_id
      FROM stream_schedules
      WHERE stream_id IN (${streamIds})
      AND status = 'pending'
      ORDER BY schedule_time ASC
    `, [], (err, schedules) => {
      if (err) {
        console.error('Error getting schedules:', err);
        db.close();
        return;
      }
      
      console.log(`\nFound ${schedules.length} pending schedule(s):\n`);
      
      schedules.forEach((schedule, index) => {
        console.log(`${index + 1}. Schedule ID: ${schedule.id}`);
        console.log(`   Stream ID: ${schedule.stream_id}`);
        console.log(`   Time: ${schedule.schedule_time}`);
        console.log(`   Duration: ${schedule.duration_minutes} minutes`);
        console.log(`   Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
        if (schedule.is_recurring) {
          console.log(`   Days: ${schedule.recurring_days}`);
        }
        console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id || 'none'}`);
        console.log('');
      });
      
      db.close();
    });
  } else {
    db.close();
  }
});
