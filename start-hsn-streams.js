const { db } = require('./db/database');
const fetch = require('node-fetch');

async function startHSNStreams() {
  console.log('🚀 Starting all HSN (Tibetan Flute) streams...\n');
  
  // Get all HSN streams that are stopped
  const streams = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, title, status FROM streams 
       WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
       AND status = 'stopped'
       ORDER BY title`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
  
  if (streams.length === 0) {
    console.log('⚠️  No stopped HSN streams found');
    process.exit(0);
  }
  
  console.log(`Found ${streams.length} stopped HSN streams:\n`);
  
  for (const stream of streams) {
    console.log(`Starting: ${stream.title}`);
    console.log(`  Stream ID: ${stream.id}`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/streams/${stream.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`  ✅ Started successfully`);
      } else {
        console.log(`  ❌ Failed: ${data.error}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
    
    // Wait 15 minutes between starts to avoid spam detection
    if (streams.indexOf(stream) < streams.length - 1) {
      console.log('⏳ Waiting 15 minutes before starting next stream...\n');
      await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ All HSN streams started!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Check:');
  console.log('1. Dashboard - streams should show "live" status');
  console.log('2. YouTube Studio HSN - broadcasts should appear');
  console.log('3. Server logs - should show "Stream key found" in HSN channel');
  console.log('');
  
  process.exit(0);
}

startHSNStreams().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
