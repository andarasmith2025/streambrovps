const { db } = require('./db/database');
const fs = require('fs');
const path = require('path');

console.log('=== Scheduler Failure Diagnosis ===\n');

async function diagnoseSchedulerFailures() {
  try {
    // 1. Check if scheduler is running by looking at recent activity
    console.log('1. Checking Scheduler Status...');
    
    // Check if there are any streams or schedules at all
    const totalStreams = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM streams', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    const totalSchedules = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM stream_schedules', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    console.log(`   - Total streams in database: ${totalStreams}`);
    console.log(`   - Total schedules in database: ${totalSchedules}`);
    
    if (totalStreams === 0 && totalSchedules === 0) {
      console.log('   ⚠️  Database is completely empty - no streams or schedules found');
      console.log('   This suggests either:');
      console.log('     a) System was recently reset/cleaned');
      console.log('     b) Data is stored elsewhere');
      console.log('     c) No streams have been created yet');
      
      // Check if there are any users who could create streams
      const users = await new Promise((resolve, reject) => {
        db.all('SELECT id, username, user_role, status FROM users', [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log(`\n   Users in system: ${users.length}`);
      users.forEach(user => {
        console.log(`     - ${user.username} (${user.user_role}) - Status: ${user.status}`);
      });
      
      return;
    }
    
    // 2. Check recent streams and their status
    console.log('\n2. Recent Streams Analysis...');
    const recentStreams = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, status, platform, use_youtube_api, 
                     start_time, end_time, created_at, updated_at, user_id
              FROM streams 
              ORDER BY created_at DESC LIMIT 20`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`   Found ${recentStreams.length} recent streams:`);
    recentStreams.forEach(stream => {
      const created = new Date(stream.created_at).toLocaleString();
      const updated = new Date(stream.updated_at).toLocaleString();
      console.log(`     * ${stream.title}`);
      console.log(`       - Status: ${stream.status}`);
      console.log(`       - Platform: ${stream.platform}`);
      console.log(`       - YouTube API: ${stream.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`       - Created: ${created}`);
      console.log(`       - Updated: ${updated}`);
      console.log(`       - Start Time: ${stream.start_time || 'Not started'}`);
      console.log(`       - End Time: ${stream.end_time || 'Not ended'}`);
      console.log('');
    });
    
    // 3. Check schedules and their execution status
    console.log('3. Schedule Execution Analysis...');
    const recentSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title, st.platform, st.use_youtube_api
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              ORDER BY s.schedule_time DESC LIMIT 20`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`   Found ${recentSchedules.length} recent schedules:`);
    
    const statusCounts = {};
    recentSchedules.forEach(schedule => {
      if (!statusCounts[schedule.status]) statusCounts[schedule.status] = 0;
      statusCounts[schedule.status]++;
      
      const scheduleTime = new Date(schedule.schedule_time).toLocaleString();
      console.log(`     * ${schedule.stream_title || 'Unknown Stream'}`);
      console.log(`       - Scheduled: ${scheduleTime}`);
      console.log(`       - Status: ${schedule.status}`);
      console.log(`       - Platform: ${schedule.platform}`);
      console.log(`       - Duration: ${schedule.duration} minutes`);
      console.log('');
    });
    
    console.log('   Schedule Status Summary:');
    Object.keys(statusCounts).forEach(status => {
      console.log(`     - ${status}: ${statusCounts[status]} schedules`);
    });
    
    // 4. Check for common failure patterns
    console.log('\n4. Failure Pattern Analysis...');
    
    const failedStreams = recentStreams.filter(s => s.status === 'error' || s.status === 'failed');
    const stuckStreams = recentStreams.filter(s => s.status === 'starting' || s.status === 'stopping');
    const pendingSchedules = recentSchedules.filter(s => s.status === 'pending');
    const failedSchedules = recentSchedules.filter(s => s.status === 'failed' || s.status === 'error');
    
    console.log(`   - Failed streams: ${failedStreams.length}`);
    console.log(`   - Stuck streams (starting/stopping): ${stuckStreams.length}`);
    console.log(`   - Pending schedules: ${pendingSchedules.length}`);
    console.log(`   - Failed schedules: ${failedSchedules.length}`);
    
    // 5. Check scheduler service files
    console.log('\n5. Scheduler Service Check...');
    
    // Check if broadcastScheduler.js exists and its content
    const schedulerPath = path.join(__dirname, 'services', 'broadcastScheduler.js');
    if (fs.existsSync(schedulerPath)) {
      console.log('   ✅ broadcastScheduler.js exists');
      
      // Check if it's being imported/used in app.js
      const appPath = path.join(__dirname, 'app.js');
      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');
        if (appContent.includes('broadcastScheduler')) {
          console.log('   ✅ Scheduler is imported in app.js');
        } else {
          console.log('   ⚠️  Scheduler NOT imported in app.js');
        }
        
        if (appContent.includes('startScheduler') || appContent.includes('scheduler.start')) {
          console.log('   ✅ Scheduler appears to be started');
        } else {
          console.log('   ⚠️  Scheduler start call not found');
        }
      }
    } else {
      console.log('   ❌ broadcastScheduler.js NOT found');
    }
    
    // 6. Check log files for errors
    console.log('\n6. Log File Analysis...');
    const logDir = path.join(__dirname, 'logs');
    
    if (fs.existsSync(logDir)) {
      const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
      console.log(`   Found ${logFiles.length} log files:`);
      
      logFiles.forEach(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`     - ${file}: ${sizeKB}KB (modified: ${stats.mtime.toLocaleString()})`);
      });
      
      // Check for recent errors
      const errorLogPath = path.join(logDir, 'error.log');
      if (fs.existsSync(errorLogPath)) {
        const errorLog = fs.readFileSync(errorLogPath, 'utf8');
        const recentErrors = errorLog.split('\n')
          .filter(line => line.trim())
          .slice(-20) // Last 20 lines
          .filter(line => line.toLowerCase().includes('error') || 
                         line.toLowerCase().includes('failed') ||
                         line.toLowerCase().includes('scheduler'));
        
        if (recentErrors.length > 0) {
          console.log('\n   Recent scheduler/error entries:');
          recentErrors.forEach(error => {
            console.log(`     ! ${error.substring(0, 150)}...`);
          });
        }
      }
      
      // Check app log for scheduler activity
      const appLogPath = path.join(logDir, 'app.log');
      if (fs.existsSync(appLogPath)) {
        const appLog = fs.readFileSync(appLogPath, 'utf8');
        const schedulerEntries = appLog.split('\n')
          .filter(line => line.toLowerCase().includes('scheduler') || 
                         line.toLowerCase().includes('schedule'))
          .slice(-10);
        
        if (schedulerEntries.length > 0) {
          console.log('\n   Recent scheduler activity:');
          schedulerEntries.forEach(entry => {
            console.log(`     * ${entry.substring(0, 150)}...`);
          });
        }
      }
    } else {
      console.log('   ⚠️  No logs directory found');
    }
    
    // 7. Check YouTube API configuration
    console.log('\n7. YouTube API Configuration...');
    
    const usersWithYouTube = await new Promise((resolve, reject) => {
      db.all(`SELECT id, username, 
                     youtube_client_id IS NOT NULL as has_client_id,
                     youtube_client_secret IS NOT NULL as has_client_secret,
                     youtube_redirect_uri IS NOT NULL as has_redirect_uri
              FROM users`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('   YouTube API credentials by user:');
    usersWithYouTube.forEach(user => {
      console.log(`     - ${user.username}:`);
      console.log(`       Client ID: ${user.has_client_id ? 'Set' : 'Missing'}`);
      console.log(`       Client Secret: ${user.has_client_secret ? 'Set' : 'Missing'}`);
      console.log(`       Redirect URI: ${user.has_redirect_uri ? 'Set' : 'Missing'}`);
    });
    
    // Check YouTube tokens
    const youtubeTokens = await new Promise((resolve, reject) => {
      db.all('SELECT user_id, expiry_date FROM youtube_tokens', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n   YouTube tokens: ${youtubeTokens.length}`);
    const now = Date.now();
    youtubeTokens.forEach(token => {
      const user = usersWithYouTube.find(u => u.id === token.user_id);
      const expired = token.expiry_date && token.expiry_date < now;
      console.log(`     - ${user?.username || 'Unknown'}: ${expired ? 'EXPIRED' : 'Valid'}`);
    });
    
    // 8. Summary and recommendations
    console.log('\n=== DIAGNOSIS SUMMARY ===');
    
    if (totalStreams === 0 && totalSchedules === 0) {
      console.log('🔍 ROOT CAUSE: Database is empty');
      console.log('   - No streams or schedules exist');
      console.log('   - System appears to be in clean/reset state');
      console.log('   - Users need to create streams and schedules first');
      return;
    }
    
    const issues = [];
    
    if (pendingSchedules.length > 0) {
      issues.push(`${pendingSchedules.length} schedules stuck in pending status`);
    }
    
    if (failedStreams.length > 0) {
      issues.push(`${failedStreams.length} streams in failed/error state`);
    }
    
    if (stuckStreams.length > 0) {
      issues.push(`${stuckStreams.length} streams stuck in starting/stopping state`);
    }
    
    const usersWithoutYouTubeConfig = usersWithYouTube.filter(u => !u.has_client_id || !u.has_client_secret);
    if (usersWithoutYouTubeConfig.length > 0) {
      issues.push(`${usersWithoutYouTubeConfig.length} users missing YouTube API config`);
    }
    
    if (youtubeTokens.length === 0) {
      issues.push('No YouTube tokens - users not connected to YouTube');
    }
    
    console.log('🔍 IDENTIFIED ISSUES:');
    if (issues.length === 0) {
      console.log('   ✅ No obvious issues found in database');
      console.log('   Problem might be in scheduler service or external factors');
    } else {
      issues.forEach(issue => {
        console.log(`   ⚠️  ${issue}`);
      });
    }
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Check if scheduler service is running');
    console.log('2. Verify YouTube API credentials are configured');
    console.log('3. Ensure users have connected their YouTube accounts');
    console.log('4. Check server logs for scheduler errors');
    console.log('5. Test creating a simple stream manually');
    console.log('6. Verify FFmpeg is installed and working');
    console.log('7. Check network connectivity to YouTube servers');
    
  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    db.close();
  }
}

diagnoseSchedulerFailures();