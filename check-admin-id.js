const { db } = require('./db/database');

const adminId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';

console.log('\n=== Checking Admin User ===\n');
console.log(`Looking for user ID: ${adminId}\n`);

// Check if this user exists
db.get('SELECT * FROM users WHERE id = ?', [adminId], (err, user) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!user) {
    console.log('❌ User with this ID NOT FOUND in database!\n');
    
    // Show all users
    db.all('SELECT id, username, email, user_role FROM users', [], (err2, users) => {
      if (err2) {
        console.error('Error listing users:', err2);
        process.exit(1);
      }
      
      console.log(`Database has ${users.length} user(s):\n`);
      users.forEach((u, i) => {
        console.log(`${i + 1}. Username: ${u.username}`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Email: ${u.email || 'not set'}`);
        console.log(`   Role: ${u.user_role}`);
        console.log('');
      });
      
      console.log('⚠️  PROBLEM: Your session has user ID that does not exist in database!');
      console.log('\nPossible causes:');
      console.log('1. Database was restored from backup (old user IDs)');
      console.log('2. User was deleted but session still active');
      console.log('3. Wrong database file being used');
      console.log('\nSOLUTION:');
      console.log('1. Logout and login again');
      console.log('2. Or clear browser cookies');
      console.log('3. Or use one of the existing usernames above to login');
      
      process.exit(0);
    });
  } else {
    console.log('✓ User found in database:\n');
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email || 'not set'}`);
    console.log(`Role: ${user.user_role}`);
    console.log(`Has YouTube Client ID: ${!!user.youtube_client_id}`);
    
    // Check YouTube tokens
    db.get('SELECT * FROM youtube_tokens WHERE user_id = ?', [adminId], (err3, tokens) => {
      if (err3) {
        console.error('Error checking tokens:', err3);
        process.exit(1);
      }
      
      console.log(`\nYouTube Connection: ${tokens ? '✓ Connected' : '❌ Not connected'}`);
      
      if (tokens) {
        console.log(`Access Token: ${tokens.access_token ? 'present' : 'missing'}`);
        console.log(`Refresh Token: ${tokens.refresh_token ? 'present' : 'missing'}`);
        
        if (tokens.expiry_date) {
          const now = Date.now();
          const expiry = Number(tokens.expiry_date);
          const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
          
          if (minutesUntilExpiry < 0) {
            console.log(`Status: ⚠️  EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
          } else {
            console.log(`Status: ✓ Valid (expires in ${minutesUntilExpiry} minutes)`);
          }
        }
      } else {
        console.log('\nTo connect YouTube:');
        console.log('1. Go to dashboard');
        console.log('2. Click "Connect YouTube" button');
        console.log('3. Authorize with your YouTube account');
      }
      
      process.exit(0);
    });
  }
});
