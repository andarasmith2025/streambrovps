const { db } = require('./db/database');

console.log('\n=== Checking Admin User ===\n');

// Check all users
db.all('SELECT * FROM users', [], (err, users) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${users.length} user(s):\n`);
  users.forEach(u => {
    console.log(`- Username: ${u.username}`);
    console.log(`  ID: ${u.id}`);
    console.log(`  Email: ${u.email || 'not set'}`);
    console.log(`  Role: ${u.user_role}`);
    console.log(`  Has YouTube Client ID: ${!!u.youtube_client_id}`);
    console.log('');
  });
  
  // Check YouTube tokens
  db.all(
    `SELECT yt.*, u.username 
     FROM youtube_tokens yt 
     JOIN users u ON yt.user_id = u.id`,
    [],
    (err2, tokens) => {
      if (err2) {
        console.error('Error checking tokens:', err2);
        process.exit(1);
      }
      
      console.log(`\nYouTube Tokens: ${tokens.length} user(s) connected\n`);
      
      if (tokens.length === 0) {
        console.log('❌ No users have connected YouTube yet');
        console.log('\nTo connect YouTube:');
        console.log('1. Login to dashboard');
        console.log('2. Click "Connect YouTube" button');
        console.log('3. Authorize with your YouTube account');
      } else {
        tokens.forEach(t => {
          console.log(`- User: ${t.username}`);
          console.log(`  Access Token: ${t.access_token ? t.access_token.substring(0, 20) + '...' : 'null'}`);
          console.log(`  Refresh Token: ${t.refresh_token ? 'present' : 'null'}`);
          
          if (t.expiry_date) {
            const now = Date.now();
            const expiry = Number(t.expiry_date);
            const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
            
            if (minutesUntilExpiry < 0) {
              console.log(`  Status: ⚠️  EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
            } else {
              console.log(`  Status: ✓ Valid (expires in ${minutesUntilExpiry} minutes)`);
            }
          }
          console.log('');
        });
      }
      
      process.exit(0);
    }
  );
});
