require('dotenv').config();
const { db } = require('./db/database');
const { google } = require('googleapis');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 TESTING YOUTUBE API QUOTA & TOKEN REFRESH');
console.log('═══════════════════════════════════════════════════════════\n');

// Get Healing Earth channel
db.get(
  `SELECT * FROM youtube_channels WHERE channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ'`,
  async (err, channel) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }

    if (!channel) {
      console.log('❌ Healing Earth channel not found!');
      process.exit(1);
    }

    console.log('📺 Channel: Healing Earth Resonance');
    console.log(`Channel ID: ${channel.channel_id}`);
    console.log(`Token Expiry: ${new Date(channel.expiry_date).toLocaleString()}`);
    console.log(`Current Time: ${new Date().toLocaleString()}`);
    
    const isExpired = channel.expiry_date < Date.now();
    console.log(`Token Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}\n`);

    if (!channel.refresh_token) {
      console.log('❌ No refresh token available!');
      process.exit(1);
    }

    console.log('─'.repeat(63));
    console.log('🔄 Attempting to refresh token...\n');

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: channel.refresh_token
      });

      // Try to refresh token
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      console.log('✅ Token refresh SUCCESSFUL!\n');
      console.log(`New Access Token: ${credentials.access_token.substring(0, 30)}...`);
      console.log(`New Expiry: ${new Date(credentials.expiry_date).toLocaleString()}`);
      console.log('');

      // Update database
      db.run(
        `UPDATE youtube_channels 
         SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE channel_id = ?`,
        [credentials.access_token, credentials.expiry_date, channel.channel_id],
        (err) => {
          if (err) {
            console.error('❌ Error updating token in database:', err);
            process.exit(1);
          }

          console.log('✅ Token updated in database\n');

          // Now test YouTube API call
          console.log('─'.repeat(63));
          console.log('🧪 Testing YouTube API call...\n');

          const youtube = google.youtube({
            version: 'v3',
            auth: oauth2Client
          });

          youtube.channels.list({
            part: 'snippet,statistics',
            id: channel.channel_id
          })
          .then(response => {
            const channelData = response.data.items[0];
            
            console.log('✅ YouTube API call SUCCESSFUL!\n');
            console.log(`Channel Title: ${channelData.snippet.title}`);
            console.log(`Subscribers: ${channelData.statistics.subscriberCount}`);
            console.log(`Total Views: ${channelData.statistics.viewCount}`);
            console.log(`Total Videos: ${channelData.statistics.videoCount}`);
            console.log('');

            console.log('═'.repeat(63));
            console.log('📊 RESULT:\n');
            console.log('✅ YouTube API is working properly');
            console.log('✅ No quota limit issues detected');
            console.log('✅ Token has been refreshed successfully');
            console.log('');
            console.log('💡 The issue was: Token expired and auto-refresh not working');
            console.log('💡 Solution: Token has been manually refreshed');
            console.log('');
            console.log('🔧 NEXT STEPS:');
            console.log('   1. Check why auto-refresh is not working');
            console.log('   2. Verify youtubeTokenManager service is running');
            console.log('   3. Create new streams should work now');
            console.log('');
            console.log('═'.repeat(63));
            process.exit(0);
          })
          .catch(apiErr => {
            console.error('❌ YouTube API call FAILED!\n');
            
            if (apiErr.code === 403) {
              console.log('❌ ERROR: API QUOTA EXCEEDED or ACCESS DENIED');
              console.log('');
              console.log('Possible causes:');
              console.log('  1. Daily quota limit reached (10,000 units/day)');
              console.log('  2. YouTube Data API v3 not enabled');
              console.log('  3. API key restrictions');
              console.log('');
              console.log('Solutions:');
              console.log('  1. Check quota: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas');
              console.log('  2. Wait until quota resets (midnight Pacific Time)');
              console.log('  3. Request quota increase from Google');
            } else if (apiErr.code === 401) {
              console.log('❌ ERROR: AUTHENTICATION FAILED');
              console.log('Token refresh worked but API call failed - OAuth issue');
            } else {
              console.log(`❌ ERROR: ${apiErr.message}`);
              console.log(`Code: ${apiErr.code}`);
            }
            
            console.log('');
            console.log('Full error:', apiErr);
            process.exit(1);
          });
        }
      );

    } catch (refreshErr) {
      console.error('❌ Token refresh FAILED!\n');
      
      if (refreshErr.response && refreshErr.response.data) {
        console.log('Error details:', refreshErr.response.data);
        
        if (refreshErr.response.data.error === 'invalid_grant') {
          console.log('');
          console.log('❌ CRITICAL: Refresh token is INVALID or REVOKED');
          console.log('');
          console.log('This means:');
          console.log('  1. User revoked access to the app');
          console.log('  2. Refresh token expired (6 months unused)');
          console.log('  3. OAuth credentials changed');
          console.log('');
          console.log('Solution:');
          console.log('  → Re-authenticate the channel via YouTube Manage page');
          console.log('  → Visit: http://your-domain/youtube/manage');
        }
      } else {
        console.log('Error:', refreshErr.message);
      }
      
      process.exit(1);
    }
  }
);
