const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');
const tokenManager = require('./services/youtubeTokenManager');
const path = require('path');
const fs = require('fs');

async function createTestBroadcastWithThumbnail() {
  try {
    console.log('=== Creating Test Broadcast WITH Custom Thumbnail ===\n');
    
    // Get admin user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users LIMIT 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log(`✓ User: ${user.username}\n`);
    
    // Get OAuth tokens
    const oauth2Client = await tokenManager.getAuthenticatedClient(user.id);
    const tokens = oauth2Client.credentials;
    
    console.log('✓ Got valid OAuth tokens\n');
    
    // Get stream with video that has thumbnail
    const stream = await new Promise((resolve, reject) => {
      db.get(
        `SELECT s.*, v.thumbnail_path as video_thumbnail_path
         FROM streams s
         JOIN videos v ON s.video_id = v.id
         WHERE s.use_youtube_api = 1 
         AND v.thumbnail_path IS NOT NULL
         LIMIT 1`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!stream) {
      console.log('❌ No stream with video thumbnail found');
      return;
    }
    
    console.log(`✓ Stream: ${stream.title}`);
    console.log(`✓ Video thumbnail: ${stream.video_thumbnail_path}\n`);
    
    // Get full thumbnail path
    const thumbnailPath = path.join(__dirname, 'public', stream.video_thumbnail_path);
    
    if (!fs.existsSync(thumbnailPath)) {
      console.log(`❌ Thumbnail file not found: ${thumbnailPath}`);
      return;
    }
    
    console.log(`✓ Thumbnail file exists: ${thumbnailPath}\n`);
    
    // Get file size
    const stats = fs.statSync(thumbnailPath);
    console.log(`✓ Thumbnail size: ${(stats.size / 1024).toFixed(2)} KB\n`);
    
    // Create broadcast with thumbnail
    console.log('Creating broadcast with custom thumbnail...\n');
    
    const scheduledStartTime = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now
    
    const broadcastResult = await youtubeService.scheduleLive(tokens, {
      title: `[TEST THUMB] ${stream.title.substring(0, 80)}`, // Max 100 chars
      description: `Test broadcast with CUSTOM THUMBNAIL upload.

This broadcast should have the video's thumbnail image.

Created: ${new Date().toISOString()}`,
      privacyStatus: 'unlisted',
      scheduledStartTime: scheduledStartTime.toISOString(),
      streamId: stream.youtube_stream_id,
      enableAutoStart: false,
      enableAutoStop: false,
      tags: ['test', 'thumbnail', 'healing music'],
      category: '10',
      language: 'en',
      thumbnailPath: thumbnailPath // ⭐ PASS THUMBNAIL PATH
    });
    
    if (broadcastResult && broadcastResult.broadcast) {
      const broadcastId = broadcastResult.broadcast.id;
      console.log(`✅ Broadcast created: ${broadcastId}\n`);
      console.log(`🔗 YouTube Studio: https://studio.youtube.com/video/${broadcastId}/edit\n`);
      
      // Wait a bit for thumbnail to process
      console.log('Waiting 3 seconds for thumbnail to process...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Fetch broadcast to check thumbnail
      const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 1 });
      const testBroadcast = broadcasts.find(b => b.id === broadcastId);
      
      if (testBroadcast) {
        console.log('✅ Broadcast details:');
        console.log(`  Title: ${testBroadcast.snippet.title}`);
        console.log(`  Privacy: ${testBroadcast.status.privacyStatus}`);
        console.log(`  Scheduled: ${testBroadcast.snippet.scheduledStartTime}`);
        
        // Check thumbnails
        const thumbnails = testBroadcast.snippet.thumbnails;
        console.log(`\n📸 Thumbnails:`);
        console.log(`  Default: ${thumbnails?.default ? '✅ ' + thumbnails.default.url : '❌'}`);
        console.log(`  Medium: ${thumbnails?.medium ? '✅ ' + thumbnails.medium.url : '❌'}`);
        console.log(`  High: ${thumbnails?.high ? '✅ ' + thumbnails.high.url : '❌'}`);
        console.log(`  Standard: ${thumbnails?.standard ? '✅ ' + thumbnails.standard.url : '❌'}`);
        console.log(`  Maxres: ${thumbnails?.maxres ? '✅ ' + thumbnails.maxres.url : '❌'}`);
        
        if (thumbnails?.high || thumbnails?.maxres) {
          console.log(`\n🎉 SUCCESS! Custom thumbnail uploaded!`);
          console.log(`\n📺 Check YouTube Manage tab - broadcast should have custom thumbnail!\n`);
        } else {
          console.log(`\n⚠️  Only default thumbnail found - custom upload may have failed\n`);
        }
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

createTestBroadcastWithThumbnail();
