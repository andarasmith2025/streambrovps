const fetch = require('node-fetch');
const { db } = require('./db/database');

console.log('🧪 Testing HSN stream start...\n');

// Get one stopped HSN stream
db.get(
  `SELECT id, title, status, youtube_channel_id
   FROM streams 
   WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
   AND status = 'offline'
   ORDER BY title
   LIMIT 1`,
  async (err, stream) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (!stream) {
      console.log('❌ No stopped HSN streams found');
      console.log('Please stop one HSN stream first from dashboard');
      process.exit(1);
    }
    
    console.log(`Found stopped stream: ${stream.title.substring(0, 50)}...`);
    console.log(`Stream ID: ${stream.id}`);
    console.log(`Channel ID: ${stream.youtube_channel_id}`);
    console.log('');
    console.log('Starting stream...');
    console.log('');
    
    try {
      const response = await fetch(`http://localhost:3000/api/streams/${stream.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      console.log('Response:', data);
      
      if (data.success) {
        console.log('');
        console.log('✅ Stream started successfully!');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Check:');
        console.log('1. Dashboard - stream should show "live" status');
        console.log('2. YouTube Studio HSN - broadcast should appear');
        console.log('3. Check logs above for "Found stream ID" message');
        console.log('═══════════════════════════════════════════════════════════');
      } else {
        console.log('');
        console.log('❌ Failed to start stream');
        console.log('Error:', data.error);
      }
    } catch (error) {
      console.log('');
      console.log('❌ Error:', error.message);
    }
    
    process.exit(0);
  }
);
