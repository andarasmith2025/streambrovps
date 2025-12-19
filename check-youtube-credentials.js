const { db } = require('./db/database');

console.log('Checking YouTube credentials for all users...\n');

db.all(`
  SELECT id, username, 
         youtube_client_id, 
         youtube_client_secret, 
         youtube_redirect_uri
  FROM users
  ORDER BY id
`, [], (err, users) => {
  if (err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('No users found');
    db.close();
    return;
  }
  
  users.forEach(user => {
    console.log(`User ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Client ID: ${user.youtube_client_id || 'NOT SET'}`);
    console.log(`Client Secret: ${user.youtube_client_secret ? 'SET (hidden)' : 'NOT SET'}`);
    console.log(`Redirect URI: ${user.youtube_redirect_uri || 'NOT SET'}`);
    console.log('---');
  });
  
  db.close();
});
