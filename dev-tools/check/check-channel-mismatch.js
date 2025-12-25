const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const streamId = '9e5a0a53-f545-42f1-bc11-861aae325707';

console.log('Checking channel for stream:', streamId);
console.log('');

db.get(
  `SELECT 
    s.id as stream_id,
    s.title,
    s.user_id,
    yc.channel_id,
    yc.channel_title,
    yc.is_default
  FROM streams s
  LEFT JOIN youtube_channels yc ON s.user_id = yc.user_id AND yc.is_default = 1
  WHERE s.id = ?`,
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

    console.log('=== STREAM INFO ===');
    console.log('Stream ID:', row.stream_id);
    console.log('Title:', row.title);
    console.log('User ID:', row.user_id);
    console.log('');

    console.log('=== DEFAULT CHANNEL ===');
    if (row.channel_id) {
      console.log('Channel ID:', row.channel_id);
      console.log('Channel Title:', row.channel_title);
      console.log('Is Default:', row.is_default ? 'Yes' : 'No');
    } else {
      console.log('❌ No default channel found for this user!');
      console.log('This is why broadcast is not visible in YouTube Manage.');
    }
    console.log('');

    // Check all channels for this user
    db.all(
      `SELECT channel_id, channel_title, is_default 
       FROM youtube_channels 
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [row.user_id],
      (err2, channels) => {
        if (err2) {
          console.error('Error fetching channels:', err2);
        } else if (channels && channels.length > 0) {
          console.log('=== ALL CHANNELS FOR THIS USER ===');
          channels.forEach((ch, i) => {
            console.log(`${i + 1}. ${ch.channel_title}`);
            console.log(`   Channel ID: ${ch.channel_id}`);
            console.log(`   Default: ${ch.is_default ? 'YES ✅' : 'No'}`);
            console.log('');
          });

          if (channels.filter(c => c.is_default).length > 1) {
            console.log('⚠️  WARNING: Multiple default channels detected!');
            console.log('This will cause broadcast visibility issues.');
          }
        }
        db.close();
      }
    );
  }
);
