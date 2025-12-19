const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Check sessions.db
const sessionsDb = new sqlite3.Database(path.join(__dirname, 'sessions.db'), (err) => {
  if (err) {
    console.error('Error opening sessions.db:', err);
    process.exit(1);
  }
  console.log('\n=== Checking Active Sessions ===\n');
});

sessionsDb.all('SELECT * FROM sessions', [], (err, sessions) => {
  if (err) {
    console.error('Error reading sessions:', err);
    process.exit(1);
  }
  
  console.log(`Found ${sessions.length} active session(s):\n`);
  
  if (sessions.length === 0) {
    console.log('❌ No active sessions found');
    console.log('\nPossible reasons:');
    console.log('1. You are not logged in');
    console.log('2. Session expired');
    console.log('3. Wrong sessions.db file');
    sessionsDb.close();
    process.exit(0);
  }
  
  sessions.forEach((s, i) => {
    console.log(`Session ${i + 1}:`);
    console.log(`  Session ID: ${s.sid}`);
    console.log(`  Expires: ${new Date(s.expired).toISOString()}`);
    
    try {
      const sessionData = JSON.parse(s.sess);
      console.log(`  User ID: ${sessionData.userId || 'not set'}`);
      console.log(`  Username: ${sessionData.username || 'not set'}`);
      console.log(`  Email: ${sessionData.email || 'not set'}`);
      console.log(`  Role: ${sessionData.user_role || 'not set'}`);
      console.log(`  Has YouTube Tokens: ${!!sessionData.youtubeTokens}`);
      
      if (sessionData.youtubeTokens) {
        console.log(`  YouTube Access Token: ${sessionData.youtubeTokens.access_token ? 'present' : 'missing'}`);
        console.log(`  YouTube Refresh Token: ${sessionData.youtubeTokens.refresh_token ? 'present' : 'missing'}`);
      }
    } catch (e) {
      console.log(`  Error parsing session data: ${e.message}`);
    }
    console.log('');
  });
  
  sessionsDb.close();
  
  // Now check users table
  const { db } = require('./db/database');
  
  console.log('\n=== Checking Users Table ===\n');
  
  db.all('SELECT id, username, email, user_role FROM users', [], (err2, users) => {
    if (err2) {
      console.error('Error reading users:', err2);
      process.exit(1);
    }
    
    console.log(`Found ${users.length} user(s) in database:\n`);
    users.forEach(u => {
      console.log(`- ${u.username} (${u.user_role})`);
      console.log(`  ID: ${u.id}`);
      console.log(`  Email: ${u.email || 'not set'}`);
    });
    
    // Check if session user IDs match database user IDs
    console.log('\n=== Session vs Database Match ===\n');
    sessions.forEach((s, i) => {
      try {
        const sessionData = JSON.parse(s.sess);
        const userId = sessionData.userId;
        const user = users.find(u => u.id === userId);
        
        if (user) {
          console.log(`✓ Session ${i + 1} matches user: ${user.username}`);
        } else {
          console.log(`❌ Session ${i + 1} user ID ${userId} NOT FOUND in database!`);
        }
      } catch (e) {
        console.log(`❌ Session ${i + 1} has invalid data`);
      }
    });
    
    process.exit(0);
  });
});
