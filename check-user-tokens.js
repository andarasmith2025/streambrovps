const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking user YouTube tokens...\n');

// Get all users with their YouTube tokens
db.all(`
  SELECT 
    u.id,
    u.username,
    u.email,
    u.user_role,
    yt.access_token,
    yt.refresh_token,
    yt.token_expiry,
    yt.channel_id,
    yt.channel_title,
    yt.created_at as token_created,
    yt.updated_at as token_updated
  FROM users u
  LEFT JOIN youtube_tokens yt ON u.id = yt.user_id
  ORDER BY u.created_at
`, [], (err, users) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${users.length} user(s):\n`);

  users.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.username} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Role: ${user.user_role}`);
    
    if (user.access_token) {
      console.log(`   ✅ YouTube Connected: YES`);
      console.log(`   Channel: ${user.channel_title || 'Unknown'}`);
      console.log(`   Channel ID: ${user.channel_id || 'Unknown'}`);
      console.log(`   Token Expiry: ${user.token_expiry || 'Unknown'}`);
      console.log(`   Token Created: ${user.token_created}`);
      console.log(`   Token Updated: ${user.token_updated}`);
      
      // Check if token is expired
      if (user.token_expiry) {
        const expiry = new Date(user.token_expiry);
        const now = new Date();
        if (expiry < now) {
          console.log(`   ⚠️ Token EXPIRED (${Math.floor((now - expiry) / 1000 / 60)} minutes ago)`);
        } else {
          console.log(`   ✅ Token valid (expires in ${Math.floor((expiry - now) / 1000 / 60)} minutes)`);
        }
      }
    } else {
      console.log(`   ❌ YouTube Connected: NO`);
    }
    console.log('');
  });

  // Now check which users have live streams
  console.log('\n=== LIVE STREAMS BY USER ===\n');
  
  db.all(`
    SELECT 
      s.id,
      s.title,
      s.status,
      s.youtube_broadcast_id,
      s.use_youtube_api,
      s.user_id,
      u.username,
      u.email
    FROM streams s
    JOIN users u ON s.user_id = u.id
    WHERE s.status = 'live'
    ORDER BY s.start_time DESC
  `, [], (err, streams) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    console.log(`Found ${streams.length} live stream(s):\n`);

    streams.forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.title}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Owner: ${stream.username} (${stream.email})`);
      console.log(`   User ID: ${stream.user_id}`);
      console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log('');
    });

    db.close();
  });
});
