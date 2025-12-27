const { db } = require('./db/database');
const fetch = require('node-fetch');

const HSN_CHANNEL_ID = 'UCsAt2CugoD0xatdKguG1O5w';

const streamIds = [
  '32bcf084-5af7-4ce7-a006-075793c1f688',
  '1e191c57-888d-4d42-8266-508148246b40',
  'f70477cc-6406-46d8-b6ef-c59909efae2d',
  'f270b12f-d94c-42dd-bb29-126ad5c5ddae',
  '44051aea-68b1-4de9-8b57-159b013fa51d',
  'edfcd688-c7e1-4d47-9b82-08a7dbf7496d',
  '4c5caa6e-0d6f-4558-8945-d8a0e17ad932'
];

async function fixTibetanStreams() {
  console.log('🔧 Fixing Tibetan Flute streams...\n');
  
  // Step 1: Stop all streams
  console.log('Step 1: Stopping all Tibetan Flute streams...');
  for (const streamId of streamIds) {
    try {
      const response = await fetch(`http://localhost:3000/api/streams/${streamId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`  ✅ Stopped: ${streamId}`);
      } else {
        console.log(`  ⚠️  Failed to stop: ${streamId} - ${data.error}`);
      }
    } catch (error) {
      console.log(`  ❌ Error stopping: ${streamId} - ${error.message}`);
    }
  }
  
  console.log('\n');
  
  // Step 2: Update youtube_channel_id to HSN
  console.log('Step 2: Updating youtube_channel_id to HSN...');
  
  for (const streamId of streamIds) {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE streams SET youtube_channel_id = ? WHERE id = ?',
        [HSN_CHANNEL_ID, streamId],
        (err) => {
          if (err) {
            console.log(`  ❌ Failed to update: ${streamId} - ${err.message}`);
            reject(err);
          } else {
            console.log(`  ✅ Updated: ${streamId}`);
            resolve();
          }
        }
      );
    });
  }
  
  console.log('\n');
  
  // Step 3: Verify updates
  console.log('Step 3: Verifying updates...');
  
  for (const streamId of streamIds) {
    await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, title, youtube_channel_id FROM streams WHERE id = ?',
        [streamId],
        (err, row) => {
          if (err) {
            console.log(`  ❌ Error: ${streamId}`);
            reject(err);
          } else if (!row) {
            console.log(`  ⚠️  Stream not found: ${streamId}`);
            resolve();
          } else {
            const channelStatus = row.youtube_channel_id === HSN_CHANNEL_ID ? '✅' : '❌';
            console.log(`  ${channelStatus} ${row.title.substring(0, 40)}...`);
            console.log(`     Channel ID: ${row.youtube_channel_id}`);
            resolve();
          }
        }
      );
    });
  }
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ All Tibetan Flute streams fixed!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Next steps:');
  console.log('1. Go to dashboard');
  console.log('2. Click "Start" on each Tibetan Flute stream');
  console.log('3. Broadcast will be created in HSN channel');
  console.log('4. Verify in YouTube Studio HSN');
  console.log('');
  
  process.exit(0);
}

fixTibetanStreams().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
