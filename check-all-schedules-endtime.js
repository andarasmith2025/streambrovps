const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Checking All Schedules End Time ===\n');

db.all(`
  SELECT 
    ss.id as schedule_id,
    ss.stream_id,
    ss.schedule_time,
    ss.end_time,
    ss.duration,
    s.title as stream_title,
    s.youtube_channel_id
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.end_time IS NULL
  ORDER BY s.youtube_channel_id, s.title, ss.schedule_time
`, [], (err, schedules) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${schedules.length} schedule(s) WITHOUT end_time\n`);

  if (schedules.length === 0) {
    console.log('✅ All schedules have end_time!');
    db.close();
    return;
  }

  const byStream = {};
  schedules.forEach(sched => {
    if (!byStream[sched.stream_id]) {
      byStream[sched.stream_id] = {
        title: sched.stream_title,
        channel: sched.youtube_channel_id,
        schedules: []
      };
    }
    byStream[sched.stream_id].schedules.push(sched);
  });

  Object.keys(byStream).forEach((streamId, idx) => {
    const stream = byStream[streamId];
    console.log(`[${idx + 1}] ${stream.title}`);
    console.log(`    Channel: ${stream.channel || 'NOT SET'}`);
    console.log(`    Schedules missing end_time: ${stream.schedules.length}`);
    stream.schedules.forEach((sched, sidx) => {
      console.log(`      [${sidx + 1}] ${sched.schedule_time} (${sched.duration} min) - NO END TIME`);
    });
    console.log('');
  });

  db.close();
});
