const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const scheduleId = 'c12f4c6a-f26c-48e0-a10c-ed170d49f270';

console.log('Verifying broadcast binding for schedule:', scheduleId);
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
    s.rtmp_url,
    s.use_youtube_api
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  WHERE ss.id = ?`,
  [scheduleId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!row) {
      console.log('Schedule not found');
      db.close();
      return;
    }

    console.log('=== SCHEDULE INFO ===');
    console.log('Schedule ID:', row.schedule_id);
    console.log('Schedule Time:', row.schedule_time);
    console.log('');
    
    console.log('=== STREAM INFO ===');
    console.log('Stream ID:', row.stream_id);
    console.log('Title:', row.title);
    console.log('Use YouTube API:', row.use_youtube_api ? 'Yes' : 'No');
    console.log('');
    
    console.log('=== RTMP CONFIG ===');
    console.log('RTMP URL:', row.rtmp_url);
    console.log('Stream Key:', row.stream_key);
    console.log('Full RTMP:', `${row.rtmp_url}/${row.stream_key}`);
    console.log('');
    
    console.log('=== BROADCAST INFO ===');
    console.log('Broadcast ID:', row.youtube_broadcast_id || 'NOT CREATED');
    console.log('Broadcast Status:', row.broadcast_status || 'N/A');
    console.log('');
    
    if (row.youtube_broadcast_id) {
      console.log('✅ Broadcast created successfully');
      console.log('📺 Check in YouTube Studio: https://studio.youtube.com/video/' + row.youtube_broadcast_id + '/livestreaming');
      console.log('');
      console.log('⏰ Stream will auto-start at:', new Date(row.schedule_time).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      console.log('');
      
      const now = new Date();
      const scheduleTime = new Date(row.schedule_time);
      const minutesUntil = Math.round((scheduleTime - now) / 60000);
      
      console.log(`⏳ Time until stream starts: ${minutesUntil} minutes`);
      
      if (minutesUntil <= 1 && minutesUntil >= 0) {
        console.log('🚀 Stream should start in less than 1 minute!');
      } else if (minutesUntil < 0) {
        console.log('⚠️ Schedule time has passed - stream should be running now!');
      }
    } else {
      console.log('❌ Broadcast not created yet');
      console.log('⚠️ Broadcast scheduler will create it 5-15 minutes before schedule time');
    }

    db.close();
  }
);
