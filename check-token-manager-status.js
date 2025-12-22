/**
 * Script untuk memeriksa status Token Manager
 * Menampilkan informasi tentang tokens dan active clients
 */

const tokenManager = require('./services/youtubeTokenManager');
const { db } = require('./db/database');
require('dotenv').config();

async function checkStatus() {
  console.log('='.repeat(70));
  console.log('📊 YouTube Token Manager Status');
  console.log('='.repeat(70));

  // 1. Check all users with tokens
  db.all(`
    SELECT 
      u.id,
      u.username,
      u.user_role,
      u.status,
      yt.access_token,
      yt.refresh_token,
      yt.expiry_date,
      datetime(yt.expiry_date/1000, 'unixepoch', 'localtime') as expires_at,
      datetime(yt.updated_at, 'localtime') as last_updated
    FROM users u
    LEFT JOIN youtube_tokens yt ON u.id = yt.user_id
    ORDER BY u.created_at
  `, [], async (err, users) => {
    if (err) {
      console.error('❌ Database error:', err);
      process.exit(1);
    }

    console.log(`\n👥 Total Users: ${users.length}`);
    console.log('─'.repeat(70));

    for (const user of users) {
      console.log(`\n📌 User: ${user.username} (${user.id})`);
      console.log(`   Role: ${user.user_role} | Status: ${user.status}`);
      
      if (!user.access_token) {
        console.log('   ⚠️ No YouTube tokens found');
        continue;
      }

      // Check token validity
      const now = Date.now();
      const expiry = user.expiry_date;
      const isExpired = expiry < now;
      const timeLeft = expiry - now;
      const minutesLeft = Math.floor(timeLeft / 1000 / 60);

      console.log(`   Token Status:`);
      console.log(`   - Access Token: ${user.access_token.substring(0, 20)}...`);
      console.log(`   - Refresh Token: ${user.refresh_token ? user.refresh_token.substring(0, 20) + '...' : '❌ MISSING'}`);
      console.log(`   - Expires At: ${user.expires_at}`);
      console.log(`   - Last Updated: ${user.last_updated}`);
      
      if (isExpired) {
        console.log(`   - Status: ⚠️ EXPIRED (${Math.abs(minutesLeft)} minutes ago)`);
      } else {
        console.log(`   - Status: ✅ VALID (${minutesLeft} minutes left)`);
      }

      // Check if client is active in memory
      const hasActiveClient = tokenManager.activeClients.has(user.id);
      console.log(`   - Active Client: ${hasActiveClient ? '✅ YES' : '❌ NO'}`);

      // Test token by trying to get client
      try {
        console.log(`   - Testing token...`);
        const client = await tokenManager.getClient(user.id);
        
        if (client) {
          console.log(`   - Test Result: ✅ Token is working`);
          
          // Try to get channel info
          try {
            const youtube = await tokenManager.getYouTubeClient(user.id);
            const response = await youtube.channels.list({
              part: 'snippet,statistics',
              mine: true
            });
            
            if (response.data.items && response.data.items.length > 0) {
              const channel = response.data.items[0];
              console.log(`   - Channel: ${channel.snippet.title}`);
              console.log(`   - Subscribers: ${channel.statistics.subscriberCount}`);
            }
          } catch (apiError) {
            console.log(`   - API Test: ⚠️ ${apiError.message}`);
          }
        }
      } catch (testError) {
        console.log(`   - Test Result: ❌ ${testError.message}`);
        
        if (testError.message.includes('deleted_client')) {
          console.log(`   - Action Required: Run "node generate-reauth-url.js ${user.id}"`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📈 Summary');
    console.log('='.repeat(70));
    
    const usersWithTokens = users.filter(u => u.access_token).length;
    const usersWithRefreshToken = users.filter(u => u.refresh_token).length;
    const activeClients = tokenManager.activeClients.size;
    
    console.log(`Total Users: ${users.length}`);
    console.log(`Users with Tokens: ${usersWithTokens}`);
    console.log(`Users with Refresh Token: ${usersWithRefreshToken}`);
    console.log(`Active Clients in Memory: ${activeClients}`);
    
    console.log('\n💡 Tips:');
    console.log('   - Jika token expired, akan auto-refresh saat digunakan');
    console.log('   - Jika refresh_token missing, user perlu re-authenticate');
    console.log('   - Active clients akan dibuat on-demand saat API call');
    
    console.log('\n' + '='.repeat(70));
    
    process.exit(0);
  });
}

checkStatus();
