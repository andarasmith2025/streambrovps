const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('\n=== YouTube Stream Configuration Check ===\n');

// Check users with YouTube credentials
db.all(`
  SELECT 
    id,
    username,
    email,
    youtube_client_id IS NOT NULL as has_client_id,
    youtube_client_secret IS NOT NULL as has_client_secret,
    youtube_redirect_uri,
    youtube_access_token IS NOT NULL as has_access_token,
    youtube_refresh_token IS NOT NULL as has_refresh_token,
    youtube_token_expiry
  FROM users
`, [], (err, users) => {
  if (err) {
    console.error('Error fetching users:', err);
    return;
  }

  console.log('📊 Users YouTube Configuration:');
  console.log('================================\n');
  
  users.forEach(user => {
    console.log(`User: ${user.username} (${user.email})`);
    console.log(`  ID: ${user.id}`);
    console.log(`  ✓ Client ID: ${user.has_client_id ? 'Yes' : 'No'}`);
    console.log(`  ✓ Client Secret: ${user.has_client_secret ? 'Yes' : 'No'}`);
    console.log(`  ✓ Redirect URI: ${user.youtube_redirect_uri || 'Not set'}`);
    console.log(`  ✓ Access Token: ${user.has_access_token ? 'Yes' : 'No'}`);
    console.log(`  ✓ Refresh Token: ${user.has_refresh_token ? 'Yes' : 'No'}`);
    
    if (user.youtube_token_expiry) {
      const expiry = new Date(user.youtube_token_expiry);
      const now = new Date();
      const isExpired = expiry < now;
      console.log(`  ✓ Token Expiry: ${expiry.toLocaleString()} ${isExpired ? '(EXPIRED!)' : '(Valid)'}`);
    } else {
      console.log(`  ✓ Token Expiry: Not set`);
    }
    console.log('');
  });

  // Check streams configuration
  db.all(`
    SELECT 
      s.*,
      u.username,
      v.title as video_title,
      v.file_path
    FROM streams s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN videos v ON s.video_id = v.id
    WHERE s.platform = 'YouTube'
    ORDER BY s.created_at DESC
    LIMIT 10
  `, [], (err, streams) => {
    if (err) {
      console.error('Error fetching streams:', err);
      db.close();
      return;
    }

    console.log('\n📺 Recent YouTube Streams:');
    console.log('==========================\n');
    
    if (streams.length === 0) {
      console.log('No YouTube streams found.\n');
    } else {
      streams.forEach(stream => {
        console.log(`Stream: ${stream.title}`);
        console.log(`  ID: ${stream.id}`);
        console.log(`  User: ${stream.username}`);
        console.log(`  Video: ${stream.video_title}`);
        console.log(`  Status: ${stream.status}`);
        console.log(`  RTMP URL: ${stream.rtmp_url}`);
        console.log(`  Stream Key: ${stream.stream_key ? stream.stream_key.substring(0, 10) + '...' : 'Not set'}`);
        console.log(`  Use API: ${stream.use_youtube_api ? 'Yes (API Mode)' : 'No (Manual Mode)'}`);
        console.log(`  YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'Not set'}`);
        console.log(`  YouTube Stream ID: ${stream.youtube_stream_id || 'Not set'}`);
        console.log(`  Created: ${new Date(stream.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Check scheduled streams
    db.all(`
      SELECT 
        ss.*,
        s.title as stream_title,
        s.use_youtube_api,
        u.username
      FROM stream_schedules ss
      LEFT JOIN streams s ON ss.stream_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.platform = 'YouTube'
      ORDER BY ss.schedule_time DESC
      LIMIT 5
    `, [], (err, schedules) => {
      if (err) {
        console.error('Error fetching schedules:', err);
        db.close();
        return;
      }

      console.log('\n📅 Scheduled YouTube Streams:');
      console.log('=============================\n');
      
      if (schedules.length === 0) {
        console.log('No scheduled YouTube streams found.\n');
      } else {
        schedules.forEach(schedule => {
          console.log(`Schedule: ${schedule.stream_title}`);
          console.log(`  ID: ${schedule.id}`);
          console.log(`  User: ${schedule.username}`);
          console.log(`  Status: ${schedule.status}`);
          console.log(`  Use API: ${schedule.use_youtube_api ? 'Yes (API Mode)' : 'No (Manual Mode)'}`);
          console.log(`  Schedule Time: ${new Date(schedule.schedule_time).toLocaleString()}`);
          console.log(`  Is Recurring: ${schedule.is_recurring ? 'Yes' : 'No'}`);
          if (schedule.is_recurring) {
            console.log(`  Recurring Days: ${schedule.recurring_days}`);
          }
          console.log('');
        });
      }

      db.close();
      console.log('=== Check Complete ===\n');
    });
  });
});
