const { db } = require('./db/database');

const broadcastId = '6jZNlUpFb2M';

db.get(
  'SELECT id, title, youtube_channel_id, youtube_broadcast_id, user_id FROM streams WHERE youtube_broadcast_id = ?',
  [broadcastId],
  (err, row) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('Stream data from database:');
    console.log(JSON.stringify(row, null, 2));
    
    // Get channel info
    if (row && row.youtube_channel_id) {
      db.get(
        'SELECT channel_id, channel_title FROM youtube_channels WHERE channel_id = ?',
        [row.youtube_channel_id],
        (err2, channel) => {
          if (channel) {
            console.log('\nChannel info:');
            console.log(JSON.stringify(channel, null, 2));
          } else {
            console.log('\nChannel not found for youtube_channel_id:', row.youtube_channel_id);
          }
          process.exit(0);
        }
      );
    } else {
      console.log('\nyoutube_channel_id is NULL - using default channel');
      process.exit(0);
    }
  }
);
