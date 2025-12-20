const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const sessionsDbPath = path.join(__dirname, 'sessions.db');
const db = new sqlite3.Database(sessionsDbPath);

console.log('\n=== Checking Sessions Database ===\n');
console.log('Database path:', sessionsDbPath);

// Check all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log('\nTables:', tables.map(t => t.name).join(', '));
  
  // Check sessions table
  db.all("SELECT * FROM sessions ORDER BY expired DESC LIMIT 5", (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    console.log(`\nFound ${rows.length} session(s) (showing last 5):\n`);
    
    rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Session ID: ${row.sid}`);
      console.log(`   Expired: ${new Date(row.expired).toISOString()}`);
      
      try {
        const sess = JSON.parse(row.sess);
        console.log(`   User ID: ${sess.userId || sess.user_id || 'N/A'}`);
        console.log(`   Username: ${sess.username || 'N/A'}`);
        console.log(`   Has YouTube Tokens: ${!!sess.youtubeTokens}`);
        
        if (sess.youtubeTokens) {
          console.log(`   - Has access_token: ${!!sess.youtubeTokens.access_token}`);
          console.log(`   - Has refresh_token: ${!!sess.youtubeTokens.refresh_token}`);
          
          if (sess.youtubeTokens.expiry_date) {
            const now = Date.now();
            const expiry = Number(sess.youtubeTokens.expiry_date);
            const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
            
            if (minutesUntilExpiry < 0) {
              console.log(`   - Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
            } else {
              console.log(`   - Token valid (expires in ${minutesUntilExpiry} minutes)`);
            }
          }
        }
        
        if (sess.youtubeChannel) {
          console.log(`   YouTube Channel: ${sess.youtubeChannel.title || 'N/A'}`);
        }
      } catch (e) {
        console.log(`   Error parsing session data: ${e.message}`);
      }
      
      console.log('');
    });
    
    db.close();
  });
});
