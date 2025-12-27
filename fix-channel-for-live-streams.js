/**
 * Fix Channel for Live Streams
 * 
 * This script helps fix streams that are live in wrong channel
 * by stopping them, updating channel ID, and optionally restarting
 */

const { db } = require('./db/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log('\n🔧 Fix Channel for Live Streams\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get all live streams with wrong channel
    const liveStreams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          s.id, 
          s.title, 
          s.status, 
          s.youtube_channel_id,
          s.youtube_broadcast_id,
          s.user_id,
          yc.channel_title as current_channel_name
         FROM streams s
         LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
         WHERE s.status = 'live' 
         AND s.use_youtube_api = 1
         ORDER BY s.created_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (liveStreams.length === 0) {
      console.log('✅ No live streams found');
      rl.close();
      process.exit(0);
    }
    
    console.log(`Found ${liveStreams.length} live stream(s):\n`);
    
    liveStreams.forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.title}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Current Channel: ${stream.current_channel_name || 'NULL (using default)'}`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'N/A'}`);
      console.log('');
    });
    
    // Get available channels
    const channels = await new Promise((resolve, reject) => {
      db.all(
        `SELECT channel_id, channel_title, is_default 
         FROM youtube_channels 
         ORDER BY is_default DESC, channel_title ASC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log('Available channels:');
    channels.forEach((ch, idx) => {
      console.log(`${idx + 1}. ${ch.is_default ? '⭐ ' : ''}${ch.channel_title} (${ch.channel_id})`);
    });
    console.log('');
    
    // Ask which stream to fix
    const streamChoice = await question('Which stream to fix? (enter number, or 0 to exit): ');
    const streamIdx = parseInt(streamChoice) - 1;
    
    if (streamIdx < 0 || streamIdx >= liveStreams.length) {
      console.log('Cancelled');
      rl.close();
      process.exit(0);
    }
    
    const selectedStream = liveStreams[streamIdx];
    
    console.log(`\nSelected: ${selectedStream.title}`);
    console.log(`Current channel: ${selectedStream.current_channel_name || 'NULL (default)'}\n`);
    
    // Ask which channel to move to
    const channelChoice = await question('Move to which channel? (enter number): ');
    const channelIdx = parseInt(channelChoice) - 1;
    
    if (channelIdx < 0 || channelIdx >= channels.length) {
      console.log('Invalid channel');
      rl.close();
      process.exit(1);
    }
    
    const targetChannel = channels[channelIdx];
    
    console.log(`\nTarget channel: ${targetChannel.channel_title}\n`);
    
    // Confirm
    const confirm = await question('⚠️  This will STOP the stream and update channel. Continue? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Cancelled');
      rl.close();
      process.exit(0);
    }
    
    console.log('\n🔄 Processing...\n');
    
    // Step 1: Update channel ID in database
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE streams SET youtube_channel_id = ? WHERE id = ?`,
        [targetChannel.channel_id, selectedStream.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log(`✅ Updated channel ID to: ${targetChannel.channel_title}`);
    
    // Step 2: Clear broadcast ID (so new broadcast will be created)
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE streams SET youtube_broadcast_id = NULL WHERE id = ?`,
        [selectedStream.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log(`✅ Cleared old broadcast ID`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Stream configuration updated!');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Next steps:');
    console.log('1. Go to dashboard');
    console.log('2. STOP the stream (it will stop in old channel)');
    console.log('3. START the stream again (it will create new broadcast in new channel)');
    console.log('4. ✅ Stream will now be live in correct channel!\n');
    
    const autoStop = await question('Do you want to automatically STOP the stream now? (yes/no): ');
    
    if (autoStop.toLowerCase() === 'yes') {
      console.log('\n🛑 Stopping stream via API...\n');
      
      // Call stop stream API
      const streamingService = require('./services/streamingService');
      const result = await streamingService.stopStream(selectedStream.id);
      
      if (result.success) {
        console.log('✅ Stream stopped successfully!');
        console.log('\nNow you can START the stream again from dashboard.');
        console.log('It will create a new broadcast in the correct channel.\n');
      } else {
        console.log('❌ Failed to stop stream:', result.error);
        console.log('Please stop manually from dashboard.\n');
      }
    }
    
    rl.close();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

main();
