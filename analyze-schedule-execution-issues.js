const { db } = require('./db/database');

console.log('=== Schedule Execution Issues Analysis ===\n');

async function analyzeScheduleIssues() {
  try {
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    console.log(`Analyzing schedules for: ${startOfDay.toLocaleDateString()}`);
    console.log(`Time range: ${startOfDay.toLocaleString()} - ${endOfDay.toLocaleString()}\n`);
    
    // 1. Get all schedules for today
    const todaySchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, 
                     st.title as stream_title, 
                     st.platform, 
                     st.use_youtube_api,
                     st.youtube_broadcast_id,
                     st.user_id,
                     u.username
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              LEFT JOIN users u ON st.user_id = u.id
              WHERE s.schedule_time >= ? AND s.schedule_time < ?
              ORDER BY s.schedule_time ASC`, 
        [startOfDay.toISOString(), endOfDay.toISOString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`1. Today's Schedules: ${todaySchedules.length} total\n`);
    
    // Group by status
    const byStatus = {};
    todaySchedules.forEach(schedule => {
      if (!byStatus[schedule.status]) byStatus[schedule.status] = [];
      byStatus[schedule.status].push(schedule);
    });
    
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${status.toUpperCase()}: ${byStatus[status].length} schedules`);
    });
    
    // 2. Focus on schedules around 6 AM (05:00 - 07:00)
    const morningSchedules = todaySchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const hour = scheduleTime.getHours();
      return hour >= 5 && hour <= 7;
    });
    
    console.log(`\n2. Morning Schedules (5-7 AM): ${morningSchedules.length}`);
    morningSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      console.log(`   * ${schedule.stream_title} - ${scheduleTime}`);
      console.log(`     - Status: ${schedule.status}`);
      console.log(`     - Platform: ${schedule.platform}`);
      console.log(`     - YouTube API: ${schedule.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`     - Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
      console.log(`     - User: ${schedule.username}`);
      console.log(`     - Duration: ${schedule.duration} minutes`);
      console.log('');
    });
    
    // 3. Check executed schedules that might not be live
    const executedSchedules = todaySchedules.filter(s => s.status === 'executed' || s.status === 'completed');
    console.log(`3. Executed/Completed Schedules: ${executedSchedules.length}`);
    
    for (const schedule of executedSchedules) {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      console.log(`   * ${schedule.stream_title} - ${scheduleTime}`);
      console.log(`     - Status: ${schedule.status}`);
      console.log(`     - Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
      
      // Check if stream is still active
      const streamStatus = await new Promise((resolve, reject) => {
        db.get(`SELECT status, start_time, end_time FROM streams WHERE id = ?`, 
          [schedule.stream_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (streamStatus) {
        console.log(`     - Stream Status: ${streamStatus.status}`);
        console.log(`     - Start Time: ${streamStatus.start_time || 'Not started'}`);
        console.log(`     - End Time: ${streamStatus.end_time || 'Not ended'}`);
      }
      console.log('');
    }
    
    // 4. Check pending schedules that should have run
    const now = new Date();
    const pendingOverdue = todaySchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      return schedule.status === 'pending' && scheduleTime < now;
    });
    
    console.log(`4. Overdue Pending Schedules: ${pendingOverdue.length}`);
    pendingOverdue.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const minutesOverdue = Math.round((now - scheduleTime) / (1000 * 60));
      console.log(`   * ${schedule.stream_title} - ${scheduleTime.toLocaleString()}`);
      console.log(`     - Overdue by: ${minutesOverdue} minutes`);
      console.log(`     - User: ${schedule.username}`);
      console.log(`     - Platform: ${schedule.platform}`);
      console.log('');
    });
    
    // 5. Check YouTube channels and potential channel mismatch
    const youtubeChannels = await new Promise((resolve, reject) => {
      db.all(`SELECT user_id, channel_id, channel_title, is_default FROM youtube_channels`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`5. YouTube Channels Analysis:`);
    console.log(`   Total channels: ${youtubeChannels.length}`);
    
    // Group channels by user
    const channelsByUser = {};
    youtubeChannels.forEach(channel => {
      if (!channelsByUser[channel.user_id]) channelsByUser[channel.user_id] = [];
      channelsByUser[channel.user_id].push(channel);
    });
    
    Object.keys(channelsByUser).forEach(userId => {
      const channels = channelsByUser[userId];
      const user = todaySchedules.find(s => s.user_id === userId);
      const username = user?.username || 'Unknown';
      const defaultChannels = channels.filter(ch => ch.is_default);
      
      console.log(`   User ${username}:`);
      console.log(`     - Total channels: ${channels.length}`);
      console.log(`     - Default channels: ${defaultChannels.length}`);
      
      if (defaultChannels.length > 1) {
        console.log(`     ⚠️  ISSUE: Multiple default channels!`);
        defaultChannels.forEach(ch => {
          console.log(`       - ${ch.channel_title} (${ch.channel_id})`);
        });
      } else if (defaultChannels.length === 0) {
        console.log(`     ⚠️  ISSUE: No default channel set!`);
      }
      
      channels.forEach(ch => {
        console.log(`     - ${ch.channel_title} (Default: ${ch.is_default ? 'Yes' : 'No'})`);
      });
      console.log('');
    });
    
    // 6. Identify potential issues
    console.log(`6. IDENTIFIED ISSUES:`);
    
    if (pendingOverdue.length > 0) {
      console.log(`   ⚠️  ${pendingOverdue.length} schedules are overdue and stuck in pending status`);
      console.log(`       This suggests the scheduler is not running or has errors`);
    }
    
    if (executedSchedules.length > 0) {
      console.log(`   ⚠️  ${executedSchedules.length} schedules marked as executed but may not be live`);
      console.log(`       This could be due to channel mismatch or YouTube API issues`);
    }
    
    // Check for channel mismatch issues
    const usersWithMultipleDefaults = Object.keys(channelsByUser).filter(userId => {
      const channels = channelsByUser[userId];
      return channels.filter(ch => ch.is_default).length > 1;
    });
    
    if (usersWithMultipleDefaults.length > 0) {
      console.log(`   ⚠️  ${usersWithMultipleDefaults.length} users have multiple default channels`);
      console.log(`       This can cause broadcasts to be created on wrong channels`);
    }
    
    // 7. Recommendations
    console.log(`\n7. RECOMMENDATIONS:`);
    
    if (pendingOverdue.length > 0) {
      console.log(`   🔧 Fix overdue schedules:`);
      console.log(`      - Check if broadcast scheduler is running`);
      console.log(`      - Check logs for scheduler errors`);
      console.log(`      - Consider manually triggering overdue schedules`);
    }
    
    if (usersWithMultipleDefaults.length > 0) {
      console.log(`   🔧 Fix multiple default channels:`);
      usersWithMultipleDefaults.forEach(userId => {
        const user = todaySchedules.find(s => s.user_id === userId);
        console.log(`      UPDATE youtube_channels SET is_default = 0 WHERE user_id = '${userId}';`);
        console.log(`      UPDATE youtube_channels SET is_default = 1 WHERE user_id = '${userId}' AND channel_id = 'CORRECT_CHANNEL_ID';`);
      });
    }
    
    if (executedSchedules.length > 0) {
      console.log(`   🔧 Check executed schedules:`);
      console.log(`      - Verify broadcasts exist in correct YouTube channels`);
      console.log(`      - Check if broadcasts are actually live`);
      console.log(`      - Look for channel mismatch issues`);
    }
    
    console.log(`\n   🔧 General fixes:`);
    console.log(`      - Ensure each user has exactly one default channel`);
    console.log(`      - Check YouTube API credentials are valid`);
    console.log(`      - Verify scheduler service is running`);
    console.log(`      - Check for token expiration issues`);
    
  } catch (error) {
    console.error('Error analyzing schedule issues:', error);
  } finally {
    db.close();
  }
}

analyzeScheduleIssues();