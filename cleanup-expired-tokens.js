/**
 * Script untuk cleanup dan refresh expired tokens
 * Bisa dijalankan sebagai cron job untuk maintenance
 */

const tokenManager = require('./services/youtubeTokenManager');
const { db } = require('./db/database');
require('dotenv').config();

async function cleanupExpiredTokens() {
  console.log('='.repeat(60));
  console.log('🧹 Cleanup & Refresh Expired Tokens');
  console.log('='.repeat(60));

  // Get all users with tokens
  db.all(`
    SELECT 
      u.id,
      u.username,
      yt.expiry_date,
      datetime(yt.expiry_date/1000, 'unixepoch', 'localtime') as expires_at
    FROM users u
    INNER JOIN youtube_tokens yt ON u.id = yt.user_id
    WHERE yt.access_token IS NOT NULL
    ORDER BY yt.expiry_date ASC
  `, [], async (err, users) => {
    if (err) {
      console.error('❌ Database error:', err);
      process.exit(1);
    }

    console.log(`\n📊 Found ${users.length} users with tokens\n`);

    const now = Date.now();
    let refreshedCount = 0;
    let failedCount = 0;
    let validCount = 0;

    for (const user of users) {
      const isExpired = user.expiry_date < now;
      const timeLeft = user.expiry_date - now;
      const minutesLeft = Math.floor(timeLeft / 1000 / 60);

      console.log(`\n👤 ${user.username} (${user.id})`);
      console.log(`   Expires: ${user.expires_at}`);
      
      if (isExpired) {
        console.log(`   Status: ⚠️ EXPIRED (${Math.abs(minutesLeft)} minutes ago)`);
        console.log(`   Action: Attempting to refresh...`);
        
        try {
          // Try to get client (will trigger refresh if needed)
          const client = await tokenManager.getClient(user.id);
          
          if (client) {
            // Verify by making a simple API call
            const youtube = await tokenManager.getYouTubeClient(user.id);
            await youtube.channels.list({
              part: 'id',
              mine: true,
              maxResults: 1
            });
            
            console.log(`   Result: ✅ Token refreshed successfully`);
            refreshedCount++;
          }
        } catch (error) {
          console.log(`   Result: ❌ Failed - ${error.message}`);
          
          if (error.message.includes('deleted_client')) {
            console.log(`   Action Required: User needs to re-authenticate`);
            console.log(`   Command: node generate-reauth-url.js ${user.id}`);
          }
          
          failedCount++;
        }
      } else {
        console.log(`   Status: ✅ VALID (${minutesLeft} minutes left)`);
        validCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Cleanup Summary');
    console.log('='.repeat(60));
    console.log(`Total Users: ${users.length}`);
    console.log(`Valid Tokens: ${validCount}`);
    console.log(`Refreshed: ${refreshedCount}`);
    console.log(`Failed: ${failedCount}`);
    
    if (failedCount > 0) {
      console.log('\n⚠️ Some tokens failed to refresh.');
      console.log('   Users with failed tokens need to re-authenticate.');
    }
    
    if (refreshedCount > 0) {
      console.log('\n✅ Successfully refreshed expired tokens.');
    }
    
    console.log('\n💡 Tip: Run this script as a cron job for automatic maintenance.');
    console.log('   Example: 0 */6 * * * cd /path/to/streambro && node cleanup-expired-tokens.js');
    
    console.log('\n' + '='.repeat(60));
    
    process.exit(failedCount > 0 ? 1 : 0);
  });
}

cleanupExpiredTokens();
