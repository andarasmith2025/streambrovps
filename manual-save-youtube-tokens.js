const { db } = require('./db/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Manual YouTube Token Saver ===\n');
console.log('This script will help you manually save YouTube tokens to database.\n');
console.log('To get your tokens:');
console.log('1. Open https://streambro.nivarastudio.site in browser');
console.log('2. Login and connect YouTube');
console.log('3. Open browser DevTools (F12)');
console.log('4. Go to Console tab');
console.log('5. Type: sessionStorage');
console.log('6. Or check Application → Cookies → session cookie\n');
console.log('---\n');

// Get user ID first
db.get(`SELECT id, username FROM users WHERE youtube_client_id IS NOT NULL LIMIT 1`, (err, user) => {
  if (err || !user) {
    console.error('Error: No user with YouTube credentials found');
    process.exit(1);
  }
  
  console.log(`Found user: ${user.username} (${user.id})\n`);
  
  rl.question('Do you want to use this user? (y/n): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Cancelled');
      process.exit(0);
    }
    
    rl.question('\nPaste access_token: ', (accessToken) => {
      if (!accessToken || accessToken.trim() === '') {
        console.log('Error: access_token is required');
        process.exit(1);
      }
      
      rl.question('Paste refresh_token (or press Enter to skip): ', (refreshToken) => {
        rl.question('Enter expiry timestamp in milliseconds (or press Enter for 1 hour from now): ', (expiryInput) => {
          
          let expiry;
          if (expiryInput && expiryInput.trim() !== '') {
            expiry = parseInt(expiryInput);
          } else {
            // Default: 1 hour from now
            expiry = Date.now() + (60 * 60 * 1000);
          }
          
          console.log('\n=== Saving tokens ===');
          console.log(`User ID: ${user.id}`);
          console.log(`Access Token: ${accessToken.substring(0, 20)}...`);
          console.log(`Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'NOT PROVIDED'}`);
          console.log(`Expiry: ${new Date(expiry).toISOString()}`);
          console.log('');
          
          db.run(`INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date)
                  VALUES(?, ?, ?, ?)
                  ON CONFLICT(user_id) DO UPDATE SET
                    access_token=excluded.access_token,
                    refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
                    expiry_date=excluded.expiry_date,
                    updated_at=CURRENT_TIMESTAMP`,
            [user.id, accessToken.trim(), refreshToken ? refreshToken.trim() : null, expiry],
            (saveErr) => {
              if (saveErr) {
                console.error('❌ Failed to save tokens:', saveErr.message);
                process.exit(1);
              } else {
                console.log('✅ Tokens saved successfully!');
                console.log('\nYou can now use YouTube API features.');
                console.log('Run: node test-youtube-connection-detailed.js to verify');
                rl.close();
                db.close();
                process.exit(0);
              }
            }
          );
        });
      });
    });
  });
});
