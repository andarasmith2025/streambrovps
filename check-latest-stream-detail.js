const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== LATEST STREAM DETAILS ===\n');

db.get(`
  SELECT 
    id,
    title,
    youtube_broadcast_id,
    status,
    use_youtube_api,
    schedule_time,
    duration,
    created_at
  FROM streams 
  ORDER BY created_at DESC 
  LIMIT 1
`, [], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!stream) {
    console.log('No streams found');
    db.close();
    return;
  }

  console.log('Stream Details:');
  console.log('  ID:', stream.id);
  console.log('  Title:', stream.title);
  console.log('  Broadcast ID:', stream.youtube_broadcast_id);
  console.log('  Status:', stream.status);
  console.log('  Use YouTube API:', stream.use_youtube_api ? 'YES' : 'NO');
  console.log('  Schedule Time:', stream.schedule_time);
  console.log('  Duration:', stream.duration, 'minutes');
  console.log('  Created:', new Date(stream.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('');

  // Get schedules for this stream
  db.all(`
    SELECT 
      id,
      schedule_time,
      duration,
      status,
      is_recurring,
      recurring_days
    FROM stream_schedules 
    WHERE stream_id = ?
    ORDER BY schedule_time
  `, [stream.id], (err2, schedules) => {
    if (err2) {
      console.error('Error getting schedules:', err2);
      db.close();
      return;
    }

    console.log(`Found ${schedules.length} schedule(s):\n`);
    schedules.forEach((sch, idx) => {
      console.log(`${idx + 1}. Schedule ID: ${sch.id}`);
      console.log(`   Time: ${new Date(sch.schedule_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`   Duration: ${sch.duration} minutes`);
      console.log(`   Status: ${sch.status}`);
      console.log(`   Recurring: ${sch.is_recurring ? 'YES' : 'NO'}`);
      if (sch.is_recurring) {
        console.log(`   Days: ${sch.recurring_days}`);
      }
      console.log('');
    });

    db.close();
  });
});
