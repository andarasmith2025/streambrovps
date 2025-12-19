const { db } = require('./db/database');

console.log('Checking user YouTube API credentials...\n');

db.all(`
  SELECT id, username, 
         youtube_client_id IS NOT NULL as has_client_id,
         youtube_client_secret IS NOT NULL as has_client_secret,
         youtube_redirect_uri
  FROM users
`, [], (err, users) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
  
  console.log(`Found ${users.length} user(s):\n`);
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. User: ${user.username} (ID: ${user.id})`);
    console.log(`   Has Client ID: ${user.has_client_id ? 'YES' : 'NO'}`);
    console.log(`   Has Client Secret: ${user.has_client_secret ? 'YES' : 'NO'}`);
    console.log(`   Redirect URI: ${user.youtube_redirect_uri || 'NOT SET'}`);
    console.log('');
  });
  
  db.close();
});
