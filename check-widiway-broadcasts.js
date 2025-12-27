const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Checking WidiWays Broadcasts ===\n');

// Check all schedules for WidiWays streams
db.all(`
  SELECT 
    ss.id as schedule_id,
    ss.stream_id,
    ss.schedule_time,
    ss.end_time,
    ss.duration,
    ss.status as schedule_status,
    ss.broadcast_status,
    ss.youtube_broadcast_id,
    s.title as stream_title,
    s.youtube_channel_id,
    s.youtube_thumbnail_path
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE s.youtube_channel_id = 'UC-bgj2tX3FLGV67q6SiZBJA'
  ORDER BY s.created_at DESC, ss.schedule_time ASC
`, [], (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${schedules.length} schedule(s) for WidiWays channel\n`);

  // Group by stream
  const byStream = {};
  schedules.forEach(sched => {
    if (!byStream[sched.stream_id]) {
      byStream[sched.stream_id] = {
        title: sched.stream_title,
        thumbnail: sched.youtube_thumbnail_path,
        schedules: []
      };
    }
    byStream[sched.stream_id].schedules.push(sched);
  });

  Object.keys(byStream).forEach((streamId, idx) => {
    const stream = byStream[streamId];
    console.log(`[${idx + 1}] ${stream.title}`);
    console.log(`    Stream ID: ${streamId}`);
    console.log(`    Thumbnail: ${stream.thumbnail || 'NOT SET'}`);
    console.log(`    Schedules: ${stream.schedules.length}`);
    
    stream.schedules.forEach((sched, sidx) => {
      const schedTime = new Date(sched.schedule_time);
      const endTime = sched.end_time ? new Date(sched.end_time) : null;
      
      console.log(`\n      [${sidx + 1}] Schedule ID: ${sched.schedule_id}`);
      console.log(`          Time: ${schedTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      if (endTime) {
        console.log(`          End: ${endTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      } else {
        console.log(`          End: NOT SET ❌`);
      }
      console.log(`          Duration: ${sched.duration} min`);
      console.log(`          Schedule Status: ${sched.schedule_status}`);
      console.log(`          Broadcast Status: ${sched.broadcast_status || 'NOT SET'}`);
      console.log(`          Broadcast ID: ${sched.youtube_broadcast_id || 'NOT CREATED'}`);
    });
    
    console.log('\n');
  });

  db.close();
});
