const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const streamId = '9e5a0a53-f545-42f1-bc11-861aae325707';

console.log('Checking YouTube stream ID for stream:', streamId);
console.log('');

db.get(
  `SELECT 
    id,
    title,
    stream_key,
    youtube_stream_id,
    rtmp_url,
    use_youtube_api
  FROM streams 
  WHERE id = ?`,
  [streamId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (!row) {
      console.log('Stream not found');
      db.close();
      return;
    }

    console.log('=== STREAM DATA ===');
    console.log('ID:', row.id);
    console.log('Title:', row.title);
    console.log('Use YouTube API:', row.use_youtube_api ? 'Yes' : 'No');
    console.log('');
    
    console.log('=== RTMP CONFIG ===');
    console.log('RTMP URL:', row.rtmp_url);
    console.log('Stream Key:', row.stream_key);
    console.log('YouTube Stream ID:', row.youtube_stream_id || '(not set)');
    console.log('');
    
    if (row.use_youtube_api) {
      if (row.youtube_stream_id) {
        console.log('✅ YouTube Stream ID is set');
        console.log('   This should be used by broadcast scheduler');
      } else {
        console.log('❌ YouTube Stream ID is NOT set');
        console.log('   Broadcast scheduler will try to find it from stream_key');
        console.log('   If stream_key is invalid, broadcast will fail');
      }
    }

    db.close();
  }
);
