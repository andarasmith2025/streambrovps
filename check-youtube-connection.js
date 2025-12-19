const { db } = require('./db/database');

console.log('Checking YouTube connection status...\n');

// Check users
db.all(`SELECT id, username FROM users`, [], (err, users) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
  
  console.log(`Found ${users.length} user(s):\n`);
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. User: ${user.username} (ID: ${user.id})`);
    
    // Check if this user has YouTube tokens
    db.get(`
      SELECT access_token IS NOT NULL as has_access_token, 
             refresh_token IS NOT NULL as has_refresh_token,
             expiry_date
      FROM youtube_tokens
      WHERE user_id = ?
    `, [user.id], (err, token) => {
      if (err) {
        console.error(`   Error checking tokens: ${err.message}`);
      } else if (!token) {
        console.log(`   YouTube: NOT CONNECTED`);
      } else {
        console.log(`   YouTube: CONNECTED`);
        console.log(`   - Has Access Token: ${token.has_access_token ? 'YES' : 'NO'}`);
        console.log(`   - Has Refresh Token: ${token.has_refresh_token ? 'YES' : 'NO'}`);
        
        if (token.expiry_date) {
          const expiryDate = new Date(token.expiry_date);
          const now = new Date();
          const isExpired = expiryDate < now;
          console.log(`   - Token Expiry: ${expiryDate.toISOString()} ${isExpired ? '(EXPIRED)' : '(Valid)'}`);
        }
      }
      console.log('');
      
      // Close DB after last user
      if (index === users.length - 1) {
        db.close();
      }
    });
  });
  
  if (users.length === 0) {
    console.log('No users found in database.');
    db.close();
  }
});
