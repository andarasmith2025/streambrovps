const { db } = require('./db/database');

console.log('Checking active streams...\n');

db.all(`
  SELECT id, title, status, use_youtube_api, youtube_broadcast_id, 
         platform, user_id, created_at
  FROM streams 
  WHERE status = 'live' OR status = 'scheduled'
  ORDER BY created_at DESC
  LIMIT 10
`, [], (err, streams) => {
  if (err) {
    console.error('Error querying streams:', err);
    process.exit(1);
  }
  
  if (streams.length === 0) {
    console.log('No active or scheduled streams found.');
  } else {
    console.log(`Found ${streams.length} active/scheduled stream(s):\n`);
    
    streams.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   ID: ${stream.id}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Platform: ${stream.platform}`);
      console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
      console.log(`   YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`   User ID: ${stream.user_id}`);
      console.log(`   Created: ${stream.created_at}`);
      console.log('');
    });
  }
  
  // Also check youtube_tokens
  db.all(`
    SELECT user_id, 
           access_token IS NOT NULL as has_access_token,
           refresh_token IS NOT NULL as has_refresh_token,
           expiry_date
    FROM youtube_tokens
  `, [], (err, tokens) => {
    if (err) {
      console.error('Error checking tokens:', err);
    } else {
      console.log(`\nYouTube Tokens in database: ${tokens.length}`);
      tokens.forEach((token, index) => {
        console.log(`${index + 1}. User ID: ${token.user_id}`);
        console.log(`   Has Access Token: ${token.has_access_token ? 'YES' : 'NO'}`);
        console.log(`   Has Refresh Token: ${token.has_refresh_token ? 'YES' : 'NO'}`);
        const expiry = token.expiry_date ? new Date(token.expiry_date) : null;
        const isExpired = expiry && expiry < new Date();
        console.log(`   Expiry: ${expiry ? expiry.toISOString() : 'N/A'} ${isExpired ? '(EXPIRED)' : ''}`);
        console.log('');
      });
    }
    
    db.close();
  });
});
