const { db } = require('./db/database');

console.log('Checking users OAuth configuration...\n');

db.all(
  `SELECT 
    id, 
    username,
    CASE WHEN youtube_client_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_client_id,
    CASE WHEN youtube_client_secret IS NOT NULL THEN 'YES' ELSE 'NO' END as has_client_secret,
    CASE WHEN youtube_redirect_uri IS NOT NULL THEN 'YES' ELSE 'NO' END as has_redirect_uri
   FROM users`,
  (err, users) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    console.log(`Found ${users.length} user(s):\n`);

    users.forEach((u, idx) => {
      const hasFullConfig = u.has_client_id === 'YES' && u.has_client_secret === 'YES' && u.has_redirect_uri === 'YES';
      
      console.log(`${idx + 1}. ${u.username}`);
      console.log(`   User ID: ${u.id}`);
      console.log(`   Has Client ID: ${u.has_client_id}`);
      console.log(`   Has Client Secret: ${u.has_client_secret}`);
      console.log(`   Has Redirect URI: ${u.has_redirect_uri}`);
      console.log(`   OAuth Config: ${hasFullConfig ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
      console.log('');
    });

    const usersWithoutConfig = users.filter(u => u.has_client_id === 'NO' || u.has_client_secret === 'NO');
    
    if (usersWithoutConfig.length > 0) {
      console.log('⚠️  WARNING:');
      console.log(`${usersWithoutConfig.length} user(s) without OAuth configuration will use fallback from .env`);
      console.log('This means they share your API quota!');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('Each user should setup their own OAuth credentials via user settings');
    }

    process.exit(0);
  }
);
