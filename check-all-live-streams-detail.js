const { db } = require('./db/database');

console.log('Checking ALL live streams in database...\n');

db.all(
  `SELECT 
    s.id, 
    s.title, 
    s.status, 
    s.youtube_broadcast_id,
    s.youtube_channel_id,
    s.active_schedule_id,
    s.start_time,
    s.use_youtube_api
  FROM streams s
  WHERE s.status = 'live'
  ORDER BY s.start_time DESC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('No live streams found.');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} live stream(s) in database:\n`);
    
    let withBroadcast = 0;
    let withoutBroadcast = 0;
    let notUsingYouTubeAPI = 0;
    
    const channelGroups = {};
    
    rows.forEach((stream, index) => {
      const channelId = stream.youtube_channel_id || 'NO_CHANNEL';
      if (!channelGroups[channelId]) {
        channelGroups[channelId] = [];
      }
      channelGroups[channelId].push(stream);
      
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
      console.log(`   Channel ID: ${stream.youtube_channel_id || 'NOT SET'}`);
      console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`   Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`   Start Time: ${stream.start_time || 'NOT SET'}`);
      
      if (stream.youtube_broadcast_id) {
        withBroadcast++;
      } else {
        withoutBroadcast++;
      }
      
      if (!stream.use_youtube_api) {
        notUsingYouTubeAPI++;
        console.log(`   ℹ️ Not using YouTube API (manual RTMP)`);
      }
      
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log(`Summary by Channel:`);
    Object.keys(channelGroups).forEach(channelId => {
      const streams = channelGroups[channelId];
      console.log(`\n  Channel: ${channelId}`);
      console.log(`    Live streams: ${streams.length}`);
      console.log(`    With broadcast: ${streams.filter(s => s.youtube_broadcast_id).length}`);
      console.log(`    Without broadcast: ${streams.filter(s => !s.youtube_broadcast_id).length}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`Overall Summary:`);
    console.log(`  Total live streams: ${rows.length}`);
    console.log(`  With broadcast ID: ${withBroadcast}`);
    console.log(`  Without broadcast ID: ${withoutBroadcast}`);
    console.log(`  Not using YouTube API: ${notUsingYouTubeAPI}`);
    console.log('='.repeat(60));
    
    db.close();
  }
);
