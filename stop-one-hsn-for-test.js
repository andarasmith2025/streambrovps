const { db } = require('./db/database');
const fetch = require('node-fetch');

console.log('🛑 Stopping ONE HSN stream for testing...\n');

// Get one HSN stream that is live but has no broadcast_id
db.get(
  `SELECT id, title, status, youtube_broadcast_id
   FROM streams 
   WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
   AND status = 'live'
   AND (youtube_broadcast_id IS NULL OR youtube_broadcast_id = '')
   ORDER BY title
   LIMIT 1`,
  async (err, stream) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!stream) {
      console.log('✅ No broken streams found to test');
      process.exit(0);
    }
    
    console.log(`Found test stream: ${stream.title}\n`);
    console.log(`Stream ID: ${stream.id}`);
    console.log(`Status: ${stream.status}`);
    console.log(`Broadcast ID: ${stream.youtube_broadcast_id || 'NONE'}`);
    console.log('');
    console.log('Stopping...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/streams/${stream.id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Stopped successfully`);
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Next steps:');
        console.log('1. Go to dashboard');
        console.log('2. Edit this stream (make sure HSN channel is selected)');
        console.log('3. Click "Start" or wait for schedule');
        console.log('4. Check if broadcast appears in YouTube Studio HSN');
        console.log('═══════════════════════════════════════════════════════════');
      } else {
        console.log(`⚠️  API returned: ${data.message || data.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    process.exit(0);
  }
);
