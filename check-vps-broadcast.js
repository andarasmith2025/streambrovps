const { db } = require('./db/database');

const broadcastId = '6jZNlUpFb2M';

console.log(`Checking broadcast: ${broadcastId}\n`);

// Check in streams table
db.get(
  'SELECT id, title, status, youtube_broadcast_id, user_id, created_at FROM streams WHERE youtube_broadcast_id = ?',
  [broadcastId],
  (err, stream) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (stream) {
      console.log('STREAM FOUND:');
      console.log(JSON.stringify(stream, null, 2));
      
      // Check active streams
      db.all(
        'SELECT id, title, status FROM streams WHERE user_id = ? ORDER BY created_at DESC',
        [stream.user_id],
        (err2, allStreams) => {
          if (!err2) {
            console.log(`\nAll streams for user ${stream.user_id}:`);
            console.log(JSON.stringify(allStreams, null, 2));
          }
          process.exit(0);
        }
      );
    } else {
      console.log('Stream not found in database');
      process.exit(0);
    }
  }
);
