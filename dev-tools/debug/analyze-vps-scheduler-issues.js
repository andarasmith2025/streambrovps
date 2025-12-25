const { db } = require('./db/database');

console.log('=== VPS Scheduler Issues Analysis ===\n');

async function analyzeVPSSchedulerIssues() {
  try {
    console.log('Analyzing VPS database for scheduler execution issues...\n');
    
    // 1. Get all streams (should match the 6 streams from browser log)
    const allStreams = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, status, platform, use_youtube_api, 
                     youtube_broadcast_id, active_schedule_id, user_id,
                     start_time, end_time, created_at, updated_at
              FROM streams 
              ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`1. Total Streams di VPS Database: ${allStreams.length}`);
    
    if (allStreams.length === 0) {
      console.log('❌ VPS Database juga kosong - ada masalah dengan database connection');
      return;
    }
    
    // Show streams with their IDs to match browser log
    console.log('\nStreams di VPS:');
    allStreams.forEach((stream, index) => {
      console.log(`   ${index + 1}. ${stream.title} (${stream.id.substring(0, 8)}...)`);
      console.log(`      - Status: ${stream.status}`);
      console.log(`      - Platform: ${stream.platform}`);
      console.log(`      - YouTube API: ${stream.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`      - Active Schedule: ${stream.active_schedule_id ? stream.active_schedule_id.substring(0, 8) + '...' : 'None'}`);
      console.log(`      - Broadcast ID: ${stream.youtube_broadcast_id || 'None'}`);
      console.log('');
    });
    
    // 2. Get all schedules
    const allSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title, st.platform, st.use_youtube_api
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              ORDER BY s.schedule_time DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`2. Total Schedules di VPS: ${allSchedules.length}`);
    
    // Group schedules by status
    const schedulesByStatus = {};
    allSchedules.forEach(schedule => {
      if (!schedulesByStatus[schedule.status]) schedulesByStatus[schedule.status] = [];
      schedulesByStatus[schedule.status].push(schedule);
    });
    
    console.log('\nSchedules by Status:');
    Object.keys(schedulesByStatus).forEach(status => {
      console.log(`   ${status.toUpperCase()}: ${schedulesByStatus[status].length} schedules`);
    });
    
    // 3. Check schedules that should be running NOW
    const now = new Date();
    const currentlyActiveSchedules = allSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const endTime = new Date(scheduleTime.getTime() + schedule.duration * 60 * 1000);
      return now >= scheduleTime && now <= endTime;
    });
    
    console.log(`\n3. Schedules yang SEHARUSNYA AKTIF SEKARANG: ${currentlyActiveSchedules.length}`);
    
    currentlyActiveSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const endTime = new Date(scheduleTime.getTime() + schedule.duration * 60 * 1000);
      const stream = allStreams.find(s => s.id === schedule.stream_id);
      
      console.log(`\n   ⚠️  CRITICAL ISSUE:`);
      console.log(`   Schedule: ${schedule.stream_title} (${schedule.id.substring(0, 8)}...)`);
      console.log(`   Schedule Time: ${scheduleTime.toLocaleString()}`);
      console.log(`   End Time: ${endTime.toLocaleString()}`);
      console.log(`   Schedule Status: ${schedule.status}`);
      console.log(`   Stream Status: ${stream?.status || 'Unknown'}`);
      console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id || 'MISSING'}`);
      
      if (schedule.status === 'pending') {
        const minutesOverdue = Math.round((now - scheduleTime) / (1000 * 60));
        console.log(`   ❌ SCHEDULER FAILURE: ${minutesOverdue} minutes overdue, still PENDING`);
      }
      
      if (stream && stream.status !== 'live') {
        console.log(`   ❌ STREAM FAILURE: Should be LIVE but status is ${stream.status}`);
      }
    });
    
    // 4. Check overdue pending schedules (past schedules still pending)
    const overduePendingSchedules = allSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      return schedule.status === 'pending' && now > scheduleTime;
    });
    
    console.log(`\n4. OVERDUE PENDING SCHEDULES: ${overduePendingSchedules.length}`);
    
    overduePendingSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const hoursOverdue = Math.round((now - scheduleTime) / (1000 * 60 * 60));
      
      console.log(`\n   Schedule: ${schedule.stream_title}`);
      console.log(`   Scheduled: ${scheduleTime.toLocaleString()}`);
      console.log(`   Overdue by: ${hoursOverdue} hours`);
      console.log(`   Status: ${schedule.status}`);
      console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id || 'NOT CREATED'}`);
      
      if (!schedule.youtube_broadcast_id) {
        console.log(`   ❌ BROADCAST SCHEDULER FAILED: No broadcast created`);
      }
    });
    
    // 5. Check executed schedules that might not be live
    const executedSchedules = allSchedules.filter(s => s.status === 'executed' || s.status === 'completed');
    console.log(`\n5. EXECUTED/COMPLETED SCHEDULES: ${executedSchedules.length}`);
    
    executedSchedules.forEach(schedule => {
      const stream = allStreams.find(s => s.id === schedule.stream_id);
      const scheduleTime = new Date(schedule.schedule_time);
      
      console.log(`\n   Schedule: ${schedule.stream_title}`);
      console.log(`   Executed: ${scheduleTime.toLocaleString()}`);
      console.log(`   Schedule Status: ${schedule.status}`);
      console.log(`   Stream Status: ${stream?.status || 'Unknown'}`);
      console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
      
      if (schedule.youtube_broadcast_id && stream && stream.status !== 'live') {
        console.log(`   ⚠️  ISSUE: Executed but stream not live - possible channel mismatch`);
      }
    });
    
    // 6. Check morning schedules (around 6 AM as mentioned)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaySchedules = allSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      return scheduleTime >= todayStart && scheduleTime <= todayEnd;
    });
    
    const morningSchedules = todaySchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const hour = scheduleTime.getHours();
      return hour >= 5 && hour <= 8; // 5-8 AM
    });
    
    console.log(`\n6. TODAY'S MORNING SCHEDULES (5-8 AM): ${morningSchedules.length}`);
    
    morningSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const stream = allStreams.find(s => s.id === schedule.stream_id);
      
      console.log(`\n   Schedule: ${schedule.stream_title}`);
      console.log(`   Time: ${scheduleTime.toLocaleString()}`);
      console.log(`   Status: ${schedule.status}`);
      console.log(`   Stream Status: ${stream?.status || 'Unknown'}`);
      console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
      
      if (schedule.status === 'pending' && now > scheduleTime) {
        const minutesOverdue = Math.round((now - scheduleTime) / (1000 * 60));
        console.log(`   ❌ FAILED: ${minutesOverdue} minutes overdue, still pending`);
      }
    });
    
    // 7. ROOT CAUSE ANALYSIS
    console.log(`\n=== ROOT CAUSE ANALYSIS ===`);
    
    const issues = [];
    
    if (overduePendingSchedules.length > 0) {
      issues.push(`SCHEDULER NOT RUNNING: ${overduePendingSchedules.length} overdue schedules still pending`);
    }
    
    if (currentlyActiveSchedules.length > 0) {
      const notLiveCount = currentlyActiveSchedules.filter(s => {
        const stream = allStreams.find(st => st.id === s.stream_id);
        return !stream || stream.status !== 'live';
      }).length;
      
      if (notLiveCount > 0) {
        issues.push(`STREAMING FAILURE: ${notLiveCount} schedules should be live but aren't`);
      }
    }
    
    const youtubeSchedulesWithoutBroadcast = allSchedules.filter(s => {
      const stream = allStreams.find(st => st.id === s.stream_id);
      return stream && stream.use_youtube_api && !s.youtube_broadcast_id && s.status !== 'completed';
    });
    
    if (youtubeSchedulesWithoutBroadcast.length > 0) {
      issues.push(`BROADCAST CREATION FAILURE: ${youtubeSchedulesWithoutBroadcast.length} YouTube schedules without broadcast IDs`);
    }
    
    console.log('IDENTIFIED ISSUES:');
    if (issues.length === 0) {
      console.log('   ✅ No critical issues found');
    } else {
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // 8. IMMEDIATE ACTIONS
    console.log(`\n=== IMMEDIATE ACTIONS NEEDED ===`);
    
    if (overduePendingSchedules.length > 0) {
      console.log('1. RESTART SCHEDULER:');
      console.log('   pm2 restart streambro');
      console.log('   # This will restart the broadcast scheduler');
    }
    
    if (currentlyActiveSchedules.length > 0) {
      console.log('2. MANUAL STREAM START:');
      currentlyActiveSchedules.forEach(schedule => {
        console.log(`   # Start stream manually: ${schedule.stream_title}`);
        console.log(`   curl -X POST http://localhost:3000/api/streams/${schedule.stream_id}/start`);
      });
    }
    
    if (youtubeSchedulesWithoutBroadcast.length > 0) {
      console.log('3. CHECK YOUTUBE API:');
      console.log('   - Verify YouTube API credentials');
      console.log('   - Check YouTube token expiration');
      console.log('   - Test YouTube API connectivity');
    }
    
    console.log('\n4. MONITORING:');
    console.log('   tail -f logs/app.log | grep -i scheduler');
    console.log('   tail -f logs/error.log');
    
  } catch (error) {
    console.error('Error during VPS analysis:', error);
  } finally {
    db.close();
  }
}

analyzeVPSSchedulerIssues();