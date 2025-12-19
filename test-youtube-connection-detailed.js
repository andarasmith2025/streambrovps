const { db } = require('./db/database');
const { getYouTubeClient } = require('./config/google');

async function testConnection() {
  console.log('Testing YouTube API connection...\n');
  
  // Get user with credentials
  const user = await new Promise((resolve) => {
    db.get(`SELECT id, username, youtube_client_id, youtube_client_secret, youtube_redirect_uri 
            FROM users 
            WHERE youtube_client_id IS NOT NULL 
            LIMIT 1`, 
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      }
    );
  });
  
  if (!user) {
    console.log('❌ No user with YouTube credentials found');
    process.exit(1);
  }
  
  console.log('User found:', user.username);
  console.log('Client ID:', user.youtube_client_id);
  console.log('Redirect URI:', user.youtube_redirect_uri);
  console.log('');
  
  // Get tokens
  const tokens = await new Promise((resolve) => {
    db.get(`SELECT access_token, refresh_token, expiry_date 
            FROM youtube_tokens 
            WHERE user_id = ?`, 
      [user.id],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          resolve(null);
        } else {
          resolve(row);
        }
      }
    );
  });
  
  if (!tokens) {
    console.log('❌ No tokens found for user');
    console.log('User needs to reconnect YouTube via OAuth');
    process.exit(1);
  }
  
  console.log('Tokens found:');
  console.log('- Access Token:', tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'NULL');
  console.log('- Refresh Token:', tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'NULL');
  console.log('- Expiry:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'NULL');
  console.log('');
  
  // Check if expired
  const now = Date.now();
  const expiry = tokens.expiry_date ? Number(tokens.expiry_date) : 0;
  const isExpired = expiry && now > expiry;
  
  if (isExpired) {
    console.log('⚠️  Token is EXPIRED');
    const minutesAgo = Math.floor((now - expiry) / (60 * 1000));
    console.log(`   Expired ${minutesAgo} minutes ago`);
  } else if (expiry) {
    const minutesUntil = Math.floor((expiry - now) / (60 * 1000));
    console.log(`✓ Token is valid (expires in ${minutesUntil} minutes)`);
  }
  console.log('');
  
  // Prepare tokens object with user credentials
  const tokenObj = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    _userCredentials: {
      client_id: user.youtube_client_id,
      client_secret: user.youtube_client_secret,
      redirect_uri: user.youtube_redirect_uri
    }
  };
  
  // Test API call
  console.log('Testing YouTube API call...');
  try {
    const yt = getYouTubeClient(tokenObj, user.id);
    const response = await yt.channels.list({
      mine: true,
      part: ['snippet', 'statistics']
    });
    
    const channel = response.data.items?.[0];
    if (channel) {
      console.log('✅ SUCCESS! Connected to YouTube');
      console.log('');
      console.log('Channel Info:');
      console.log('- Name:', channel.snippet?.title);
      console.log('- ID:', channel.id);
      console.log('- Subscribers:', channel.statistics?.subscriberCount || 'Hidden');
      console.log('');
    } else {
      console.log('⚠️  API call succeeded but no channel found');
    }
  } catch (error) {
    console.log('❌ API CALL FAILED');
    console.log('');
    console.log('Error Details:');
    console.log('- Message:', error.message);
    
    if (error.response?.data) {
      console.log('- Response:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code) {
      console.log('- Code:', error.code);
    }
    
    console.log('');
    
    // Check for specific errors
    if (error.message.includes('deleted_client')) {
      console.log('🔍 DIAGNOSIS: deleted_client error');
      console.log('');
      console.log('This means the Client ID in Google Cloud Console has been deleted or is invalid.');
      console.log('');
      console.log('SOLUTION:');
      console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials');
      console.log('2. Check if the OAuth 2.0 Client ID still exists');
      console.log('3. If deleted, create a new one');
      console.log('4. Update the credentials in StreamBro settings');
      console.log('5. Reconnect YouTube');
    } else if (error.message.includes('invalid_grant')) {
      console.log('🔍 DIAGNOSIS: invalid_grant error');
      console.log('');
      console.log('This means the refresh token is invalid or revoked.');
      console.log('');
      console.log('SOLUTION:');
      console.log('1. User needs to disconnect and reconnect YouTube');
      console.log('2. This will generate new tokens');
    } else if (error.message.includes('invalid_client')) {
      console.log('🔍 DIAGNOSIS: invalid_client error');
      console.log('');
      console.log('This means the Client ID or Client Secret is incorrect.');
      console.log('');
      console.log('SOLUTION:');
      console.log('1. Verify credentials in Google Cloud Console');
      console.log('2. Update credentials in StreamBro settings');
      console.log('3. Reconnect YouTube');
    }
  }
  
  process.exit(0);
}

testConnection().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
