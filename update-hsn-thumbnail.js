const { db } = require('./db/database');
const { getTokensForUser } = require('./routes/youtube');
const youtubeService = require('./services/youtubeService');
const fs = require('fs');
const path = require('path');

const HSN_STREAM_ID = '32bcf084-5af7-4ce7-a006-075793c1f688';
const HSN_BROADCAST_ID = 'ezArxW7tqCA'; // Current live broadcast

console.log('=== UPDATING HSN BROADCAST THUMBNAIL ===\n');

async function updateThumbnail() {
  try {
    // Get stream data
    const stream = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          id, title, user_id, video_id,
          youtube_broadcast_id, youtube_channel_id,
          video_thumbnail, youtube_thumbnail_path
        FROM streams 
        WHERE id = ?
      `, [HSN_STREAM_ID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!stream) {
      console.error('❌ Stream not found!');
      process.exit(1);
    }
    
    console.log('📺 STREAM INFO:');
    console.log('  ID:', stream.id);
    console.log('  Title:', stream.title);
    console.log('  User ID:', stream.user_id);
    console.log('  Broadcast ID:', stream.youtube_broadcast_id || HSN_BROADCAST_ID);
    console.log('  Channel ID:', stream.youtube_channel_id || 'default');
    
    // Get thumbnail path
    let thumbnailPath = stream.youtube_thumbnail_path || stream.video_thumbnail;
    
    // If no thumbnail in stream, get from video
    if (!thumbnailPath && stream.video_id) {
      console.log('\n🔍 No thumbnail in stream, checking video...');
      const video = await new Promise((resolve, reject) => {
        db.get(`SELECT id, title, thumbnail_path FROM videos WHERE id = ?`, [stream.video_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (video && video.thumbnail_path) {
        console.log('✅ Found video thumbnail:', video.thumbnail_path);
        // Video thumbnail is relative path like '/uploads/thumbnails/xxx.jpg'
        thumbnailPath = path.join(__dirname, 'public', video.thumbnail_path);
      }
    }
    
    if (!thumbnailPath) {
      console.error('❌ No thumbnail available for this stream!');
      console.log('\n💡 Please upload a thumbnail first:');
      console.log('1. Edit the stream in dashboard');
      console.log('2. Upload thumbnail in the form');
      console.log('3. Save and run this script again');
      process.exit(1);
    }
    
    // Check if file exists
    if (!fs.existsSync(thumbnailPath)) {
      console.error('❌ Thumbnail file not found:', thumbnailPath);
      process.exit(1);
    }
    
    console.log('\n🖼️ THUMBNAIL INFO:');
    console.log('  Path:', thumbnailPath);
    console.log('  Exists:', '✅ YES');
    
    // Get file stats
    const stats = fs.statSync(thumbnailPath);
    console.log('  Size:', Math.round(stats.size / 1024), 'KB');
    
    // Get mime type from extension
    const ext = path.extname(thumbnailPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    console.log('  Type:', mimeType);
    
    // Get user tokens
    console.log('\n🔑 Getting YouTube tokens...');
    const tokens = await getTokensForUser(stream.user_id, stream.youtube_channel_id);
    
    if (!tokens || !tokens.access_token) {
      console.error('❌ Failed to get YouTube tokens!');
      console.log('User needs to reconnect YouTube account');
      process.exit(1);
    }
    
    console.log('✅ Tokens retrieved');
    
    // Upload thumbnail
    const broadcastId = stream.youtube_broadcast_id || HSN_BROADCAST_ID;
    console.log('\n📤 Uploading thumbnail to broadcast:', broadcastId);
    console.log('⏳ Please wait...');
    
    const result = await youtubeService.setThumbnail(tokens, {
      broadcastId: broadcastId,
      filePath: thumbnailPath,
      mimeType: mimeType
    });
    
    console.log('\n✅ THUMBNAIL UPLOADED SUCCESSFULLY!');
    console.log('\n📊 Result:', JSON.stringify(result.data || result, null, 2));
    
    console.log('\n💡 Next steps:');
    console.log('1. Check YouTube Studio to verify thumbnail');
    console.log('2. Thumbnail should appear on live broadcast');
    console.log('3. For future broadcasts, thumbnail will be uploaded automatically');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response && error.response.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateThumbnail();
