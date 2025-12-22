const { db } = require('./db/database');

const streamId = '3bd6fd69-73ef-4d36-a445-675f17f595e7';

db.get(
  'SELECT id, youtube_stream_id, youtube_broadcast_id, stream_key, use_youtube_api FROM streams WHERE id = ?',
  [streamId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!row) {
      console.log('Stream not found');
      process.exit(1);
    }
    
    console.log('Stream Data:');
    console.log('  ID:', row.id);
    console.log('  youtube_stream_id:', row.youtube_stream_id || 'NULL/EMPTY');
    console.log('  youtube_broadcast_id:', row.youtube_broadcast_id || 'NULL/EMPTY');
    console.log('  stream_key:', row.stream_key || 'NULL/EMPTY');
    console.log('  use_youtube_api:', row.use_youtube_api);
    
    console.log('\nPROBLEM:');
    if (!row.youtube_stream_id) {
      console.log('  ❌ youtube_stream_id is NULL/EMPTY!');
      console.log('  This causes scheduleLive to create NEW stream key every time');
      console.log('  FFmpeg uses stream_key but YouTube broadcast uses different key');
    } else {
      console.log('  ✅ youtube_stream_id exists:', row.youtube_stream_id);
    }
    
    process.exit(0);
  }
);
