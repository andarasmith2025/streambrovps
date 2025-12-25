const { db } = require('./db/database');

console.log('=== Recent Schedule Issues Analysis ===\n');

async function analyzeRecentIssues() {
  try {
    // Get last 7 days of schedules
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`Analyzing schedules from: ${sevenDaysAgo.toLocaleDateString()} to ${now.toLocaleDateString()}\n`);
    
    // 1. Get all recent schedules
    const recentSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, 
                     st.title as stream_title, 
                     st.platform, 
                     st.use_youtube_api,
                     st.youtube_broadcast_id,
                     st.user_id,
                     st.status as stream_status,
                     st.start_time as stream_start_time,
                     st.end_time as stream_end_time,
                     u.username
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              LEFT JOIN users u ON st.user_id = u.id
              WHERE s.schedule_time >= ?
              ORDER BY s.schedule_time DESC`, 
        [sevenDaysAgo.toISOString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`1. Recent Schedules (last 7 days): ${recentSchedules.length} total\n`);
    
    if (recentSchedules.length === 0) {
      console.log('No recent schedules found. Checking all schedules...\n');
      
      // Get all schedules ever
      const allSchedules = await new Promise((resolve, reject) => {
        db.all(`SELECT s.*, 
                       st.title as stream_title, 
                       st.platform, 
                       st.use_youtube_api,
                       st.youtube_broadcast_id,
                       st.user_id,
                       st.status as stream_status,
                       u.username
                FROM stream_schedules s
                LEFT JOIN streams st ON s.stream_id = st.id
                LEFT JOIN users u ON st.user_id = u.id
                ORDER BY s.schedule_time DESC LIMIT 50`, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log(`All Schedules (last 50): ${allSchedules.length}`);
      
      if (allSchedules.length === 0) {
        console.log('No schedules found in database at all.\n');
        
        // Check if there are any streams
        const allStreams = await new Promise((resolve, reject) => {
          db.all(`SELECT id, title, platform, status, use_youtube_api, user_id, created_at FROM streams ORDER BY created_at DESC LIMIT 20`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        console.log(`Recent Streams: ${allStreams.length}`);
        allStreams.forEach(stream => {
          console.log(`   * ${stream.title} - Platform: ${stream.platform} - Status: ${stream.status} - Created: ${new Date(stream.created_at).toLocaleString()}`);
        });
        
        // Check users
        const users = await new Promise((resolve, reject) => {
          db.all(`SELECT id, username, user_role FROM users`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        console.log(`\nUsers: ${users.length}`);
        users.forEach(user => {
          console.log(`   * ${user.username} - Role: ${user.user_role}`);
        });
        
        // Check YouTube channels
        const youtubeChannels = await new Promise((resolve, reject) => {
          db.all(`SELECT user_id, channel_id, channel_title, is_default FROM youtube_channels`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        
        console.log(`\nYouTube Channels: ${youtubeChannels.length}`);
        youtubeChannels.forEach(channel => {
          const user = users.find(u => u.id === channel.user_id);
          console.log(`   * ${user?.username || 'Unknown'}: ${channel.channel_title} (Default: ${channel.is_default ? 'Yes' : 'No'})`);
        });
        
        console.log(`\n=== ANALYSIS ===`);
        console.log(`The database appears to be in a clean state with no schedules.`);
        console.log(`This could mean:`);
        console.log(`1. Schedules were cleared/deleted`);
        console.log(`2. System was recently reset`);
        console.log(`3. Schedules are stored elsewhere`);
        console.log(`4. No schedules have been created yet`);
        
        if (youtubeChannels.length === 0) {
          console.log(`\n⚠️  No YouTube channels connected - this explains why schedules might fail`);
          console.log(`Users need to connect their YouTube channels first.`);
        }
        
        return;
      }
      
      // Analyze all schedules if recent ones don't exist
      console.log(`\nAnalyzing all available schedules...\n`);
      recentSchedules.push(...allSchedules);
    }
    
    // Group by status
    const byStatus = {};
    recentSchedules.forEach(schedule => {
      if (!byStatus[schedule.status]) byStatus[schedule.status] = [];
      byStatus[schedule.status].push(schedule);
    });
    
    console.log(`2. Schedules by Status:`);
    Object.keys(byStatus).forEach(status => {
      console.log(`   ${status.toUpperCase()}: ${byStatus[status].length} schedules`);
    });
    console.log('');
    
    // 3. Focus on morning schedules (around 6 AM)
    const morningSchedules = recentSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const hour = scheduleTime.getHours();
      return hour >= 5 && hour <= 8; // 5-8 AM range
    });
    
    console.log(`3. Morning Schedules (5-8 AM): ${morningSchedules.length}`);
    morningSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      console.log(`   * ${schedule.stream_title} - ${scheduleTime}`);
      console.log(`     - Schedule Status: ${schedule.status}`);
      console.log(`     - Stream Status: ${schedule.stream_status || 'Unknown'}`);
      console.log(`     - Platform: ${schedule.platform}`);
      console.log(`     - YouTube API: ${schedule.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`     - Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
      console.log(`     - User: ${schedule.username}`);
      console.log(`     - Stream Start: ${schedule.stream_start_time || 'Not started'}`);
      console.log(`     - Stream End: ${schedule.stream_end_time || 'Not ended'}`);
      console.log('');
    });
    
    // 4. Check executed schedules that might not be live
    const executedSchedules = recentSchedules.filter(s => s.status === 'executed' || s.status === 'completed');
    console.log(`4. Executed/Completed Schedules: ${executedSchedules.length}`);
    
    executedSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      console.log(`   * ${schedule.stream_title} - ${scheduleTime}`);
      console.log(`     - Schedule Status: ${schedule.status}`);
      console.log(`     - Stream Status: ${schedule.stream_status}`);
      console.log(`     - Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
      console.log(`     - User: ${schedule.username}`);
      
      // Check if this might be a channel mismatch issue
      if (schedule.youtube_broadcast_id && schedule.stream_status !== 'live') {
        console.log(`     ⚠️  POTENTIAL ISSUE: Has broadcast ID but stream not live`);
      }
      console.log('');
    });
    
    // 5. Check pending schedules that should have run
    const currentTime = new Date();
    const pendingOverdue = recentSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      return schedule.status === 'pending' && scheduleTime < currentTime;
    });
    
    console.log(`5. Overdue Pending Schedules: ${pendingOverdue.length}`);
    pendingOverdue.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const hoursOverdue = Math.round((currentTime - scheduleTime) / (1000 * 60 * 60));
      console.log(`   * ${schedule.stream_title} - ${scheduleTime.toLocaleString()}`);
      console.log(`     - Overdue by: ${hoursOverdue} hours`);
      console.log(`     - User: ${schedule.username}`);
      console.log(`     - Platform: ${schedule.platform}`);
      console.log('');
    });
    
    // 6. Check for potential channel issues
    const youtubeSchedules = recentSchedules.filter(s => s.use_youtube_api);
    console.log(`6. YouTube API Schedules: ${youtubeSchedules.length}`);
    
    // Get current YouTube channels
    const youtubeChannels = await new Promise((resolve, reject) => {
      db.all(`SELECT user_id, channel_id, channel_title, is_default FROM youtube_channels`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`   Current YouTube Channels: ${youtubeChannels.length}`);
    
    // Check for channel mismatch
    const channelsByUser = {};
    youtubeChannels.forEach(channel => {
      if (!channelsByUser[channel.user_id]) channelsByUser[channel.user_id] = [];
      channelsByUser[channel.user_id].push(channel);
    });
    
    Object.keys(channelsByUser).forEach(userId => {
      const channels = channelsByUser[userId];
      const defaultChannels = channels.filter(ch => ch.is_default);
      const userSchedules = youtubeSchedules.filter(s => s.user_id === userId);
      
      if (userSchedules.length > 0) {
        const username = userSchedules[0].username;
        console.log(`   User ${username}:`);
        console.log(`     - Channels: ${channels.length}, Default: ${defaultChannels.length}`);
        console.log(`     - YouTube Schedules: ${userSchedules.length}`);
        
        if (defaultChannels.length > 1) {
          console.log(`     ⚠️  ISSUE: Multiple default channels!`);
        } else if (defaultChannels.length === 0) {
          console.log(`     ⚠️  ISSUE: No default channel!`);
        }
      }
    });
    
    console.log(`\n=== SUMMARY OF ISSUES ===`);
    
    if (pendingOverdue.length > 0) {
      console.log(`⚠️  ${pendingOverdue.length} schedules are overdue (scheduler not running?)`);
    }
    
    if (executedSchedules.length > 0) {
      const problematicExecuted = executedSchedules.filter(s => s.youtube_broadcast_id && s.stream_status !== 'live');
      if (problematicExecuted.length > 0) {
        console.log(`⚠️  ${problematicExecuted.length} executed schedules have broadcast IDs but streams aren't live`);
        console.log(`    This suggests channel mismatch or YouTube API issues`);
      }
    }
    
    if (youtubeChannels.length === 0 && youtubeSchedules.length > 0) {
      console.log(`⚠️  ${youtubeSchedules.length} YouTube schedules but no channels connected`);
    }
    
    // Check for multiple default channels
    const usersWithMultipleDefaults = Object.keys(channelsByUser).filter(userId => {
      const channels = channelsByUser[userId];
      return channels.filter(ch => ch.is_default).length > 1;
    });
    
    if (usersWithMultipleDefaults.length > 0) {
      console.log(`⚠️  ${usersWithMultipleDefaults.length} users have multiple default channels`);
    }
    
  } catch (error) {
    console.error('Error analyzing recent issues:', error);
  } finally {
    db.close();
  }
}

analyzeRecentIssues();