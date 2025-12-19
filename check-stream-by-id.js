const { db } = require('./db/database');

const streamId = 'd5ae23d6-33de-4f63-a473-fdcf54a01101';

console.log(`Checking stream ${streamId}...\n`);

db.get(`SELECT * FROM streams WHERE id = ?`, [streamId], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!stream) {
    console.log('❌ Stream not found');
    process.exit(1);
  }
  
  console.log('=== STREAM FOUND ===');
  console.log(`Title: ${stream.title}`);
  console.log(`Status: ${stream.status}`);
  console.log(`Platform: ${stream.platform}`);
  console.log(`Use YouTube API: ${stream.use_youtube_api}`);
  console.log(`YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'NULL'}`);
  console.log(`RTMP URL: ${stream.rtmp_url}`);
  console.log(`Stream Key: ${stream.stream_key ? stream.stream_key.substring(0, 20) + '...' : 'NULL'}`);
  console.log(`Created: ${stream.created_at}`);
  console.log('');
  
  // Check schedules
  db.all(`SELECT * FROM stream_schedules WHERE stream_id = ?`, [streamId], (err2, schedules) => {
    if (err2) {
      console.error('Error:', err2);
      process.exit(1);
    }
    
    if (!schedules || schedules.length === 0) {
      console.log('❌ NO SCHEDULES found!');
      console.log('Stream was created but schedule was not saved.');
    } else {
      console.log(`✓ Found ${schedules.length} schedule(s):\n`);
      
      const now = new Date();
      schedules.forEach((sch, i) => {
        const scheduleTime = new Date(sch.schedule_time);
        const diff = Math.floor((scheduleTime - now) / (60 * 1000));
        
        console.log(`${i + 1}. Schedule Time (UTC): ${sch.schedule_time}`);
        console.log(`   Schedule Time (Local): ${scheduleTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`   Time Diff: ${diff} minutes`);
        console.log(`   Duration: ${sch.duration} minutes`);
        console.log(`   Status: ${sch.status}`);
        console.log(`   Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
        
        if (diff <= 0 && diff >= -5) {
          console.log(`   ⚠️  SHOULD BE STARTING NOW!`);
        } else if (diff > 0 && diff <= 5) {
          console.log(`   ⏰ Will start in ${diff} minute(s)`);
        } else if (diff < -5) {
          console.log(`   ❌ MISSED (${Math.abs(diff)} minutes ago)`);
        }
        console.log('');
      });
    }
    
    db.close();
    process.exit(0);
  });
});
