const { db } = require('./db/database');

console.log('=== Live Stream Issues Analysis ===\n');

async function analyzeLiveStreamIssues() {
  try {
    console.log('Berdasarkan log browser, ada 6 streams dengan schedules yang tidak live.');
    console.log('Mari kita analisis database yang sebenarnya...\n');
    
    // 1. Cek semua streams yang ada
    const allStreams = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, status, platform, use_youtube_api, 
                     youtube_broadcast_id, active_schedule_id, user_id,
                     start_time, end_time, created_at
              FROM streams 
              ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`1. Total Streams di Database: ${allStreams.length}`);
    
    if (allStreams.length === 0) {
      console.log('❌ Database kosong - ini menjelaskan mengapa script sebelumnya tidak menemukan data');
      console.log('Kemungkinan penyebab:');
      console.log('- Database file berbeda antara aplikasi dan script');
      console.log('- Database path tidak sama');
      console.log('- Ada multiple database files');
      
      // Cek database files yang mungkin ada
      const fs = require('fs');
      const path = require('path');
      
      console.log('\nMencari database files...');
      const possiblePaths = [
        './db/streambro.db',
        './streambro.db',
        '../streambro.db',
        './database.db',
        './db/database.db'
      ];
      
      possiblePaths.forEach(dbPath => {
        if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          console.log(`✅ Found: ${dbPath} (${Math.round(stats.size/1024)}KB, modified: ${stats.mtime.toLocaleString()})`);
        } else {
          console.log(`❌ Not found: ${dbPath}`);
        }
      });
      
      return;
    }
    
    // Jika ada streams, analisis lebih lanjut
    console.log('\nStreams ditemukan:');
    allStreams.forEach(stream => {
      console.log(`   * ${stream.title}`);
      console.log(`     - ID: ${stream.id}`);
      console.log(`     - Status: ${stream.status}`);
      console.log(`     - Platform: ${stream.platform}`);
      console.log(`     - YouTube API: ${stream.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`     - Broadcast ID: ${stream.youtube_broadcast_id || 'None'}`);
      console.log(`     - Active Schedule: ${stream.active_schedule_id || 'None'}`);
      console.log(`     - Start Time: ${stream.start_time || 'Not started'}`);
      console.log('');
    });
    
    // 2. Cek schedules
    const allSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title
              FROM stream_schedules s
              LEFT JOIN streams st ON s.stream_id = st.id
              ORDER BY s.schedule_time DESC`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`2. Total Schedules: ${allSchedules.length}`);
    
    // Group by status
    const schedulesByStatus = {};
    allSchedules.forEach(schedule => {
      if (!schedulesByStatus[schedule.status]) schedulesByStatus[schedule.status] = [];
      schedulesByStatus[schedule.status].push(schedule);
    });
    
    console.log('\nSchedules by Status:');
    Object.keys(schedulesByStatus).forEach(status => {
      console.log(`   ${status}: ${schedulesByStatus[status].length}`);
    });
    
    // 3. Analisis streams yang tidak live
    const notLiveStreams = allStreams.filter(s => s.status !== 'live');
    console.log(`\n3. Streams yang TIDAK LIVE: ${notLiveStreams.length}`);
    
    notLiveStreams.forEach(stream => {
      console.log(`\n   Stream: ${stream.title} (${stream.id})`);
      console.log(`   Status: ${stream.status}`);
      console.log(`   Platform: ${stream.platform}`);
      
      if (stream.use_youtube_api) {
        console.log(`   YouTube Broadcast ID: ${stream.youtube_broadcast_id || 'MISSING!'}`);
        
        if (!stream.youtube_broadcast_id) {
          console.log(`   ⚠️  ISSUE: YouTube API enabled but no broadcast ID`);
        }
      }
      
      if (stream.active_schedule_id) {
        // Cek schedule details
        const schedule = allSchedules.find(s => s.id === stream.active_schedule_id);
        if (schedule) {
          const scheduleTime = new Date(schedule.schedule_time);
          const now = new Date();
          const timeDiff = Math.round((now - scheduleTime) / (1000 * 60));
          
          console.log(`   Active Schedule: ${schedule.id}`);
          console.log(`   Schedule Time: ${scheduleTime.toLocaleString()}`);
          console.log(`   Schedule Status: ${schedule.status}`);
          console.log(`   Time Difference: ${timeDiff} minutes ${timeDiff > 0 ? 'overdue' : 'remaining'}`);
          
          if (timeDiff > 0 && schedule.status === 'pending') {
            console.log(`   ⚠️  ISSUE: Schedule is ${timeDiff} minutes overdue but still pending`);
          }
          
          if (schedule.youtube_broadcast_id) {
            console.log(`   Schedule Broadcast ID: ${schedule.youtube_broadcast_id}`);
          } else {
            console.log(`   ⚠️  ISSUE: Schedule has no broadcast ID`);
          }
        }
      }
    });
    
    // 4. Cek streams yang seharusnya live berdasarkan schedule
    const now = new Date();
    const activeSchedules = allSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const endTime = new Date(scheduleTime.getTime() + schedule.duration * 60 * 1000);
      return now >= scheduleTime && now <= endTime && schedule.status !== 'completed';
    });
    
    console.log(`\n4. Schedules yang SEHARUSNYA AKTIF SEKARANG: ${activeSchedules.length}`);
    
    activeSchedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      const endTime = new Date(scheduleTime.getTime() + schedule.duration * 60 * 1000);
      const stream = allStreams.find(s => s.id === schedule.stream_id);
      
      console.log(`\n   Schedule: ${schedule.id}`);
      console.log(`   Stream: ${schedule.stream_title} (${schedule.stream_id})`);
      console.log(`   Schedule Time: ${scheduleTime.toLocaleString()}`);
      console.log(`   End Time: ${endTime.toLocaleString()}`);
      console.log(`   Schedule Status: ${schedule.status}`);
      console.log(`   Stream Status: ${stream?.status || 'Unknown'}`);
      
      if (schedule.status === 'pending') {
        console.log(`   ⚠️  CRITICAL: Schedule should be running but still PENDING`);
      }
      
      if (stream && stream.status !== 'live') {
        console.log(`   ⚠️  CRITICAL: Stream should be LIVE but status is ${stream.status}`);
      }
      
      if (schedule.youtube_broadcast_id) {
        console.log(`   Broadcast ID: ${schedule.youtube_broadcast_id}`);
      } else {
        console.log(`   ⚠️  ISSUE: No broadcast ID created`);
      }
    });
    
    // 5. Identifikasi root causes
    console.log(`\n=== ROOT CAUSE ANALYSIS ===`);
    
    const issues = [];
    
    // Issue 1: Scheduler not running
    const overdueSchedules = allSchedules.filter(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      return schedule.status === 'pending' && now > scheduleTime;
    });
    
    if (overdueSchedules.length > 0) {
      issues.push(`Scheduler not executing: ${overdueSchedules.length} overdue schedules still pending`);
    }
    
    // Issue 2: Broadcast creation failing
    const youtubeStreamsWithoutBroadcast = allStreams.filter(s => 
      s.use_youtube_api && !s.youtube_broadcast_id && s.active_schedule_id
    );
    
    if (youtubeStreamsWithoutBroadcast.length > 0) {
      issues.push(`Broadcast creation failing: ${youtubeStreamsWithoutBroadcast.length} YouTube streams without broadcast IDs`);
    }
    
    // Issue 3: Streams not starting
    const scheduledButNotLive = activeSchedules.filter(schedule => {
      const stream = allStreams.find(s => s.id === schedule.stream_id);
      return stream && stream.status !== 'live';
    });
    
    if (scheduledButNotLive.length > 0) {
      issues.push(`Stream starting failing: ${scheduledButNotLive.length} scheduled streams not going live`);
    }
    
    console.log('Identified Issues:');
    if (issues.length === 0) {
      console.log('   ✅ No obvious issues found');
    } else {
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // 6. Recommendations
    console.log(`\n=== RECOMMENDATIONS ===`);
    
    if (overdueSchedules.length > 0) {
      console.log('1. SCHEDULER ISSUE:');
      console.log('   - Check if broadcastScheduler service is running');
      console.log('   - Check logs/error.log for scheduler errors');
      console.log('   - Restart the application to restart scheduler');
    }
    
    if (youtubeStreamsWithoutBroadcast.length > 0) {
      console.log('2. YOUTUBE API ISSUE:');
      console.log('   - Check YouTube API credentials');
      console.log('   - Check YouTube token expiration');
      console.log('   - Verify YouTube channel connections');
    }
    
    if (scheduledButNotLive.length > 0) {
      console.log('3. STREAMING ISSUE:');
      console.log('   - Check FFmpeg installation');
      console.log('   - Check video file paths');
      console.log('   - Check RTMP connectivity');
      console.log('   - Check streaming service logs');
    }
    
    console.log('\n4. IMMEDIATE ACTIONS:');
    console.log('   - Restart the application to reset scheduler');
    console.log('   - Check server logs for errors');
    console.log('   - Test manual stream start');
    console.log('   - Verify YouTube Studio for broadcast status');
    
  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    db.close();
  }
}

analyzeLiveStreamIssues();