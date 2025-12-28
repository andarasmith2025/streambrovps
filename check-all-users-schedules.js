/**
 * Check all schedules in database (all users)
 */

const { db } = require('./db/database');

async function checkAllSchedules() {
  console.log('========================================');
  console.log('Checking ALL Schedules (All Users)');
  console.log('========================================\n');
  
  try {
    // Get all schedules with user info
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          ss.*,
          s.title as stream_title,
          s.use_youtube_api,
          s.youtube_auto_start,
          s.status as stream_status,
          u.username
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         JOIN users u ON s.user_id = u.id
         ORDER BY u.username, ss.schedule_time ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    if (schedules.length === 0) {
      console.log('✅ No schedules found in database - completely clean!');
      process.exit(0);
      return;
    }
    
    console.log(`Found ${schedules.length} schedule(s) in database\n`);
    
    // Group by user
    const byUser = {};
    for (const schedule of schedules) {
      if (!byUser[schedule.username]) {
        byUser[schedule.username] = [];
      }
      byUser[schedule.username].push(schedule);
    }
    
    // Show by user
    for (const [username, userSchedules] of Object.entries(byUser)) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`USER: ${username} (${userSchedules.length} schedule(s))`);
      console.log('='.repeat(80));
      
      for (const schedule of userSchedules) {
        const scheduleTime = new Date(schedule.schedule_time);
        const now = new Date();
        const isPast = scheduleTime < now;
        
        console.log(`\n  Schedule ID: ${schedule.id}`);
        console.log(`    Stream: ${schedule.stream_title}`);
        console.log(`    Stream Status: ${schedule.stream_status}`);
        console.log(`    Schedule Time: ${scheduleTime.toLocaleString()}`);
        console.log(`    Schedule Status: ${schedule.status}`);
        console.log(`    Is Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
        if (schedule.is_recurring) {
          console.log(`    Recurring Days: ${schedule.recurring_days || 'NOT SET'}`);
        }
        console.log(`    Duration: ${schedule.duration} minutes`);
        console.log(`    YouTube API: ${schedule.use_youtube_api ? 'YES' : 'NO'}`);
        console.log(`    Auto Start: ${schedule.youtube_auto_start ? 'YES' : 'NO'}`);
        console.log(`    Broadcast ID: ${schedule.youtube_broadcast_id || 'NOT SET'}`);
        console.log(`    Broadcast Status: ${schedule.broadcast_status || 'N/A'}`);
        console.log(`    Time: ${isPast ? '⚠️ PAST' : '✅ FUTURE'}`);
      }
    }
    
    // Summary
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    
    const pendingSchedules = schedules.filter(s => s.status === 'pending');
    const recurringSchedules = schedules.filter(s => s.is_recurring);
    const withBroadcastId = schedules.filter(s => s.youtube_broadcast_id);
    const youtubeApiSchedules = schedules.filter(s => s.use_youtube_api);
    const autoStartSchedules = schedules.filter(s => s.youtube_auto_start);
    
    console.log(`  Total Schedules: ${schedules.length}`);
    console.log(`  Pending: ${pendingSchedules.length}`);
    console.log(`  Recurring: ${recurringSchedules.length}`);
    console.log(`  YouTube API: ${youtubeApiSchedules.length}`);
    console.log(`  Auto Start Enabled: ${autoStartSchedules.length}`);
    console.log(`  With Broadcast ID: ${withBroadcastId.length}`);
    console.log(`  Users with schedules: ${Object.keys(byUser).length}`);
    
    if (withBroadcastId.length > 0) {
      console.log('\n⚠️ WARNING: Some schedules still have broadcast IDs!');
      console.log('   These should have been cleared by emergency cleanup.');
      console.log('\n   Schedules with broadcast IDs:');
      for (const s of withBroadcastId) {
        console.log(`     - ${s.username}: ${s.stream_title} (${s.youtube_broadcast_id})`);
      }
    } else {
      console.log('\n✅ All schedules are clean (no broadcast IDs)');
    }
    
    console.log('\n========================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllSchedules();
