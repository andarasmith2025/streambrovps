const db = require('./db/database');

console.log('=== Checking YouTube Token Health ===\n');

// Get all users with YouTube tokens
db.all(`
  SELECT 
    u.id,
    u.username,
    u.youtube_channel_id,
    u.youtube_channel_title,
    u.youtube_access_token,
    u.youtube_refresh_token,
    u.youtube_token_expiry
  FROM users u
  WHERE u.youtube_access_token IS NOT NULL
`, [], (err, users) => {
  if (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }

  if (users.length === 0) {
    console.log('❌ No users with YouTube tokens found');
    process.exit(0);
  }

  console.log(`Found ${users.length} user(s) with YouTube tokens:\n`);

  users.forEach((user, idx) => {
    console.log(`${idx + 1}. User: ${user.username} (${user.id})`);
    console.log(`   Channel: ${user.youtube_channel_title || 'N/A'}`);
    console.log(`   Channel ID: ${user.youtube_channel_id || 'N/A'}`);
    
    const expiry = user.youtube_token_expiry ? new Date(user.youtube_token_expiry) : null;
    const now = new Date();
    
    if (expiry) {
      const minutesUntilExpiry = Math.floor((expiry - now) / 1000 / 60);
      if (minutesUntilExpiry < 0) {
        console.log(`   Token Status: ⚠️  EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
      } else if (minutesUntilExpiry < 5) {
        console.log(`   Token Status: ⚠️  Expiring in ${minutesUntilExpiry} minutes`);
      } else {
        console.log(`   Token Status: ✅ Valid (expires in ${minutesUntilExpiry} minutes)`);
      }
    } else {
      console.log(`   Token Status: ❌ No expiry date`);
    }
    
    console.log(`   Access Token: ${user.youtube_access_token ? user.youtube_access_token.substring(0, 20) + '...' : 'N/A'}`);
    console.log(`   Refresh Token: ${user.youtube_refresh_token ? 'Present' : 'Missing'}`);
    console.log('');
  });

  console.log('\n=== Recommendation ===');
  console.log('If you see "deleted_client" errors in logs:');
  console.log('1. Go to dashboard');
  console.log('2. Click "Disconnect" YouTube');
  console.log('3. Click "Connect YouTube" again');
  console.log('4. This will create a new token with valid OAuth Client ID');
  
  db.close();
});
