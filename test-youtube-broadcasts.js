const { db } = require('./db/database');
const { getTokensForUser } = require('./routes/youtube');
const youtubeService = require('./services/youtubeService');

async function testYouTubeBroadcasts() {
  console.log('\n=== Testing YouTube Broadcasts API ===\n');
  
  try {
    // Get first user with YouTube tokens
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.username, u.youtube_client_id, 
                yt.access_token, yt.refresh_token, yt.expiry_date
         FROM users u
         JOIN youtube_tokens yt ON u.id = yt.user_id
         LIMIT 1`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!user) {
      console.log('❌ No user with YouTube tokens found');
      process.exit(1);
    }
    
    console.log(`✓ Found user: ${user.username} (ID: ${user.id})`);
    console.log(`  Has client_id: ${!!user.youtube_client_id}`);
    console.log(`  Has access_token: ${!!user.access_token}`);
    console.log(`  Has refresh_token: ${!!user.refresh_token}`);
    
    // Check token expiry
    if (user.expiry_date) {
      const now = Date.now();
      const expiry = Number(user.expiry_date);
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      
      if (minutesUntilExpiry < 0) {
        console.log(`  ⚠️  Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
      } else {
        console.log(`  ✓ Token valid (expires in ${minutesUntilExpiry} minutes)`);
      }
    }
    
    console.log('\n--- Testing getTokensForUser (with auto-refresh) ---');
    const tokens = await getTokensForUser(user.id);
    
    if (!tokens) {
      console.log('❌ Failed to get tokens');
      process.exit(1);
    }
    
    console.log('✓ Got tokens from getTokensForUser');
    console.log(`  Access token: ${tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'null'}`);
    console.log(`  Refresh token: ${tokens.refresh_token ? 'present' : 'null'}`);
    console.log(`  Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'null'}`);
    
    console.log('\n--- Testing YouTube API: listBroadcasts ---');
    const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 10 });
    
    console.log(`✓ Got ${broadcasts.length} broadcasts`);
    
    if (broadcasts.length > 0) {
      console.log('\nFirst 3 broadcasts:');
      broadcasts.slice(0, 3).forEach((b, i) => {
        console.log(`\n${i + 1}. ${b.snippet?.title || 'Untitled'}`);
        console.log(`   ID: ${b.id}`);
        console.log(`   Status: ${b.status?.lifeCycleStatus || 'unknown'}`);
        console.log(`   Privacy: ${b.status?.privacyStatus || 'unknown'}`);
        console.log(`   Scheduled: ${b.snippet?.scheduledStartTime || 'not set'}`);
      });
    }
    
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response?.data) {
      console.error('\nAPI Error Details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run test
testYouTubeBroadcasts();
