const { db } = require('./db/database');

const HSN_CHANNEL_ID = 'UCsAt2CugoD0xatdKguG1O5w';

console.log('Fixing streams that should be in HSN channel...\n');

// Get streams with NULL channel that are offline or have no broadcast
db.all(
  `SELECT id, title, status, youtube_broadcast_id 
   FROM streams 
   WHERE youtube_channel_id IS NULL 
   ORDER BY created_at DESC`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${streams.length} streams with NULL channel\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    streams.forEach((stream, index) => {
      // Only update offline streams or streams without broadcast
      if (stream.status === 'offline' || !stream.youtube_broadcast_id) {
        db.run(
          'UPDATE streams SET youtube_channel_id = ? WHERE id = ?',
          [HSN_CHANNEL_ID, stream.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`❌ Failed to update ${stream.id}:`, updateErr.message);
            } else {
              updatedCount++;
              console.log(`✅ Updated: ${stream.title.substring(0, 50)}... (${stream.status})`);
            }
            
            // Check if this is the last item
            if (index === streams.length - 1) {
              console.log(`\n═══════════════════════════════════════════════════════════`);
              console.log(`✅ Updated ${updatedCount} stream(s) to HSN channel`);
              console.log(`⚠️  Skipped ${skippedCount} stream(s) (live with broadcast)`);
              console.log(`═══════════════════════════════════════════════════════════\n`);
              process.exit(0);
            }
          }
        );
      } else {
        skippedCount++;
        console.log(`⚠️  Skipped: ${stream.title.substring(0, 50)}... (${stream.status}, has broadcast)`);
        
        // Check if this is the last item
        if (index === streams.length - 1) {
          console.log(`\n═══════════════════════════════════════════════════════════`);
          console.log(`✅ Updated ${updatedCount} stream(s) to HSN channel`);
          console.log(`⚠️  Skipped ${skippedCount} stream(s) (live with broadcast)`);
          console.log(`═══════════════════════════════════════════════════════════\n`);
          process.exit(0);
        }
      }
    });
    
    if (streams.length === 0) {
      console.log('No streams to update');
      process.exit(0);
    }
  }
);
