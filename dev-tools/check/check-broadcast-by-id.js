const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const broadcastId = '84eYy8qZyvg';

console.log('Checking broadcast:', broadcastId);
console.log('');

db.get(
  `SELECT 
    ss.id as schedule_id,
    ss.youtube_broadcast_id,
    ss.broadcast_status,
    ss.schedule_time,
    s.id as stream_id,
    s.title,
    s.stream_key,
    s.youtube_stream_id
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.youtube_broadcast_id = ?`,
  [broadcastId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!row) {
      console.log('❌ Broadcast not found in database');
      console.log('This means broadcast was created but not saved to schedule');
      db.close();
      return;
    }

    console.log('✅ Broadcast found in database!');
    console.log('');
    console.log('=== SCHEDULE INFO ===');
    console.log('Schedule ID:', row.schedule_id);
    console.log('Schedule Time:', row.schedule_time);
    console.log('Broadcast Status:', row.broadcast_status);
    console.log('');
    
    console.log('=== STREAM INFO ===');
    console.log('Stream ID:', row.stream_id);
    console.log('Title:', row.title);
    console.log('Stream Key:', row.stream_key);
    console.log('YouTube Stream ID:', row.youtube_stream_id);
    console.log('');
    
    console.log('=== BROADCAST INFO ===');
    console.log('Broadcast ID:', row.youtube_broadcast_id);
    console.log('YouTube Studio URL:', `https://studio.youtube.com/video/${row.youtube_broadcast_id}/livestreaming`);
    console.log('');
    
    const now = new Date();
    const scheduleTime = new Date(row.schedule_time);
    const minutesUntil = Math.round((scheduleTime - now) / 60000);
    
    console.log('⏰ Time until stream starts:', minutesUntil, 'minutes');
    
    if (minutesUntil <= 0) {
      console.log('🚀 Stream should be starting now or already started!');
    }

    db.close();
  }
);
