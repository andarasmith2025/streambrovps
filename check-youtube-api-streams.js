const { db } = require('./db/database');

console.log('Checking for streams with YouTube API enabled...\n');

db.all(`
  SELECT id, title, use_youtube_api, youtube_broadcast_id, youtube_privacy, 
         youtube_description, platform, status, created_at 
  FROM streams 
  WHERE use_youtube_api = 1 
  ORDER BY created_at DESC 
  LIMIT 10
`, [], (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
    process.exit(1);
  }
  
  if (rows.length === 0) {
    console.log('No streams found with YouTube API enabled.');
  } else {
    console.log(`Found ${rows.length} stream(s) with YouTube API enabled:\n`);
    rows.forEach((row, index) => {
      console.log(`${index + 1}. Stream ID: ${row.id}`);
      console.log(`   Title: ${row.title}`);
      console.log(`   Platform: ${row.platform}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   YouTube Broadcast ID: ${row.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`   Privacy: ${row.youtube_privacy || 'N/A'}`);
      console.log(`   Description: ${row.youtube_description || 'N/A'}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
  }
  
  // Also check if youtube_tokens exist for users
  db.all(`
    SELECT user_id, access_token IS NOT NULL as has_access_token, 
           refresh_token IS NOT NULL as has_refresh_token,
           expiry_date
    FROM youtube_tokens
  `, [], (err, tokens) => {
    if (err) {
      console.error('Error checking YouTube tokens:', err);
    } else if (tokens.length === 0) {
      console.log('No YouTube tokens found in database.');
    } else {
      console.log(`\nYouTube tokens found for ${tokens.length} user(s):`);
      tokens.forEach((token, index) => {
        console.log(`${index + 1}. User ID: ${token.user_id}`);
        console.log(`   Has Access Token: ${token.has_access_token ? 'YES' : 'NO'}`);
        console.log(`   Has Refresh Token: ${token.has_refresh_token ? 'YES' : 'NO'}`);
        console.log(`   Expiry Date: ${token.expiry_date || 'N/A'}`);
        console.log('');
      });
    }
    
    db.close();
  });
});
