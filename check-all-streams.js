const { db } = require('./db/database');

console.log('Checking ALL streams...\n');

db.all(`
  SELECT id, title, status, use_youtube_api, youtube_broadcast_id, 
         platform, user_id, created_at
  FROM streams 
  ORDER BY created_at DESC
  LIMIT 20
`, [], (err, streams) => {
  if (err) {
    console.error('Error querying streams:', err);
    process.exit(1);
  }
  
  if (streams.length === 0) {
    console.log('No streams found in database.');
  } else {
    console.log(`Found ${streams.length} stream(s):\n`);
    
    streams.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   ID: ${stream.id}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Platform: ${stream.platform}`);
      console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
      console.log(`   YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`   User ID: ${stream.user_id}`);
      console.log(`   Created: ${stream.created_at}`);
      console.log('');
    });
  }
  
  db.close();
});
