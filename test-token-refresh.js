/**
 * Test Script: YouTube Token Auto-Refresh
 * 
 * Simulasi:
 * 1. Set token expiry ke masa lalu (expired)
 * 2. Call getTokensForUser()
 * 3. Verify auto-refresh terjadi
 * 4. Check token baru di database
 */

const db = require('./db/database');
const { getTokensForUser } = require('./routes/youtube');

async function testTokenRefresh() {
  console.log('\n=== YouTube Token Auto-Refresh Test ===\n');
  
  // Get first user with YouTube tokens
  db.get(`
    SELECT yt.user_id, u.username, yt.expiry_date
    FROM youtube_tokens yt
    JOIN users u ON u.id = yt.user_id
    LIMIT 1
  `, async (err, user) => {
    if (err || !user) {
      console.error('❌ No user with YouTube tokens found');
      process.exit(1);
    }
    
    console.log(`Testing with user: ${user.username} (${user.user_id})`);
    console.log(`Current expiry: ${user.expiry_date ? new Date(user.expiry_date).toISOString() : 'NULL'}\n`);
    
    // Step 1: Force expire token (set to 2 hours ago)
    const expiredTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
    console.log('Step 1: Setting token to expired (2 hours ago)...');
    
    db.run(
      `UPDATE youtube_tokens SET expiry_date = ? WHERE user_id = ?`,
      [expiredTime, user.user_id],
      async (updateErr) => {
        if (updateErr) {
          console.error('❌ Failed to update expiry:', updateErr);
          process.exit(1);
        }
        
        console.log('✓ Token set to expired\n');
        
        // Step 2: Call getTokensForUser (should trigger auto-refresh)
        console.log('Step 2: Calling getTokensForUser() - should auto-refresh...\n');
        
        try {
          const tokens = await getTokensForUser(user.user_id);
          
          if (!tokens) {
            console.error('❌ No tokens returned');
            process.exit(1);
          }
          
          console.log('\n✓ Tokens returned:');
          console.log(`  - Has access_token: ${!!tokens.access_token}`);
          console.log(`  - Has refresh_token: ${!!tokens.refresh_token}`);
          console.log(`  - Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'NULL'}`);
          
          // Step 3: Verify token was refreshed
          const now = Date.now();
          const newExpiry = tokens.expiry_date ? Number(tokens.expiry_date) : 0;
          const isStillExpired = newExpiry < now;
          
          console.log('\nStep 3: Verification');
          if (isStillExpired) {
            console.error('❌ Token still expired! Auto-refresh failed.');
            console.error(`   Current time: ${new Date(now).toISOString()}`);
            console.error(`   Token expiry: ${new Date(newExpiry).toISOString()}`);
            process.exit(1);
          } else {
            const minutesValid = Math.floor((newExpiry - now) / (60 * 1000));
            console.log(`✅ SUCCESS! Token refreshed and valid for ${minutesValid} minutes`);
            console.log(`   New expiry: ${new Date(newExpiry).toISOString()}`);
          }
          
          // Step 4: Check database
          console.log('\nStep 4: Checking database...');
          db.get(
            `SELECT expiry_date, updated_at FROM youtube_tokens WHERE user_id = ?`,
            [user.user_id],
            (dbErr, dbRow) => {
              if (dbErr || !dbRow) {
                console.error('❌ Failed to check database');
                process.exit(1);
              }
              
              console.log(`✓ Database updated:`);
              console.log(`  - Expiry: ${new Date(dbRow.expiry_date).toISOString()}`);
              console.log(`  - Updated: ${dbRow.updated_at}`);
              
              console.log('\n=== TEST PASSED ✅ ===\n');
              process.exit(0);
            }
          );
          
        } catch (error) {
          console.error('\n❌ Error during test:', error.message);
          console.error(error.stack);
          process.exit(1);
        }
      }
    );
  });
}

// Run test
testTokenRefresh();
