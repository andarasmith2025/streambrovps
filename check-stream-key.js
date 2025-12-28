const { db } = require('./db/database');

const streamId = '3ace78d4-c41d-48fc-b1d4-c9dd92b0cc22';

db.get(
  'SELECT id, title, stream_key, youtube_channel_id FROM streams WHERE id = ?',
  [streamId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else if (row) {
      console.log('Stream info:');
      console.log('  ID:', row.id);
      console.log('  Title:', row.title);
      console.log('  Stream key:', row.stream_key ? row.stream_key.substring(0, 20) + '...' : 'NULL');
      console.log('  Channel ID:', row.youtube_channel_id);
      console.log('');
      console.log('✅ Stream key exists - same stream will be used for both schedules');
      console.log('⚠️  This means:');
      console.log('   - Schedule 1 (18:42) will start the stream');
      console.log('   - Schedule 2 (19:15) will try to start the SAME stream');
      console.log('   - If Schedule 1 is still running, Schedule 2 will fail or wait');
    } else {
      console.log('Stream not found');
    }
    db.close();
  }
);
