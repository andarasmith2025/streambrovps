require('dotenv').config();
const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING ALL CHANNELS AND STREAMS');
console.log('═══════════════════════════════════════════════════════════\n');

// Get all channels
db.all(
  `SELECT * FROM youtube_channels ORDER BY channel_title`,
  (err, channels) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    console.log(`📺 Found ${channels.length} YouTube channel(s)\n`);

    if (channels.length === 0) {
      console.log('No YouTube channels found!');
    } else {
      channels.forEach((ch, idx) => {
        console.log(`${idx + 1}. ${ch.channel_title || 'NO TITLE'}`);
        console.log(`   Channel ID: ${ch.channel_id}`);
        console.log(`   User ID: ${ch.user_id}`);
        console.log(`   Default: ${ch.is_default ? 'YES' : 'NO'}`);
        console.log('');
      });
    }

    console.log('─'.repeat(63) + '\n');

    // Get all streams with their channels
    db.all(
      `SELECT s.id, s.title, s.youtube_channel_id, s.use_youtube_api, s.status,
              yc.channel_title
       FROM streams s
       LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
       ORDER BY s.title`,
      (err, streams) => {
        if (err) {
          console.error('Error:', err);
          process.exit(1);
        }

        console.log(`📡 Found ${streams.length} stream(s)\n`);

        if (streams.length === 0) {
          console.log('No streams found!');
        } else {
          streams.forEach((stream, idx) => {
            console.log(`${idx + 1}. ${stream.title}`);
            console.log(`   Stream ID: ${stream.id}`);
            console.log(`   Channel: ${stream.channel_title || 'NOT SET'}`);
            console.log(`   Channel ID: ${stream.youtube_channel_id || 'NOT SET'}`);
            console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);
            console.log(`   Status: ${stream.status}`);
            
            // Get schedules for this stream
            db.all(
              `SELECT id, schedule_time, duration, status, is_recurring, recurring_days, 
                      youtube_broadcast_id, broadcast_status
               FROM stream_schedules 
               WHERE stream_id = ?
               ORDER BY schedule_time`,
              [stream.id],
              (err, schedules) => {
                if (err) {
                  console.error('   Error getting schedules:', err);
                  return;
                }

                if (schedules.length > 0) {
                  console.log(`   Schedules: ${schedules.length}`);
                  schedules.forEach((sched, sidx) => {
                    const schedTime = new Date(sched.schedule_time);
                    console.log(`     ${sidx + 1}. ${schedTime.toLocaleString()}`);
                    console.log(`        Duration: ${sched.duration || 'NULL'} minutes`);
                    console.log(`        Status: ${sched.status}`);
                    console.log(`        Recurring: ${sched.is_recurring ? 'YES' : 'NO'}`);
                    if (sched.is_recurring) {
                      console.log(`        Days: ${sched.recurring_days || 'NULL'}`);
                    }
                    console.log(`        Broadcast ID: ${sched.youtube_broadcast_id || 'NULL'}`);
                    console.log(`        Broadcast Status: ${sched.broadcast_status || 'NULL'}`);
                  });
                } else {
                  console.log(`   Schedules: 0`);
                }
                console.log('');
              }
            );
          });
        }

        setTimeout(() => {
          console.log('═══════════════════════════════════════════════════════════');
          process.exit(0);
        }, 2000);
      }
    );
  }
);
