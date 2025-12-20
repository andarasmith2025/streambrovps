const { db } = require('./db/database');
const { getTokensForUser } = require('./routes/youtube');

async function testTokenRefresh() {
  console.log('=== Testing YouTube Token Refresh ===\n');
  
  try {
    // Get admin user
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, youtube_access_token, youtube_refresh_token, youtube_token_expiry FROM users WHERE username = ?',
        ['Admin'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('User:', user.username);
    console.log('User ID:', user.id);
    console.log('Has Access Token:', !!user.youtube_access_token);
    console.log('Has Refresh Token:', !!user.youtube_refresh_token);
    
    if (!user.youtube_access_token) {
      console.log('\n❌ No YouTube access token found');
      console.log('Please connect YouTube account first');
      return;
    }
    
    // Check token expiry
    const now = Date.now();
    const expiry = user.youtube_token_expiry ? Number(user.youtube_token_expiry) : 0;
    
    if (expiry) {
      const expiryDate = new Date(expiry);
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      
      console.log('\nToken Expiry:', expiryDate.toISOString());
      console.log('Current Time:', new Date(now).toISOString());
      
      if (minutesUntilExpiry < 0) {
        console.log(`⚠️  Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
      } else if (minutesUntilExpiry < 5) {
        console.log(`⚠️  Token expiring soon (${minutesUntilExpiry} minutes)`);
      } else {
        console.log(`✅ Token valid (expires in ${minutesUntilExpiry} minutes)`);
      }
    } else {
      console.log('\n⚠️  No expiry date found');
    }
    
    // Test getTokensForUser (should auto-refresh if expired)
    console.log('\n--- Testing getTokensForUser() ---');
    console.log('This function should auto-refresh expired tokens...\n');
    
    const tokens = await getTokensForUser(user.id);
    
    if (!tokens) {
      console.log('❌ getTokensForUser returned null');
      return;
    }
    
    console.log('✅ getTokensForUser returned tokens');
    console.log('Has Access Token:', !!tokens.access_token);
    console.log('Has Refresh Token:', !!tokens.refresh_token);
    
    if (tokens.expiry_date) {
      const newExpiry = Number(tokens.expiry_date);
      const newExpiryDate = new Date(newExpiry);
      const minutesUntilExpiry = Math.floor((newExpiry - now) / (60 * 1000));
      
      console.log('Token Expiry:', newExpiryDate.toISOString());
      
      if (minutesUntilExpiry < 0) {
        console.log(`❌ Token still EXPIRED (${Math.abs(minutesUntilExpiry)} minutes ago)`);
        console.log('Token refresh may have failed');
      } else {
        console.log(`✅ Token valid (expires in ${minutesUntilExpiry} minutes)`);
        if (minutesUntilExpiry > 50) {
          console.log('✅ Token was likely refreshed (new expiry > 50 minutes)');
        }
      }
    }
    
    // Test YouTube API call
    console.log('\n--- Testing YouTube API Call ---');
    const youtubeService = require('./services/youtubeService');
    
    try {
      console.log('Calling listBroadcasts...');
      const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 5 });
      console.log(`✅ API call successful! Found ${broadcasts.length} broadcast(s)`);
      
      if (broadcasts.length > 0) {
        console.log('\nFirst broadcast:');
        console.log('- ID:', broadcasts[0].id);
        console.log('- Title:', broadcasts[0].snippet?.title);
        console.log('- Status:', broadcasts[0].status?.lifeCycleStatus);
      }
    } catch (apiErr) {
      console.error('❌ API call failed:', apiErr.message);
      if (apiErr.response?.data) {
        console.error('Error details:', JSON.stringify(apiErr.response.data, null, 2));
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
  } finally {
    db.close();
  }
}

testTokenRefresh();
