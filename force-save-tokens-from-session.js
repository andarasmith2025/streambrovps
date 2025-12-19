const { db } = require('./db/database');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

console.log('Force saving YouTube tokens from session to database...\n');

// Get all sessions from session store
const store = new SQLiteStore({ db: 'sessions.db', dir: './' });

// Query sessions table directly
const sqlite3 = require('sqlite3').verbose();
const sessionsDb = new sqlite3.Database('./sessions.db');

sessionsDb.all('SELECT sess, sid FROM sessions', [], (err, rows) => {
  if (err) {
    console.error('Error reading sessions:', err);
    process.exit(1);
  }
  
  console.log(`Found ${rows.length} session(s)\n`);
  
  let savedCount = 0;
  let processedCount = 0;
  
  rows.forEach((row, index) => {
    try {
      const sessionData = JSON.parse(row.sess);
      const userId = sessionData.userId || sessionData.user_id;
      const youtubeTokens = sessionData.youtubeTokens;
      
      if (userId && youtubeTokens && youtubeTokens.access_token) {
        console.log(`Session ${index + 1}:`);
        console.log(`- User ID: ${userId}`);
        console.log(`- Has access_token: ${!!youtubeTokens.access_token}`);
        console.log(`- Has refresh_token: ${!!youtubeTokens.refresh_token}`);
        console.log(`- Expiry: ${youtubeTokens.expiry_date ? new Date(youtubeTokens.expiry_date).toISOString() : 'NULL'}`);
        
        // Save to database
        const expiry = youtubeTokens.expiry_date || null;
        
        db.run(`INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date)
                VALUES(?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                  access_token=excluded.access_token,
                  refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
                  expiry_date=excluded.expiry_date,
                  updated_at=CURRENT_TIMESTAMP`,
          [userId, youtubeTokens.access_token, youtubeTokens.refresh_token || null, expiry],
          (saveErr) => {
            processedCount++;
            
            if (saveErr) {
              console.error(`  ❌ Failed to save:`, saveErr.message);
            } else {
              console.log(`  ✅ Tokens saved to database!`);
              savedCount++;
            }
            
            console.log('');
            
            // Check if all processed
            if (processedCount === rows.filter(r => {
              try {
                const sd = JSON.parse(r.sess);
                return (sd.userId || sd.user_id) && sd.youtubeTokens && sd.youtubeTokens.access_token;
              } catch { return false; }
            }).length) {
              console.log(`\n=== SUMMARY ===`);
              console.log(`Total sessions: ${rows.length}`);
              console.log(`Sessions with YouTube tokens: ${processedCount}`);
              console.log(`Successfully saved: ${savedCount}`);
              
              sessionsDb.close();
              db.close();
              process.exit(0);
            }
          }
        );
      }
    } catch (parseErr) {
      // Skip invalid sessions
    }
  });
  
  // If no valid sessions found
  if (processedCount === 0) {
    console.log('❌ No sessions with YouTube tokens found!');
    console.log('\nThis means:');
    console.log('1. User is not logged in, OR');
    console.log('2. YouTube is not connected in current session, OR');
    console.log('3. Session has expired');
    console.log('\nPlease:');
    console.log('1. Login to StreamBro');
    console.log('2. Connect YouTube (Settings → Test Connection)');
    console.log('3. Run this script again');
    
    sessionsDb.close();
    db.close();
    process.exit(1);
  }
});
