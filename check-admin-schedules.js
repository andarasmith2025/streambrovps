/**
 * Check schedules for Admin user
 */

const { db } = require('./db/database');

async function checkAdminSchedules() {
  console.log('========================================');
  console.log('Checking Schedules for Admin User');
  console.log('========================================\n');
  
  try {
    // 1. Find Admin user
    console.log('1. Finding Admin user...');
    const adminUser = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, username FROM users WHERE username = 'Admin' LIMIT 1`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      process.exit(1);
      return;
    }
    
    console.log(`✅ Found Admin user:`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Username: ${adminUser.username}`);
    
    // 2. Get all streams for Admin
    console.log('\n2. Getting streams for Admin...');
    const streams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, status, use_youtube_api, youtube_auto_start, active_schedule_id
         FROM streams 
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [adminUser.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`✅ Found ${streams.length} stream(s) for Admin\n`);
    
    // 3. Get all schedules for Admin's streams
    console.log('3. Getting schedules for Admin streams...');
    const schedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ss.*, s.title as stream_title, s.use_youtube_api
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE s.user_id = ?
         ORDER BY ss.schedule_time ASC`,
        [adminUser.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`✅ Found ${schedules.length} schedule(s) for Admin\n`);
    
    if (schedules.length === 0) {
      console.log('✅ No schedules found - database is clean!');
      process.exit(0);
      return;
    }
    
    // 4. Show schedule details
    console.log('Schedule Details:');
    console.log('─'.repeat(80));
    
    for (const schedule of schedules) {
      const scheduleTime = new Date(schedule.schedule_time);
      const now = new Date();
      const isPast = scheduleTime < now;
      
      console.log(`\nSchedule ID: ${schedule.id}`);
      console.log(`  Stream: ${schedule.stream_title} (ID: ${schedule.stream_id})`);
      console.log(`  Schedule Time: ${scheduleTime.toLocaleString()}`);
      console.log(`  Status: ${schedule.status}`);
      console.log(`  Is Recurring: ${schedule.is_recurring ? 'YES' : 'NO'}`);
      if (schedule.is_recurring) {
        console.log(`  Recurring Days: ${schedule.recurring_days || 'NOT SET'}`);
      }
      console.log(`  Duration: ${schedule.duration} minutes`);
      console.log(`  YouTube API: ${schedule.use_youtube_api ? 'YES' : 'NO'}`);
      console.log(`  Broadcast ID: ${schedule.youtube_broadcast_id || 'NOT SET'}`);
      console.log(`  Broadcast Status: ${schedule.broadcast_status || 'N/A'}`);
      console.log(`  Time Status: ${isPast ? '⚠️ PAST' : '✅ FUTURE'}`);
    }
    
    // 5. Summary
    console.log('\n' + '─'.repeat(80));
    console.log('SUMMARY:');
    const pendingSchedules = schedules.filter(s => s.status === 'pending');
    const recurringSchedules = schedules.filter(s => s.is_recurring);
    const withBroadcastId = schedules.filter(s => s.youtube_broadcast_id);
    
    console.log(`  Total Schedules: ${schedules.length}`);
    console.log(`  Pending: ${pendingSchedules.length}`);
    console.log(`  Recurring: ${recurringSchedules.length}`);
    console.log(`  With Broadcast ID: ${withBroadcastId.length}`);
    
    if (withBroadcastId.length > 0) {
      console.log('\n⚠️ WARNING: Some schedules still have broadcast IDs!');
      console.log('   These should have been cleared by emergency cleanup.');
      console.log('   Run emergency-stop-all-and-deploy.js again if needed.');
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

checkAdminSchedules();
