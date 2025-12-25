const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const streamId = '9e5a0a53-f545-42f1-bc11-861aae325707';

console.log('Checking schedules for stream:', streamId);
console.log('');

db.all(
  `SELECT id, schedule_time, duration, status, youtube_broadcast_id, broadcast_status
   FROM stream_schedules 
   WHERE stream_id = ?
   ORDER BY schedule_time`,
  [streamId],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('No schedules found');
      db.close();
      return;
    }

    console.log(`Found ${rows.length} schedule(s):\n`);
    
    rows.forEach((row, index) => {
      console.log(`${index + 1}. Schedule ID: ${row.id}`);
      console.log(`   Time: ${row.schedule_time}`);
      console.log(`   Duration: ${row.duration} min`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Broadcast ID: ${row.youtube_broadcast_id || 'None'}`);
      console.log(`   Broadcast Status: ${row.broadcast_status || 'N/A'}`);
      console.log('');
    });

    if (rows.length > 1) {
      console.log('⚠️  WARNING: Multiple schedules found for same stream!');
      console.log('This should not happen - update should delete old schedules.');
    }

    db.close();
  }
);
