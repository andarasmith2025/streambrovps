const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const sessionsDbPath = path.join(__dirname, 'db', 'sessions.db');
const streambroDbPath = path.join(__dirname, 'db', 'streambro.db');

const sessionsDb = new sqlite3.Database(sessionsDbPath);
const streambroDb = new sqlite3.Database(streambroDbPath);

console.log('\n=== Force Save YouTube Tokens from Session to Database ===\n');

// Get all sessions
sessionsDb.all("SELECT * FROM sessions WHERE expired > datetime('now')", (err, rows) => {
  if (err) {
    console.error('Error:', err);
    sessionsDb.close();
    streambroDb.close();
    return;
  }
  
  console.log(`Found ${rows.length} active session(s)\n`);
  
  let savedCount = 0;
  let processedCount = 0;
  
  rows.forEach((row, idx) => {
    try {
      const sess = JSON.parse(row.sess);
      const userId = sess.userId || sess.user_id;
      const youtubeTokens = sess.youtubeTokens;
      
      console.log(`${idx + 1}. Session: ${row.sid.substring(0, 20)}...`);
      console.log(`   User ID: ${userId || 'N/A'}`);
      console.log(`   Has YouTube Tokens: ${!!youtubeTokens}`);
      
      if (youtubeTokens && userId) {
        console.log(`   - Access Token: ${youtubeTokens.access_token ? 'YES (' + youtubeTokens.access_token.length + ' chars)' : 'NO'}`);
        console.log(`   - Refresh Token: ${youtubeTokens.refresh_token ? 'YES (' + youtubeTokens.refresh_token.length + ' chars)' : 'NO'}`);
        
        if (youtubeTokens.expiry_date) {
          const now = Date.now();
          const expiry = Number(youtubeTokens.expiry_date);
          const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
          
          if (minutesUntilExpiry < 0) {
            console.log(`   - Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
          } else {
            console.log(`   - Token valid (expires in ${minutesUntilExpiry} minutes)`);
          }
        }
        
        // Save to database
        console.log(`   → Saving to database...`);
        
        streambroDb.run(
          `INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date, created_at, updated_at)
           VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id) DO UPDATE SET
             access_token=excluded.access_token,
             refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
             expiry_date=excluded.expiry_date,
             updated_at=CURRENT_TIMESTAMP`,
          [
            userId,
            youtubeTokens.access_token || null,
            youtubeTokens.refresh_token || null,
            youtubeTokens.expiry_date || null
          ],
          function(saveErr) {
            processedCount++;
            
            if (saveErr) {
              console.error(`   ❌ Failed to save:`, saveErr.message);
            } else {
              savedCount++;
              console.log(`   ✅ Saved successfully! (rows affected: ${this.changes})`);
              
              // Verify
              streambroDb.get(
                'SELECT user_id, LENGTH(access_token) as token_len, expiry_date FROM youtube_tokens WHERE user_id = ?',
                [userId],
                (verifyErr, verifyRow) => {
                  if (verifyErr) {
                    console.error(`   ❌ Verification failed:`, verifyErr.message);
                  } else if (verifyRow) {
                    console.log(`   ✅ Verified: Token in database (length: ${verifyRow.token_len})`);
                  } else {
                    console.error(`   ❌ Verification failed: Token not found in database`);
                  }
                  
                  // Close databases when all done
                  if (processedCount === rows.filter(r => {
                    try {
                      const s = JSON.parse(r.sess);
                      return s.youtubeTokens && (s.userId || s.user_id);
                    } catch (e) {
                      return false;
                    }
                  }).length) {
                    console.log(`\n=== Summary ===`);
                    console.log(`Total sessions: ${rows.length}`);
                    console.log(`Tokens saved: ${savedCount}`);
                    
                    sessionsDb.close();
                    streambroDb.close();
                  }
                }
              );
            }
          }
        );
      } else {
        console.log(`   ⚠️  Skipped (no tokens or no user ID)\n`);
      }
      
    } catch (e) {
      console.log(`   Error parsing session: ${e.message}\n`);
    }
  });
  
  if (rows.length === 0 || rows.filter(r => {
    try {
      const s = JSON.parse(r.sess);
      return s.youtubeTokens && (s.userId || s.user_id);
    } catch (e) {
      return false;
    }
  }).length === 0) {
    console.log('\n❌ No sessions with YouTube tokens found');
    console.log('\nPossible reasons:');
    console.log('1. You are not logged in');
    console.log('2. You have not connected YouTube yet');
    console.log('3. Session expired');
    console.log('\nPlease:');
    console.log('1. Login to dashboard');
    console.log('2. Click "Connect YouTube"');
    console.log('3. Authorize with Google');
    console.log('4. Run this script again');
    
    sessionsDb.close();
    streambroDb.close();
  }
});
