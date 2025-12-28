const { db } = require('./db/database');

console.log('Checking stream vs broadcast mismatch...\n');

// Check HSN and Healing Earth channels
db.all(
  `SELECT 
    s.id, 
    s.title, 
    s.status, 
    s.youtube_broadcast_id,
    s.youtube_channel_id,
    s.active_schedule_id,
    s.start_time,
    ss.youtube_broadcast_id as schedule_broadcast_id,
    ss.broadcast_status
  FROM streams s
  LEFT JOIN stream_schedules ss ON s.active_schedule_id = ss.id
  WHERE s.status = 'live'
    AND (s.youtube_channel_id LIKE '%Healing%' OR s.youtube_channel_id LIKE '%HSN%' OR s.youtube_channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ' OR s.youtube_channel_id = 'UCfv8cds8wfuWxIIDsBoQVfA')
  ORDER BY s.start_time DESC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('No live streams found for HSN or Healing Earth.');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} live stream(s):\n`);
    
    let withBroadcast = 0;
    let withoutBroadcast = 0;
    let mismatch = 0;
    
    rows.forEach((stream, index) => {
      console.log(`${index + 1}. ${stream.title}`);
      console.log(`   Stream ID: ${stream.id}`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Channel ID: ${stream.youtube_channel_id || 'NOT SET'}`);
      console.log(`   Stream Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`   Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`   Schedule Broadcast ID: ${stream.schedule_broadcast_id || 'NOT SET'}`);
      console.log(`   Schedule Broadcast Status: ${stream.broadcast_status || 'NOT SET'}`);
      console.log(`   Start Time: ${stream.start_time || 'NOT SET'}`);
      
      if (stream.youtube_broadcast_id) {
        withBroadcast++;
      } else {
        withoutBroadcast++;
      }
      
      if (stream.youtube_broadcast_id && stream.schedule_broadcast_id && 
          stream.youtube_broadcast_id !== stream.schedule_broadcast_id) {
        mismatch++;
        console.log(`   ⚠️ MISMATCH: Stream broadcast != Schedule broadcast`);
      }
      
      if (!stream.youtube_broadcast_id && stream.schedule_broadcast_id) {
        console.log(`   ⚠️ Stream has NO broadcast but schedule has: ${stream.schedule_broadcast_id}`);
      }
      
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log(`Summary:`);
    console.log(`  Total live streams: ${rows.length}`);
    console.log(`  With broadcast ID: ${withBroadcast}`);
    console.log(`  Without broadcast ID: ${withoutBroadcast}`);
    console.log(`  Mismatched IDs: ${mismatch}`);
    console.log('='.repeat(60));
    
    db.close();
  }
);
