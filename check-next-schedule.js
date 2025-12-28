const { db } = require('./db/database');

async function checkNextSchedule() {
  try {
    console.log('\n=== CHECKING NEXT SCHEDULE ===\n');

    // Get the multi-test stream
    const stream = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM streams WHERE title LIKE ?',
        ['%jadwal multi baru%'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!stream) {
      console.log('❌ Stream not found');
      return;
    }

    console.log(`📺 Stream: ${stream.title}`);
    console.log(`   ID: ${stream.id}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Use YouTube API: ${stream.use_youtube_api ? 'YES' : 'NO'}`);

    // Get all schedules for this stream
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM stream_schedules 
         WHERE stream_id = ? 
         ORDER BY schedule_time ASC`,
        [stream.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log(`\n📅 Found ${schedules.length} schedule(s):\n`);

    const now = new Date();
    
    for (const schedule of schedules) {
      const scheduleTime = new Date(schedule.schedule_time);
      const timeDiff = Math.round((scheduleTime - now) / 1000 / 60); // minutes
      
      // For YouTube API streams, FFmpeg starts 2 minutes early
      const ffmpegStartTime = stream.use_youtube_api 
        ? new Date(scheduleTime.getTime() - 2 * 60 * 1000)
        : scheduleTime;
      
      const ffmpegTimeDiff = Math.round((ffmpegStartTime - now) / 1000 / 60);
      
      console.log(`Schedule ID: ${schedule.id}`);
      console.log(`  Time: ${scheduleTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`  Duration: ${schedule.duration} minutes`);
      console.log(`  Status: ${schedule.status}`);
      console.log(`  Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
      if (schedule.is_recurring) {
        console.log(`  Days: ${schedule.recurring_days}`);
      }
      
      if (stream.use_youtube_api) {
        console.log(`  ⭐ FFmpeg Start: ${ffmpegStartTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} (2 min early)`);
        console.log(`  ⭐ FFmpeg in: ${ffmpegTimeDiff} minutes`);
      }
      
      console.log(`  Schedule in: ${timeDiff} minutes`);
      
      if (timeDiff > 0 && timeDiff <= 30) {
        console.log(`  🔔 NEXT UP!`);
      }
      
      console.log('');
    }

    // Check current time
    console.log(`⏰ Current Time: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`   Day: ${now.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })} (${now.getDay()})`);

    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkNextSchedule();
