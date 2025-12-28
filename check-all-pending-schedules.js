const { db } = require('./db/database');

async function checkAllSchedules() {
  try {
    console.log('\n=== ALL PENDING SCHEDULES ===\n');

    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ss.*, s.title, s.status, s.use_youtube_api
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE ss.status = 'pending'
         ORDER BY ss.schedule_time ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const now = new Date();
    console.log(`⏰ Current Time: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);
    console.log(`📅 Found ${schedules.length} pending schedule(s):\n`);

    for (const schedule of schedules) {
      const scheduleTime = new Date(schedule.schedule_time);
      const timeDiff = Math.round((scheduleTime - now) / 1000 / 60);
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📺 ${schedule.title}`);
      console.log(`   Stream ID: ${schedule.stream_id}`);
      console.log(`   Schedule ID: ${schedule.id}`);
      console.log(`   Status: ${schedule.status}`);
      console.log(`   Stream Status: ${schedule.status}`);
      console.log(`   Use YouTube API: ${schedule.use_youtube_api ? 'YES' : 'NO'}`);
      console.log(`   Schedule Time: ${scheduleTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`   Duration: ${schedule.duration} minutes`);
      console.log(`   Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
      if (schedule.is_recurring) {
        console.log(`   Days: ${schedule.recurring_days}`);
      }
      
      if (schedule.use_youtube_api) {
        const ffmpegStartTime = new Date(scheduleTime.getTime() - 2 * 60 * 1000);
        const ffmpegTimeDiff = Math.round((ffmpegStartTime - now) / 1000 / 60);
        console.log(`   ⭐ FFmpeg Start: ${ffmpegStartTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`   ⭐ FFmpeg in: ${ffmpegTimeDiff} minutes`);
      }
      
      console.log(`   Schedule in: ${timeDiff} minutes`);
      
      if (timeDiff <= 5 && timeDiff >= -5) {
        console.log(`   🔔 ACTIVE WINDOW!`);
      }
      console.log('');
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkAllSchedules();
