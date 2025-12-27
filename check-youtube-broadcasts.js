const youtubeService = require('./services/youtubeService');
const { getTokensForUser } = require('./routes/youtube');

async function checkBroadcasts() {
  console.log('=== Checking YouTube Broadcasts for WidiWays ===\n');
  
  try {
    // Get tokens for WidiWays channel
    const channelId = 'UC-bgj2tX3FLGV67q6SiZBJA';
    const userId = 'f4e0e7f8-e4c8-4c5e-8e4e-8e4e8e4e8e4e'; // Replace with actual user ID
    
    // For testing, we'll use the first user's tokens
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('db/streambro.db');
    
    db.get('SELECT id FROM users LIMIT 1', [], async (err, user) => {
      if (err || !user) {
        console.error('Error getting user:', err);
        db.close();
        return;
      }
      
      const tokens = await getTokensForUser(user.id, channelId);
      
      if (!tokens || !tokens.access_token) {
        console.error('No tokens found for channel');
        db.close();
        return;
      }
      
      console.log('✅ Got tokens for channel\n');
      
      // List all broadcasts
      const broadcasts = await youtubeService.listBroadcasts(tokens);
      
      console.log(`Found ${broadcasts.length} broadcast(s):\n`);
      
      broadcasts.forEach((broadcast, idx) => {
        console.log(`[${idx + 1}] ${broadcast.snippet.title}`);
        console.log(`    ID: ${broadcast.id}`);
        console.log(`    Status: ${broadcast.status.lifeCycleStatus}`);
        console.log(`    Privacy: ${broadcast.status.privacyStatus}`);
        console.log(`    Scheduled: ${broadcast.snippet.scheduledStartTime || 'NOT SET'}`);
        console.log(`    Thumbnail: ${broadcast.snippet.thumbnails?.default?.url ? 'YES' : 'NO'}`);
        console.log('');
      });
      
      db.close();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBroadcasts();
