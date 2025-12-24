const { db } = require('./db/database');
const youtubeService = require('./services/youtubeService');
const tokenManager = require('./services/youtubeTokenManager');

async function testBroadcastMetadata() {
  try {
    console.log('=== Testing Broadcast Creation with Full Metadata ===\n');
    
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
    console.log('Stream metadata:');
    console.log(`  Description: ${stream.youtube_description || 'EMPTY'}`);
    console.log(`  Privacy: ${stream.youtube_privacy || 'unlisted'}`);
    console.log(`  Tags: ${stream.youtube_tags || 'EMPTY'}`);
    console.log(`  Made for Kids: ${stream.youtube_made_for_kids || 0}`);
    console.log(`  Age Restricted: ${stream.youtube_age_restricted || 0}`);
    console.log(`  Auto Start: ${stream.youtube_auto_start || 0}`);
    console.log(`  Auto End: ${stream.youtube_auto_end || 0}`);
    console.log(`  Stream ID: ${stream.youtube_stream_id || 'NONE'}`);
    console.log(`  Video Thumbnail: ${stream.video_thumbnail || 'NONE'}\n`);
    
    if (!stream.youtube_stream_id) {
      console.log('❌ No YouTube Stream ID - cannot create broadcast');
      return;
    }
    
    // Parse tags
    let tags = null;
    if (stream.youtube_tags) {
      try {
        tags = JSON.parse(stream.youtube_tags);
        console.log(`✓ Parsed ${tags.length} tags\n`);
      } catch (e) {
        console.log('⚠️  Failed to parse tags\n');
      }
    }
    
    // Get thumbnail path
    let thumbnailPath = stream.video_thumbnail;
    
    if (thumbnailPath) {
      const fs = require('fs');
      if (fs.existsSync(thumbnailPath)) {
        console.log(`✓ Thumbnail file exists: ${thumbnailPath}\n`);
      } else {
        console.log(`⚠️  Thumbnail file not found: ${thumbnailPath}\n`);
        thumbnailPath = null;
      }
    } else {
      console.log(`⚠️  No thumbnail path saved\n`);
    }
    
    // Create test broadcast
    console.log('Creating test broadcast...\n');
    
    const scheduledStartTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    
    const broadcastResult = await youtubeService.scheduleLive(tokens, {
      title: `[TEST] ${stream.title}`,
      description: stream.youtube_description || 'Test broadcast with metadata',
      privacyStatus: 'private', // Use private for testing
      scheduledStartTime: scheduledStartTime.toISOString(),
      streamId: stream.youtube_stream_id,
      enableAutoStart: stream.youtube_auto_start || false,
      enableAutoStop: stream.youtube_auto_end || false,
      tags: tags,
      category: stream.youtube_category_id || null,
      language: stream.youtube_language || null,
      thumbnailPath: thumbnailPath
    });
    
    if (broadcastResult && broadcastResult.broadcast) {
      const broadcastId = broadcastResult.broadcast.id;
      console.log(`✅ Broadcast created: ${broadcastId}\n`);
      
      // Set audience if needed
      if (stream.youtube_made_for_kids || stream.youtube_age_restricted) {
        try {
          await youtubeService.setAudience(tokens, {
            videoId: broadcastId,
            selfDeclaredMadeForKids: stream.youtube_made_for_kids === 1,
            ageRestricted: stream.youtube_age_restricted === 1
          });
          console.log(`✅ Audience settings applied\n`);
        } catch (audienceError) {
          console.error('❌ Error setting audience:', audienceError.message);
        }
      }
      
      // Fetch broadcast details to verify metadata
      console.log('Fetching broadcast details to verify metadata...\n');
      
      const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 1 });
      const testBroadcast = broadcasts.find(b => b.id === broadcastId);
      
      if (testBroadcast) {
        console.log('✅ Broadcast details:');
        console.log(`  Title: ${testBroadcast.snippet.title}`);
        console.log(`  Description: ${testBroadcast.snippet.description || 'EMPTY'}`);
        console.log(`  Privacy: ${testBroadcast.status.privacyStatus}`);
        console.log(`  Tags: ${testBroadcast.snippet.tags ? testBroadcast.snippet.tags.join(', ') : 'EMPTY'}`);
        console.log(`  Scheduled: ${testBroadcast.snippet.scheduledStartTime}`);
        console.log(`  Thumbnail: ${testBroadcast.snippet.thumbnails?.high ? 'YES' : 'NO'}`);
        console.log(`  Auto Start: ${testBroadcast.contentDetails?.enableAutoStart || false}`);
        console.log(`  Auto Stop: ${testBroadcast.contentDetails?.enableAutoStop || false}\n`);
        
        // Check if metadata matches
        const metadataMatch = {
          title: testBroadcast.snippet.title.includes(stream.title),
          description: stream.youtube_description ? testBroadcast.snippet.description === stream.youtube_description : true,
          privacy: testBroadcast.status.privacyStatus === 'private',
          tags: tags ? (testBroadcast.snippet.tags && testBroadcast.snippet.tags.length === tags.length) : true,
          thumbnail: !!testBroadcast.snippet.thumbnails?.high
        };
        
        console.log('Metadata verification:');
        console.log(`  Title: ${metadataMatch.title ? '✅' : '❌'}`);
        console.log(`  Description: ${metadataMatch.description ? '✅' : '❌'}`);
        console.log(`  Privacy: ${metadataMatch.privacy ? '✅' : '❌'}`);
        console.log(`  Tags: ${metadataMatch.tags ? '✅' : '❌'}`);
        console.log(`  Thumbnail: ${metadataMatch.thumbnail ? '✅' : '❌'}\n`);
        
        const allMatch = Object.values(metadataMatch).every(v => v);
        if (allMatch) {
          console.log('🎉 All metadata verified successfully!\n');
        } else {
          console.log('⚠️  Some metadata did not match\n');
        }
      }
      
      // Delete test broadcast
      console.log('Deleting test broadcast...');
      try {
        await youtubeService.deleteBroadcast(tokens, { broadcastId });
        console.log('✅ Test broadcast deleted\n');
      } catch (deleteError) {
        console.error('❌ Error deleting broadcast:', deleteError.message);
        console.log(`Please manually delete broadcast: ${broadcastId}\n`);
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

testBroadcastMetadata();
