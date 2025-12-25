const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');
const tokenManager = require('./services/youtubeTokenManager');

async function createTestBroadcast() {
  try {
    console.log('=== Creating Test Broadcast (Will NOT Delete) ===\n');
    
    // Get admin user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users LIMIT 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    
    console.log(`✓ User: ${user.username} (${user.id})\n`);
    
    // Get OAuth client
    const oauth2Client = await tokenManager.getAuthenticatedClient(user.id);
    const tokens = oauth2Client.credentials;
    
    if (!tokens || !tokens.access_token) {
      console.log('❌ No valid tokens found');
      return;
    }
    
    console.log('✓ Got valid OAuth tokens\n');
    
    // Get a stream with YouTube API
    const stream = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM streams
         WHERE use_youtube_api = 1 
         LIMIT 1`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!stream) {
      console.log('❌ No YouTube API stream found');
      return;
    }
    
    console.log(`✓ Stream: ${stream.title}\n`);
    
    if (!stream.youtube_stream_id) {
      console.log('❌ No YouTube Stream ID - cannot create broadcast');
      return;
    }
    
    // Parse tags
    let tags = ['healing music', 'meditation', 'relaxation', '432hz', 'stress relief'];
    console.log(`✓ Using ${tags.length} test tags\n`);
    
    // Create test broadcast with full metadata
    console.log('Creating test broadcast with full metadata...\n');
    
    const scheduledStartTime = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
    
    const broadcastResult = await youtubeService.scheduleLive(tokens, {
      title: `[TEST] ${stream.title}`,
      description: `This is a test broadcast created to verify metadata and thumbnail upload.

🎵 Features:
- 432Hz healing frequency
- Deep relaxation music
- Stress relief and meditation
- High quality audio

Created by StreamBro automated testing system.`,
      privacyStatus: 'unlisted', // Use unlisted so you can see it
      scheduledStartTime: scheduledStartTime.toISOString(),
      streamId: stream.youtube_stream_id,
      enableAutoStart: false,
      enableAutoStop: false,
      tags: tags,
      category: '10', // Music category
      language: 'en',
      thumbnailPath: null // No thumbnail for now
    });
    
    if (broadcastResult && broadcastResult.broadcast) {
      const broadcastId = broadcastResult.broadcast.id;
      console.log(`✅ Broadcast created: ${broadcastId}\n`);
      console.log(`🔗 View in YouTube Studio: https://studio.youtube.com/video/${broadcastId}/edit\n`);
      
      // Set audience
      try {
        await youtubeService.setAudience(tokens, {
          videoId: broadcastId,
          selfDeclaredMadeForKids: false,
          ageRestricted: false
        });
        console.log(`✅ Audience settings applied (Not Made for Kids)\n`);
      } catch (audienceError) {
        console.error('❌ Error setting audience:', audienceError.message);
      }
      
      // Fetch broadcast details
      console.log('Fetching broadcast details...\n');
      
      const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 1 });
      const testBroadcast = broadcasts.find(b => b.id === broadcastId);
      
      if (testBroadcast) {
        console.log('✅ Broadcast details:');
        console.log(`  Title: ${testBroadcast.snippet.title}`);
        console.log(`  Description: ${testBroadcast.snippet.description.substring(0, 100)}...`);
        console.log(`  Privacy: ${testBroadcast.status.privacyStatus}`);
        console.log(`  Tags: ${testBroadcast.snippet.tags ? testBroadcast.snippet.tags.join(', ') : 'EMPTY'}`);
        console.log(`  Category: ${testBroadcast.snippet.categoryId || 'NONE'}`);
        console.log(`  Scheduled: ${testBroadcast.snippet.scheduledStartTime}`);
        console.log(`  Thumbnail: ${testBroadcast.snippet.thumbnails?.high ? 'YES (default)' : 'NO'}`);
        console.log(`  Auto Start: ${testBroadcast.contentDetails?.enableAutoStart || false}`);
        console.log(`  Auto Stop: ${testBroadcast.contentDetails?.enableAutoStop || false}\n`);
        
        console.log('✅ SUCCESS! Broadcast created and visible in YouTube Manage tab');
        console.log(`   Broadcast ID: ${broadcastId}`);
        console.log(`   Status: ${testBroadcast.status.lifeCycleStatus}`);
        console.log(`\n📺 Check YouTube Manage tab to see the broadcast with all metadata!\n`);
        console.log(`⚠️  NOTE: This is a test broadcast. You can delete it manually from YouTube Studio.\n`);
      }
      
    } else {
      console.log('❌ Failed to create broadcast\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createTestBroadcast();
