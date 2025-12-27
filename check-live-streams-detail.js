const Stream = require('./models/Stream');

console.log('=== CHECKING LIVE STREAMS DETAIL ===\n');

Stream.findAll(null, 'live').then(streams => {
  console.log(`Total live streams in DB: ${streams.length}\n`);
  
  streams.forEach((s, i) => {
    console.log(`${i+1}. ${s.id}`);
    console.log(`   Title: ${s.title.substring(0, 60)}`);
    console.log(`   Status: ${s.status}`);
    console.log(`   Use YouTube API: ${s.use_youtube_api}`);
    console.log(`   Broadcast ID: ${s.youtube_broadcast_id || '(none)'}`);
    console.log(`   Duration: ${s.duration || 'null'} minutes`);
    console.log(`   Start Time: ${s.start_time}`);
    console.log(`   Channel ID: ${s.youtube_channel_id || '(default)'}`);
    console.log('');
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
