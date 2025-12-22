/**
 * Script untuk testing Auto-Refresh Token YouTube
 * Menguji apakah event listener 'tokens' berfungsi dengan baik
 */

const tokenManager = require('./services/youtubeTokenManager');
const { db } = require('./db/database');
require('dotenv').config();

async function testAutoRefresh() {
  console.log('='.repeat(60));
  console.log('🧪 Testing YouTube Token Auto-Refresh');
  console.log('='.repeat(60));

  // Ambil user pertama dari database
  db.get('SELECT id, username FROM users LIMIT 1', [], async (err, user) => {
    if (err || !user) {
      console.error('❌ Error: Tidak ada user di database');
      process.exit(1);
    }

    console.log(`\n👤 Testing dengan user: ${user.username} (${user.id})`);

    try {
      // 1. Cek token di database
      console.log('\n📊 Step 1: Checking tokens in database...');
      const tokens = await tokenManager.getTokensFromDB(user.id);
      
      if (!tokens) {
        console.error('❌ Token tidak ditemukan di database');
        console.log('\n💡 Silakan login terlebih dahulu melalui aplikasi web');
        process.exit(1);
      }

      console.log('✅ Token ditemukan:');
      console.log(`   - Access Token: ${tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'N/A'}`);
      console.log(`   - Refresh Token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'N/A'}`);
      
      const expiryDate = new Date(tokens.expiry_date);
      const now = new Date();
      const isExpired = expiryDate < now;
      
      console.log(`   - Expiry Date: ${expiryDate.toLocaleString()}`);
      console.log(`   - Status: ${isExpired ? '⚠️ EXPIRED' : '✅ VALID'}`);

      // 2. Inisialisasi client dengan auto-refresh
      console.log('\n🔧 Step 2: Initializing OAuth2 client with auto-refresh...');
      const client = await tokenManager.initializeClient(user.id);
      
      if (!client) {
        console.error('❌ Failed to initialize client');
        process.exit(1);
      }

      console.log('✅ Client initialized with event listener');

      // 3. Test API call (akan trigger auto-refresh jika token expired)
      console.log('\n🎬 Step 3: Testing YouTube API call...');
      console.log('   (This will auto-refresh token if expired)');
      
      const youtube = await tokenManager.getYouTubeClient(user.id);
      
      console.log('\n📡 Calling YouTube API: channels.list...');
      const response = await youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        mine: true
      });

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        console.log('\n✅ Berhasil terhubung ke YouTube Channel:');
        console.log(`   - Channel: ${channel.snippet.title}`);
        console.log(`   - Subscribers: ${channel.statistics.subscriberCount}`);
        console.log(`   - Videos: ${channel.statistics.videoCount}`);
        console.log(`   - Views: ${channel.statistics.viewCount}`);
      }

      // 4. Cek token setelah API call
      console.log('\n📊 Step 4: Checking tokens after API call...');
      const tokensAfter = await tokenManager.getTokensFromDB(user.id);
      
      const expiryAfter = new Date(tokensAfter.expiry_date);
      console.log(`   - New Expiry Date: ${expiryAfter.toLocaleString()}`);
      
      if (tokensAfter.expiry_date !== tokens.expiry_date) {
        console.log('✅ Token was auto-refreshed and saved to database!');
      } else {
        console.log('ℹ️ Token was still valid, no refresh needed');
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ Test completed successfully!');
      console.log('='.repeat(60));
      console.log('\n💡 Event listener is working. Token will auto-refresh when needed.');
      
      process.exit(0);

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      
      if (error.message && error.message.includes('deleted_client')) {
        console.log('\n⚠️ DELETED CLIENT ERROR detected!');
        console.log('💡 Solusi: User perlu re-authenticate dengan prompt=consent');
        console.log('\nJalankan script ini untuk generate URL baru:');
        console.log(`   node generate-reauth-url.js ${user.id}`);
      }
      
      process.exit(1);
    }
  });
}

// Run test
testAutoRefresh();
