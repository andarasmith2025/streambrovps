const { db } = require('./db/database');

const streamId = '2bca57af-fd76-4fff-9702-a89a9c7de389';

db.get(
  'SELECT id, title, youtube_auto_start, youtube_auto_end, youtube_broadcast_id FROM streams WHERE id = ?',
  [streamId],
  (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else if (row) {
      console.log('Stream:', row.title);
      console.log('ID:', row.id);
      console.log('youtube_auto_start:', row.youtube_auto_start);
      console.log('youtube_auto_end:', row.youtube_auto_end);
      console.log('youtube_broadcast_id:', row.youtube_broadcast_id);
    } else {
      console.log('Stream not found');
    }
    db.close();
  }
);
