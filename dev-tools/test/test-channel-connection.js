const { db } = require('./db/database');

console.log('=== Testing Channel Connection & Database ===\n');

async function testChannelConnection() {
  try {
    // 1. Check YouTube channels
    const channels = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM youtube_channels ORDER BY user_id, is_default DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`1. YouTube Channels: ${channels.length}`);
    
    if (channels.length === 0) {
      console.log('❌ No YouTube channels found');
      console.log('Channel connection failed or not saved to database');
    } else {
      channels.forEach(channel => {
        console.log(`   - ${channel.channel_title || 'Unknown'}`);
        console.log(`     User ID: ${channel.user_id}`);
        console.log(`     Channel ID: ${channel.channel_id}`);
        console.log(`     Default: ${channel.is_default ? 'Yes' : 'No'}`);
        console.log(`     Connected: ${channel.created_at}`);
        console.log('');
      });
      
      // Check for multiple defaults
      const userDefaults = {};
      channels.forEach(ch => {
        if (ch.is_default) {
          if (!userDefaults[ch.user_id]) userDefaults[ch.user_id] = 0;
          userDefaults[ch.user_id]++;
        }
      });
      
      Object.keys(userDefaults).forEach(userId => {
        if (userDefaults[userId] > 1) {
          console.log(`⚠️  User ${userId} has ${userDefaults[userId]} default channels`);
        }
      });
    }
    
    // 2. Check streams
    const streams = await new Promise((resolve, reject) => {
      db.all('SELECT id, title, status, use_youtube_api, user_id FROM streams ORDER BY created_at DESC LIMIT 5', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`2. Recent Streams: ${streams.length}`);
    streams.forEach(stream => {
      console.log(`   - ${stream.title} (${stream.status})`);
      console.log(`     YouTube API: ${stream.use_youtube_api ? 'Yes' : 'No'}`);
      console.log(`     User: ${stream.user_id}`);
    });
    
    // 3. Check schedules
    const schedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title 
              FROM stream_schedules s 
              LEFT JOIN streams st ON s.stream_id = st.id 
              ORDER BY s.schedule_time DESC LIMIT 5`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n3. Recent Schedules: ${schedules.length}`);
    schedules.forEach(schedule => {
      const scheduleTime = new Date(schedule.schedule_time);
      console.log(`   - ${schedule.stream_title || 'Unknown'}`);
      console.log(`     Time: ${scheduleTime.toLocaleString()}`);
      console.log(`     Status: ${schedule.status}`);
      console.log(`     Broadcast ID: ${schedule.youtube_broadcast_id || 'None'}`);
    });
    
    // 4. Test database write
    console.log('\n4. Testing Database Write...');
    const testId = 'test_' + Date.now();
    
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO oauth_states (state, user_id, redirect_uri) VALUES (?, ?, ?)', 
        [testId, 'test_user', 'test_uri'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Read it back
    const testRead = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM oauth_states WHERE state = ?', [testId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (testRead) {
      console.log('✅ Database write/read test successful');
      
      // Clean up
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM oauth_states WHERE state = ?', [testId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      console.log('❌ Database write/read test failed');
    }
    
    // 5. Check pending schedules
    const now = new Date();
    const pendingSchedules = await new Promise((resolve, reject) => {
      db.all(`SELECT s.*, st.title as stream_title 
              FROM stream_schedules s 
              LEFT JOIN streams st ON s.stream_id = st.id 
              WHERE s.status = 'pending' AND s.schedule_time <= ?
              ORDER BY s.schedule_time`, [now.toISOString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`\n5. Overdue Pending Schedules: ${pendingSchedules.length}`);
    if (pendingSchedules.length > 0) {
      console.log('❌ SCHEDULER ISSUE CONFIRMED');
      pendingSchedules.forEach(schedule => {
        const scheduleTime = new Date(schedule.schedule_time);
        const minutesOverdue = Math.round((now - scheduleTime) / (1000 * 60));
        console.log(`   - ${schedule.stream_title}: ${minutesOverdue} minutes overdue`);
      });
    }
    
    // 6. Recommendations
    console.log('\n=== NEXT STEPS ===');
    
    if (channels.length === 0) {
      console.log('1. RECONNECT YOUTUBE:');
      console.log('   - Go to dashboard');
      console.log('   - Click "Connect YouTube"');
      console.log('   - Complete OAuth flow');
    }
    
    if (channels.length > 0) {
      const multipleDefaults = Object.keys(userDefaults).some(userId => userDefaults[userId] > 1);
      if (multipleDefaults) {
        console.log('2. FIX MULTIPLE DEFAULTS:');
        console.log('   sqlite3 db/streambro.db "UPDATE youtube_channels SET is_default = 0"');
        console.log('   sqlite3 db/streambro.db "UPDATE youtube_channels SET is_default = 1 WHERE rowid IN (SELECT rowid FROM youtube_channels GROUP BY user_id)"');
      }
    }
    
    if (pendingSchedules.length > 0) {
      console.log('3. RESTART SCHEDULER:');
      console.log('   pm2 restart streambro');
    }
    
    if (streams.length > 0 && schedules.length > 0) {
      console.log('4. TEST MANUAL STREAM:');
      console.log('   - Create new stream with "Stream Now"');
      console.log('   - Check if it goes live immediately');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    db.close();
  }
}

testChannelConnection();