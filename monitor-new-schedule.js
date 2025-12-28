const { db } = require('./db/database');

async function monitorSchedule() {
  try {
    console.log('\n=== MONITORING NEW SCHEDULE ===\n');

    // Get all pending schedules in next 2 hours
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ss.*, s.title, s.status, s.use_youtube_api, s.youtube_broadcast_id
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE ss.schedule_time >= ? AND ss.schedule_time <= ?
         ORDER BY ss.schedule_time ASC`,
        [now.toISOString(), twoHoursLater.toISOString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log(`⏰ Current Time: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);
    console.log(`📅 Found ${schedules.length} upcoming schedule(s):\n`);

    for (const schedule of schedules) {
      const scheduleTime = new Date(schedule.schedule_time);
      const timeDiff = Math.round((scheduleTime - now) / 1000 / 60); // minutes
      
      // For YouTube API streams, FFmpeg starts 2 minutes early
      const ffmpegStartTime = schedule.use_youtube_api 
        ? new Date(scheduleTime.getTime() - 2 * 60 * 1000)
        : scheduleTime;
      
      const ffmpegTimeDiff = Math.round((ffmpegStartTime - now) / 1000 / 60);
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📺 ${schedule.title}`);
      console.log(`   Stream Status: ${schedule.status}`);
      console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id || 'Not created yet'}`);
      console.log(`   Schedule Time: ${scheduleTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`   Duration: ${schedule.duration} minutes`);
      
      if (schedule.use_youtube_api) {
        console.log(`   ⭐ YouTube API: YES`);
        console.log(`   ⭐ FFmpeg Start: ${ffmpegStartTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`   ⭐ FFmpeg in: ${ffmpegTimeDiff} minutes`);
        
        if (ffmpegTimeDiff <= 0 && ffmpegTimeDiff >= -2) {
          console.log(`   🔥 STARTING NOW!`);
        } else if (ffmpegTimeDiff > 0 && ffmpegTimeDiff <= 5) {
          console.log(`   🔔 STARTING SOON!`);
        }
      }
      
      console.log(`   Schedule in: ${timeDiff} minutes`);
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('\n💡 Next check: Run this script again in 1 minute\n');
    console.log('=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

monitorSchedule();
