const { getYouTubeClient } = require('./config/google');

console.log('Testing OAuth configuration...\n');

// Test 1: Check environment variables
console.log('1. Environment Variables:');
console.log(`   GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET (length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : 'NOT SET'}`);
console.log(`   GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
console.log(`   GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'NOT SET'}`);
console.log('');

// Test 2: Check user credentials in database
const { db } = require('./db/database');

db.get(`
  SELECT id, username, 
         youtube_client_id, 
         youtube_client_secret, 
         youtube_redirect_uri
  FROM users 
  WHERE youtube_client_id IS NOT NULL
  LIMIT 1
`, [], (err, user) => {
  if (err) {
    console.error('Error querying user:', err);
    process.exit(1);
  }
  
  console.log('2. User-specific Credentials:');
  if (user) {
    console.log(`   User: ${user.username} (${user.id})`);
    console.log(`   Client ID: ${user.youtube_client_id ? 'SET (length: ' + user.youtube_client_id.length + ')' : 'NOT SET'}`);
    console.log(`   Client Secret: ${user.youtube_client_secret ? 'SET' : 'NOT SET'}`);
    console.log(`   Redirect URI: ${user.youtube_redirect_uri || 'NOT SET'}`);
  } else {
    console.log('   No user with YouTube credentials found');
  }
  console.log('');
  
  // Test 3: Generate OAuth URL
  console.log('3. OAuth URL Generation:');
  try {
    const { google } = require('googleapis');
    
    // Use user credentials if available, otherwise use env
    const clientId = user?.youtube_client_id || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = user?.youtube_client_secret || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = user?.youtube_redirect_uri || process.env.GOOGLE_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.log('   ❌ Missing credentials - cannot generate OAuth URL');
      db.close();
      return;
    }
    
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube.readonly'
      ],
      state: 'test-state-123'
    });
    
    console.log('   ✓ OAuth URL generated successfully');
    console.log(`   URL: ${authUrl.substring(0, 100)}...`);
    console.log('');
    console.log('4. Next Steps:');
    console.log('   - Copy the OAuth URL above');
    console.log('   - Open it in browser');
    console.log('   - Click "Allow"');
    console.log('   - Check if redirect works');
    console.log('   - Check server logs for callback');
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  db.close();
});
