const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');
const tokenManager = require('./services/youtubeTokenManager');

async function checkBroadcasts() {
  try {
    console.log('=== Checking YouTube Broadcasts ===\n');
    
    // Get admin user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users LIMIT 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!user) {
      console.log('❌ No admin user found');
      return;
    }
    
    console.log(`✓ Found user: ${user.username} (${user.id})\n`);
    
    // Get OAuth client
    const oauth2Client = await tokenManager.getAuthenticatedClient(user.id);
    const tokens = oauth2Client.credentials;
    
    if (!tokens || !tokens.access_token) {
      console.log('❌ No valid tokens found');
      return;
    }
    
    console.log('✓ Got valid OAuth tokens\n');
    
    // List all broadcasts
    console.log('Fetching broadcasts from YouTube API...\n');
    const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 50 });
    
    if (!broadcasts || broadcasts.length === 0) {
      console.log('No broadcasts found');
      return;
    }
    
    console.log(`Found ${broadcasts.length} broadcasts:\n`);
    
    // Check each broadcast for thumbnail
    let withoutThumbnail = [];
    let withThumbnail = [];
    
    for (const broadcast of broadcasts) {
      const id = broadcast.id;
      const title = broadcast.snippet?.title || 'Untitled';
      const status = broadcast.status?.lifeCycleStatus || 'unknown';
      const thumbnails = broadcast.snippet?.thumbnails;
      
      // Check if has custom thumbnail (high quality)
      const hasCustomThumbnail = thumbnails?.maxres || thumbnails?.high;
      const thumbnailUrl = thumbnails?.default?.url || 'none';
      
      const info = {
        id,
        title: title.substring(0, 60),
        status,
        hasCustomThumbnail,
        thumbnailUrl
      };
      
      if (hasCustomThumbnail) {
        withThumbnail.push(info);
      } else {
        withoutThumbnail.push(info);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total broadcasts: ${broadcasts.length}`);
    console.log(`   With custom thumbnail: ${withThumbnail.length}`);
    console.log(`   Without custom thumbnail: ${withoutThumbnail.length}\n`);
    
    if (withoutThumbnail.length > 0) {
      console.log('❌ Broadcasts WITHOUT custom thumbnail:');
      withoutThumbnail.forEach((b, i) => {
        console.log(`   ${i + 1}. [${b.status}] ${b.title}`);
        console.log(`      ID: ${b.id}`);
        console.log(`      Thumbnail: ${b.thumbnailUrl}\n`);
      });
    }
    
    if (withThumbnail.length > 0) {
      console.log('\n✓ Broadcasts WITH custom thumbnail:');
      withThumbnail.forEach((b, i) => {
        console.log(`   ${i + 1}. [${b.status}] ${b.title}`);
        console.log(`      ID: ${b.id}\n`);
      });
    }
    
    // Check streams in database
    console.log('\n=== Checking Streams in Database ===\n');
    const streams = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, title, use_youtube_api, youtube_broadcast_id, youtube_stream_id, status FROM streams WHERE use_youtube_api = 1 ORDER BY created_at DESC LIMIT 10',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log(`Found ${streams.length} YouTube API streams in database:\n`);
    streams.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title.substring(0, 60)}`);
      console.log(`   Stream ID: ${s.id}`);
      console.log(`   Broadcast ID: ${s.youtube_broadcast_id || 'NULL'}`);
      console.log(`   YouTube Stream ID: ${s.youtube_stream_id || 'NULL'}`);
      console.log(`   Status: ${s.status}\n`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkBroadcasts();
