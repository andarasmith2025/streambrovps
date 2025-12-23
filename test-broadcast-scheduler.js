/**
 * Test Broadcast Scheduler
 * Simulates broadcast creation for scheduled streams
 */

const { db } = require('./db/database');
const broadcastScheduler = require('./services/broadcastScheduler');

async function testBroadcastScheduler() {
  console.log('='.repeat(60));
  console.log('BROADCAST SCHEDULER TEST');
  console.log('='.repeat(60));
  
  try {
    // 1. Check current schedules
    console.log('\n[1] Checking pending schedules...');
    const schedules = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          ss.id,
          ss.stream_id,
          ss.schedule_time,
          ss.status,
          ss.broadcast_status,
          ss.youtube_broadcast_id,
          s.title,
          s.use_youtube_api,
          s.youtube_stream_id,
          s.user_id
        FROM stream_schedules ss
        JOIN streams s ON ss.stream_id = s.id
        WHERE ss.status = 'pending'
          AND s.use_youtube_api = 1
        ORDER BY ss.schedule_time ASC
        LIMIT 10
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`Found ${schedules.length} pending schedule(s) with YouTube API`);
    
    if (schedules.length === 0) {
      console.log('\n⚠️  No pending schedules found.');
      console.log('Please create a scheduled stream first.');
      process.exit(0);
    }
    
    // Display schedules
    console.log('\nSchedules:');
    schedules.forEach((s, i) => {
      const scheduleTime = new Date(s.schedule_time);
      const now = new Date();
      const minutesUntil = Math.round((scheduleTime - now) / 60000);
      
      console.log(`\n${i + 1}. Schedule ID: ${s.id}`);
      console.log(`   Stream: ${s.title}`);
      console.log(`   Time: ${scheduleTime.toLocaleString()}`);
      console.log(`   Minutes until: ${minutesUntil}`);
      console.log(`   Broadcast Status: ${s.broadcast_status || 'pending'}`);
      console.log(`   Broadcast ID: ${s.youtube_broadcast_id || 'NOT CREATED YET'}`);
      console.log(`   Stream Key: ${s.youtube_stream_id || 'N/A'}`);
    });
    
    // 2. Test broadcast creation for schedules in next 2 minutes
    console.log('\n[2] Testing broadcast creation...');
    console.log('Looking for schedules in next 1-2 minutes...');
    
    const now = new Date();
    const oneMinuteLater = new Date(now.getTime() + 1 * 60 * 1000);
    const twoMinutesLater = new Date(now.getTime() + 2 * 60 * 1000);
    
    const testSchedules = schedules.filter(s => {
      const scheduleTime = new Date(s.schedule_time);
      return scheduleTime >= oneMinuteLater && scheduleTime <= twoMinutesLater;
    });
    
    if (testSchedules.length === 0) {
      console.log('\n⚠️  No schedules found in next 1-2 minutes.');
      console.log('\nTo test, create a schedule with time: ' + oneMinuteLater.toLocaleString());
      console.log('Or modify existing schedule to be in 1-2 minutes.');
      
      // Ask if user wants to modify a schedule for testing
      console.log('\n[3] Would you like to modify a schedule for testing?');
      console.log('This will temporarily change schedule time to 2 minutes from now.');
      console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (schedules.length > 0) {
        const testSchedule = schedules[0];
        const newTime = new Date(now.getTime() + 2 * 60 * 1000);
        
        console.log(`\nModifying schedule ${testSchedule.id} for testing...`);
        console.log(`New time: ${newTime.toLocaleString()}`);
        
        await new Promise((resolve, reject) => {
          db.run(`
            UPDATE stream_schedules 
            SET schedule_time = ?
            WHERE id = ?
          `, [newTime.toISOString(), testSchedule.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        console.log('✓ Schedule modified');
        
        // Wait 1 minute then trigger scheduler
        console.log('\nWaiting 1 minute before triggering scheduler...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        console.log('\n[4] Triggering broadcast scheduler...');
        await broadcastScheduler.checkUpcomingSchedules();
        
        console.log('\n[5] Checking results...');
        const result = await new Promise((resolve, reject) => {
          db.get(`
            SELECT youtube_broadcast_id, broadcast_status
            FROM stream_schedules
            WHERE id = ?
          `, [testSchedule.id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (result && result.youtube_broadcast_id) {
          console.log('✅ SUCCESS! Broadcast created:');
          console.log(`   Broadcast ID: ${result.youtube_broadcast_id}`);
          console.log(`   Status: ${result.broadcast_status}`);
        } else {
          console.log('❌ FAILED! No broadcast created.');
          console.log('Check logs for errors.');
        }
      }
    } else {
      console.log(`\n✓ Found ${testSchedules.length} schedule(s) ready for testing`);
      
      for (const schedule of testSchedules) {
        console.log(`\nTesting schedule: ${schedule.title}`);
        console.log(`Schedule ID: ${schedule.id}`);
        
        // Manually trigger broadcast creation
        await broadcastScheduler.createBroadcastForSchedule(schedule);
        
        // Check result
        const result = await new Promise((resolve, reject) => {
          db.get(`
            SELECT youtube_broadcast_id, broadcast_status
            FROM stream_schedules
            WHERE id = ?
          `, [schedule.id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (result && result.youtube_broadcast_id) {
          console.log('✅ Broadcast created successfully!');
          console.log(`   Broadcast ID: ${result.youtube_broadcast_id}`);
          console.log(`   Status: ${result.broadcast_status}`);
        } else {
          console.log('❌ Failed to create broadcast');
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

// Run test
testBroadcastScheduler();
