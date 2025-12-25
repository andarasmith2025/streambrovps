const { db } = require('./db/database');
const fs = require('fs');
const path = require('path');

console.log('=== System Status Check ===\n');

async function checkSystemStatus() {
  try {
    // 1. Check database connection
    console.log('1. Database Status:');
    
    // Check streams
    const streams = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, status, platform, created_at, user_id 
              FROM streams 
              ORDER BY created_at DESC LIMIT 10`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`   - Total streams: ${streams.length}`);
    streams.forEach(stream => {
      console.log(`     * ${stream.title} - Status: ${stream.status} - Platform: ${stream.platform} - User: ${stream.user_id?.substring(0, 8)}...`);
    });
    
    // Check schedules
    const schedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.id, s.stream_id, s.schedule_time, s.status, s.duration,
                     st.title as stream_title, st.platform
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              ORDER BY s.schedule_time DESC LIMIT 10`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n2. Schedule Status:`);
    console.log(`   - Total schedules: ${schedules.length}`);
    schedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      console.log(`     * ${schedule.stream_title || 'Unknown'} - ${scheduleTime} - Status: ${schedule.status} - Duration: ${schedule.duration}min`);
    });
    
    // Check active streams
    const activeStreams = streams.filter(s => s.status === 'live' || s.status === 'starting');
    console.log(`\n3. Active Streams: ${activeStreams.length}`);
    activeStreams.forEach(stream => {
      console.log(`     * ${stream.title} - Status: ${stream.status}`);
    });
    
    // Check users
    const users = await new Promise((resolve, reject) => {
      db.all(`SELECT id, username, user_role, status FROM users`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n4. Users: ${users.length}`);
    users.forEach(user => {
      console.log(`     * ${user.username} - Role: ${user.user_role} - Status: ${user.status}`);
    });
    
    // Check YouTube channels
    const youtubeChannels = await new Promise((resolve, reject) => {
      db.all(`SELECT user_id, channel_id, channel_title, is_default FROM youtube_channels`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n5. YouTube Channels: ${youtubeChannels.length}`);
    youtubeChannels.forEach(channel => {
      const user = users.find(u => u.id === channel.user_id);
      console.log(`     * ${user?.username || 'Unknown'}: ${channel.channel_title} (Default: ${channel.is_default ? 'Yes' : 'No'})`);
    });
    
    // Check log files
    console.log(`\n6. Log Files:`);
    const logDir = path.join(__dirname, 'logs');
    if (fs.existsSync(logDir)) {
      const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
      console.log(`   - Found ${logFiles.length} log files:`);
      logFiles.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`     * ${file} - ${sizeKB}KB - Modified: ${stats.mtime.toLocaleString()}`);
      });
      
      // Check latest error log
      const errorLogPath = path.join(logDir, 'error.log');
      if (fs.existsSync(errorLogPath)) {
        console.log(`\n   Latest errors from error.log:`);
        const errorLog = fs.readFileSync(errorLogPath, 'utf8');
        const lines = errorLog.split('\n').filter(line => line.trim()).slice(-10);
        lines.forEach(line => {
          if (line.includes('ERROR') || line.includes('Error')) {
            console.log(`     ! ${line.substring(0, 100)}...`);
          }
        });
      }
    } else {
      console.log(`   - No logs directory found`);
    }
    
    // Check recent schedules that should have run
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title, st.platform
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              WHERE s.schedule_time BETWEEN ? AND ?
              ORDER BY s.schedule_time DESC`, 
        [oneHourAgo.toISOString(), now.toISOString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n7. Recent Schedules (last hour): ${recentSchedules.length}`);
    recentSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      const timeDiff = Math.round((now - new Date(schedule.schedule_time)) / (1000 * 60));
      console.log(`     * ${schedule.stream_title} - ${scheduleTime} (${timeDiff}min ago) - Status: ${schedule.status}`);
    });
    
    // Check upcoming schedules
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    const upcomingSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title, st.platform
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              WHERE s.schedule_time BETWEEN ? AND ?
              ORDER BY s.schedule_time ASC`, 
        [now.toISOString(), nextHour.toISOString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n8. Upcoming Schedules (next hour): ${upcomingSchedules.length}`);
    upcomingSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      const timeDiff = Math.round((new Date(schedule.schedule_time) - now) / (1000 * 60));
      console.log(`     * ${schedule.stream_title} - ${scheduleTime} (in ${timeDiff}min) - Status: ${schedule.status}`);
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`- Streams: ${streams.length} total, ${activeStreams.length} active`);
    console.log(`- Schedules: ${schedules.length} total, ${recentSchedules.length} recent, ${upcomingSchedules.length} upcoming`);
    console.log(`- Users: ${users.length} total`);
    console.log(`- YouTube Channels: ${youtubeChannels.length} connected`);
    
    // Identify potential issues
    console.log(`\n=== POTENTIAL ISSUES ===`);
    
    if (activeStreams.length === 0 && recentSchedules.length > 0) {
      console.log(`⚠️  No active streams but ${recentSchedules.length} schedules should have run recently`);
    }
    
    if (youtubeChannels.length === 0) {
      console.log(`⚠️  No YouTube channels connected - multi-channel features won't work`);
    }
    
    const stuckSchedules = recentSchedules.filter(s => s.status === 'pending');
    if (stuckSchedules.length > 0) {
      console.log(`⚠️  ${stuckSchedules.length} schedules stuck in 'pending' status`);
    }
    
    const multipleDefaults = {};
    youtubeChannels.forEach(ch => {
      if (ch.is_default) {
        if (!multipleDefaults[ch.user_id]) multipleDefaults[ch.user_id] = 0;
        multipleDefaults[ch.user_id]++;
      }
    });
    
    Object.keys(multipleDefaults).forEach(userId => {
      if (multipleDefaults[userId] > 1) {
        const user = users.find(u => u.id === userId);
        console.log(`⚠️  User ${user?.username} has ${multipleDefaults[userId]} default channels`);
      }
    });
    
  } catch (error) {
    console.error('Error checking system status:', error);
  } finally {
    db.close();
  }
}

checkSystemStatus();