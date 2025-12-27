const { db } = require('./db/database');
const fetch = require('node-fetch');

console.log('🛑 Stopping broken HSN streams (live but no broadcast)...\n');

// Get HSN streams that are live but have no broadcast_id
db.all(
  `SELECT id, title, status, youtube_broadcast_id
   FROM streams 
   WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
   AND status = 'live'
   AND (youtube_broadcast_id IS NULL OR youtube_broadcast_id = '')
   ORDER BY title`,
  async (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (streams.length === 0) {
      console.log('✅ No broken streams found');
      process.exit(0);
    }
    
    console.log(`Found ${streams.length} broken HSN streams:\n`);
    
    for (const stream of streams) {
      console.log(`Stopping: ${stream.title.substring(0, 50)}...`);
      console.log(`  Stream ID: ${stream.id}`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/streams/${stream.id}/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`  ✅ Stopped successfully`);
        } else {
          console.log(`  ⚠️  API returned: ${data.message || data.error}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log('');
      
      // Wait 1 second between stops
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All broken HSN streams stopped!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next: Wait for next schedule (tomorrow morning) or start manually');
    console.log('');
    
    process.exit(0);
  }
);
