// Check live streams detail
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('=== LIVE STREAMS DETAIL ===\n');

db.all(`
  SELECT 
    id,
    title,
    use_youtube_api,
    youtube_broadcast_id,
    youtube_stream_id,
    platform,
    rtmp_url
  FROM streams 
  WHERE status = 'live'
  ORDER BY title
`, [], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} live stream(s)\n`);
  
  let youtubeApiCount = 0;
  let manualRtmpCount = 0;
  let withBroadcast = 0;
  let withoutBroadcast = 0;
  
  streams.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   ID: ${s.id.substring(0, 8)}...`);
    console.log(`   Platform: ${s.platform || 'Custom'}`);
    console.log(`   YouTube API: ${s.use_youtube_api ? 'YES ✓' : 'NO ✗'}`);
    console.log(`   Broadcast ID: ${s.youtube_broadcast_id || 'NULL'}`);
    console.log(`   Stream ID: ${s.youtube_stream_id || 'NULL'}`);
    console.log(`   RTMP: ${s.rtmp_url ? s.rtmp_url.substring(0, 40) + '...' : 'NULL'}`);
    
    if (s.use_youtube_api) {
      youtubeApiCount++;
      if (s.youtube_broadcast_id) {
        withBroadcast++;
        console.log(`   Status: ✅ YouTube API with Broadcast`);
      } else {
        withoutBroadcast++;
        console.log(`   Status: ⚠️  YouTube API WITHOUT Broadcast (PROBLEM!)`);
      }
    } else {
      manualRtmpCount++;
      console.log(`   Status: 📡 Manual RTMP (No broadcast needed)`);
    }
    
    console.log('');
  });
  
  console.log('=== SUMMARY ===');
  console.log(`Total live streams: ${streams.length}`);
  console.log(`YouTube API streams: ${youtubeApiCount}`);
  console.log(`  - With broadcast: ${withBroadcast}`);
  console.log(`  - Without broadcast: ${withoutBroadcast} ${withoutBroadcast > 0 ? '⚠️  PROBLEM!' : ''}`);
  console.log(`Manual RTMP streams: ${manualRtmpCount}`);
  console.log('');
  
  db.close();
  process.exit(0);
});
