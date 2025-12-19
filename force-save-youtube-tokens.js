const { db } = require('./db/database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Checking sessions for YouTube tokens...\n');

// Open sessions database
const sessionsDb = new sqlite3.Database(path.join(__dirname, 'db', 'sessions.db'), (err) => {
  if (err) {
    console.error('Error opening sessions database:', err);
    process.exit(1);
  }
});

// Get all sessions
sessionsDb.all('SELECT * FROM sessions', [], (err, sessions) => {
  if (err) {
    console.error('Error reading sessions:', err);
    process.exit(1);
  }
  
  console.log(`Found ${sessions.length} session(s)\n`);
  
  let savedCount = 0;
  
  sessions.forEach((session, index) => {
    try {
      // Parse session data
      const sessionData = JSON.parse(session.sess);
      
      if (sessionData.youtubeTokens && sessionData.userId) {
        const userId = sessionData.userId;
        const tokens = sessionData.youtubeTokens;
        
        console.log(`Session ${index + 1}:`);
        console.log(`  User ID: ${userId}`);
        console.log(`  Has Access Token: ${!!tokens.access_token}`);
        console.log(`  Has Refresh Token: ${!!tokens.refresh_token}`);
        console.log(`  Expiry: ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'}`);
        
        // Save to database
        const expiry = tokens.expiry_date || null;
        db.run(`INSERT INTO youtube_tokens(user_id, access_token, refresh_token, expiry_date)
                VALUES(?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                  access_token=excluded.access_token,
                  refresh_token=COALESCE(excluded.refresh_token, youtube_tokens.refresh_token),
                  expiry_date=excluded.expiry_date,
                  updated_at=CURRENT_TIMESTAMP`,
          [userId, tokens.access_token || null, tokens.refresh_token || null, expiry],
          (err) => {
            if (err) {
              console.error(`  ❌ Failed to save: ${err.message}`);
            } else {
              console.log(`  ✓ Tokens saved to database!`);
              savedCount++;
            }
            
            // Close DB after last session
            if (index === sessions.length - 1) {
              console.log(`\n✓ Completed! Saved ${savedCount} token(s) to database.`);
              sessionsDb.close();
              db.close();
            }
          }
        );
      } else {
        console.log(`Session ${index + 1}: No YouTube tokens found`);
        
        // Close DB after last session
        if (index === sessions.length - 1 && savedCount === 0) {
          console.log('\nNo YouTube tokens found in any session.');
          sessionsDb.close();
          db.close();
        }
      }
    } catch (parseError) {
      console.error(`Session ${index + 1}: Failed to parse - ${parseError.message}`);
      
      // Close DB after last session
      if (index === sessions.length - 1 && savedCount === 0) {
        console.log('\nNo valid sessions found.');
        sessionsDb.close();
        db.close();
      }
    }
  });
  
  if (sessions.length === 0) {
    console.log('No sessions found.');
    sessionsDb.close();
    db.close();
  }
});
