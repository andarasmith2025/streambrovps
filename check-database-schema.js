const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CHECKING DATABASE SCHEMA ===\n');

// Check streams table
db.all("PRAGMA table_info(streams)", (err, columns) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('📋 STREAMS TABLE:');
  console.log('Columns:', columns.length);
  console.log('');
  
  const requiredFields = [
    'id', 'title', 'video_id', 'rtmp_url', 'stream_key', 'platform', 
    'status', 'bitrate', 'resolution', 'fps', 'orientation',
    'use_youtube_api', 'youtube_broadcast_id', 'youtube_description',
    'youtube_privacy', 'youtube_made_for_kids', 'youtube_age_restricted',
    'youtube_synthetic_content', 'youtube_auto_start', 'youtube_auto_end',
    'schedule_time', 'duration', 'user_id', 'created_at'
  ];
  
  const existingFields = columns.map(c => c.name);
  
  console.log('✓ Existing fields:');
  existingFields.forEach(f => console.log(`  - ${f}`));
  console.log('');
  
  console.log('🔍 Required fields check:');
  requiredFields.forEach(field => {
    const exists = existingFields.includes(field);
    console.log(`  ${exists ? '✓' : '❌'} ${field}`);
  });
  console.log('');
  
  // Check stream_schedules table
  db.all("PRAGMA table_info(stream_schedules)", (err2, schedColumns) => {
    if (err2) {
      console.error('Error:', err2);
      process.exit(1);
    }
    
    console.log('📅 STREAM_SCHEDULES TABLE:');
    console.log('Columns:', schedColumns.length);
    console.log('');
    
    const schedRequiredFields = [
      'id', 'stream_id', 'schedule_time', 'duration', 
      'is_recurring', 'recurring_days', 'status', 'created_at'
    ];
    
    const schedExistingFields = schedColumns.map(c => c.name);
    
    console.log('✓ Existing fields:');
    schedExistingFields.forEach(f => console.log(`  - ${f}`));
    console.log('');
    
    console.log('🔍 Required fields check:');
    schedRequiredFields.forEach(field => {
      const exists = schedExistingFields.includes(field);
      console.log(`  ${exists ? '✓' : '❌'} ${field}`);
    });
    console.log('');
    
    // Check youtube_tokens table
    db.all("PRAGMA table_info(youtube_tokens)", (err3, tokenColumns) => {
      if (err3) {
        console.error('Error:', err3);
        process.exit(1);
      }
      
      console.log('🔑 YOUTUBE_TOKENS TABLE:');
      console.log('Columns:', tokenColumns.length);
      console.log('');
      
      const tokenExistingFields = tokenColumns.map(c => c.name);
      
      console.log('✓ Existing fields:');
      tokenExistingFields.forEach(f => console.log(`  - ${f}`));
      console.log('');
      
      console.log('=== WORKFLOW CHECK ===\n');
      
      console.log('✅ YouTube API Stream Creation Workflow:');
      console.log('1. User fills form in YouTube API tab');
      console.log('2. Frontend sends POST /api/streams with:');
      console.log('   - useYouTubeAPI: true');
      console.log('   - youtubeStreamId: <selected stream ID>');
      console.log('   - youtubeDescription, youtubePrivacy, etc.');
      console.log('   - youtubeThumbnail (file upload)');
      console.log('   - schedules: [{schedule_time, duration, is_recurring}]');
      console.log('');
      console.log('3. Backend (app.js) creates:');
      console.log('   - Stream record in streams table');
      console.log('   - Schedule records in stream_schedules table');
      console.log('   - YouTube broadcast via youtubeService.scheduleLive()');
      console.log('   - Upload thumbnail via youtubeService.setThumbnail()');
      console.log('   - Set audience via youtubeService.setAudience()');
      console.log('');
      console.log('4. Scheduler (schedulerService.js) checks every minute:');
      console.log('   - Finds pending schedules');
      console.log('   - Starts stream when schedule_time matches');
      console.log('   - FFmpeg streams to RTMP URL');
      console.log('');
      console.log('5. Auto-start/Auto-end (if enabled):');
      console.log('   - youtube_auto_start: Broadcast auto-transitions to live');
      console.log('   - youtube_auto_end: Broadcast auto-ends when stream stops');
      console.log('');
      
      console.log('=== MISSING FIELDS CHECK ===\n');
      
      const missingInStreams = requiredFields.filter(f => !existingFields.includes(f));
      const missingInSchedules = schedRequiredFields.filter(f => !schedExistingFields.includes(f));
      
      if (missingInStreams.length > 0) {
        console.log('❌ Missing in streams table:');
        missingInStreams.forEach(f => console.log(`  - ${f}`));
        console.log('');
      } else {
        console.log('✅ All required fields exist in streams table');
        console.log('');
      }
      
      if (missingInSchedules.length > 0) {
        console.log('❌ Missing in stream_schedules table:');
        missingInSchedules.forEach(f => console.log(`  - ${f}`));
        console.log('');
      } else {
        console.log('✅ All required fields exist in stream_schedules table');
        console.log('');
      }
      
      db.close();
      process.exit(0);
    });
  });
});
