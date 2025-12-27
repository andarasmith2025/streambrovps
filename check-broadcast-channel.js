/**
 * Check which YouTube channel owns a broadcast
 */

const { google } = require('googleapis');
const { db } = require('./db/database');

const broadcastId = process.argv[2] || '6jZNlUpFb2M';

async function checkBroadcastChannel() {
  try {
    console.log(`\n🔍 Checking which channel owns broadcast: ${broadcastId}\n`);
    
    // Get all YouTube channels from database
    const channels = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, channel_id, channel_title, user_id, is_default, access_token, refresh_token, expiry_date 
         FROM youtube_channels 
         ORDER BY is_default DESC, created_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (channels.length === 0) {
      console.error('❌ No YouTube channels found in database');
      process.exit(1);
    }
    
    console.log(`📺 Found ${channels.length} YouTube channel(s) in database:\n`);
    
    for (const channel of channels) {
      console.log(`   ${channel.is_default ? '⭐' : '  '} ${channel.channel_title || 'Unknown'}`);
      console.log(`      Channel ID: ${channel.channel_id || 'N/A'}`);
      console.log(`      User ID: ${channel.user_id}`);
      console.log('');
    }
    
    console.log('🔎 Checking each channel for the broadcast...\n');
    
    let foundChannel = null;
    
    for (const channel of channels) {
      try {
        console.log(`   Checking: ${channel.channel_title || 'Unknown'}...`);
        
        // Setup OAuth2 client
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: channel.access_token,
          refresh_token: channel.refresh_token,
          expiry_date: channel.expiry_date
        });
        
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        
        // Try to get broadcast from this channel
        const broadcastResponse = await youtube.liveBroadcasts.list({
          part: 'id,snippet,status',
          id: broadcastId
        });
        
        if (broadcastResponse.data.items && broadcastResponse.data.items.length > 0) {
          foundChannel = channel;
          const broadcast = broadcastResponse.data.items[0];
          
          console.log(`   ✅ FOUND! This broadcast belongs to this channel\n`);
          
          console.log('═══════════════════════════════════════════════════════════');
          console.log('📺 CHANNEL INFORMATION');
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`Channel Title:      ${channel.channel_title || 'Unknown'}`);
          console.log(`Channel ID:         ${channel.channel_id || 'N/A'}`);
          console.log(`Is Default:         ${channel.is_default ? 'Yes ⭐' : 'No'}`);
          console.log(`User ID:            ${channel.user_id}`);
          console.log('');
          console.log('📺 BROADCAST INFORMATION');
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`Title:              ${broadcast.snippet.title}`);
          console.log(`Broadcast ID:       ${broadcast.id}`);
          console.log(`Status:             ${broadcast.status.lifeCycleStatus}`);
          console.log(`Privacy:            ${broadcast.status.privacyStatus}`);
          console.log(`Scheduled Start:    ${broadcast.snippet.scheduledStartTime}`);
          console.log('═══════════════════════════════════════════════════════════\n');
          
          break;
        } else {
          console.log(`   ❌ Not found in this channel\n`);
        }
        
      } catch (channelError) {
        if (channelError.code === 404) {
          console.log(`   ❌ Not found in this channel\n`);
        } else if (channelError.code === 403) {
          console.log(`   ⚠️  Access denied (quota or permissions issue)\n`);
        } else {
          console.log(`   ⚠️  Error: ${channelError.message}\n`);
        }
      }
    }
    
    if (!foundChannel) {
      console.log('❌ Broadcast not found in any connected channel!\n');
      console.log('💡 Possible reasons:');
      console.log('   1. Broadcast was created on a different channel');
      console.log('   2. Broadcast was deleted');
      console.log('   3. Channel was disconnected/removed');
      console.log('   4. API quota exceeded\n');
      
      // Check database for stream info
      console.log('🔍 Checking database for stream info...\n');
      
      const stream = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM streams WHERE youtube_broadcast_id = ?',
          [broadcastId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (stream) {
        console.log('Stream found in database:');
        console.log(`   Stream ID:          ${stream.id}`);
        console.log(`   Title:              ${stream.title}`);
        console.log(`   User ID:            ${stream.user_id}`);
        console.log(`   YouTube Channel ID: ${stream.youtube_channel_id || 'NULL (using default)'}`);
        console.log(`   Status:             ${stream.status}`);
        console.log(`   Created:            ${stream.created_at}\n`);
        
        if (stream.youtube_channel_id) {
          console.log(`💡 Stream was created for channel ID: ${stream.youtube_channel_id}`);
          console.log(`   Check if this channel is still connected in youtube_channels table\n`);
        } else {
          console.log(`💡 Stream was created using default channel`);
          console.log(`   The default channel may have changed since creation\n`);
        }
      }
    }
    
    process.exit(foundChannel ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

checkBroadcastChannel();
