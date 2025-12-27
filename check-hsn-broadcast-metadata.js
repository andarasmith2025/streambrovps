const { db } = require('./db/database');

const HSN_STREAM_ID = '32bcf084-5af7-4ce7-a006-075793c1f688';
const HSN_SCHEDULE_ID = '99b6242a-2bb7-4e6d-a473-9827a78424bb';

console.log('=== CHECKING HSN BROADCAST METADATA ===\n');

// Check stream data
db.get(`
  SELECT 
    id, title,
    youtube_broadcast_id, youtube_channel_id, 
    stream_key, rtmp_url,
    video_thumbnail, youtube_thumbnail_path,
    youtube_description, youtube_privacy,
    youtube_tags, youtube_category_id, youtube_language,
    youtube_made_for_kids, youtube_age_restricted, youtube_synthetic_content,
    youtube_auto_start, youtube_auto_end,
    status, start_time, active_schedule_id,
    use_youtube_api
  FROM streams 
  WHERE id = ?
`, [HSN_STREAM_ID], (err, stream) => {
  if (err) {
    console.error('Error fetching stream:', err);
    process.exit(1);
  }
  
  if (!stream) {
    console.error('Stream not found!');
    process.exit(1);
  }
  
  console.log('📺 STREAM DATA:');
  console.log('  ID:', stream.id);
  console.log('  Title:', stream.title);
  console.log('  Status:', stream.status);
  console.log('  Start Time:', stream.start_time);
  console.log('\n🎬 YOUTUBE SETTINGS:');
  console.log('  Broadcast ID:', stream.youtube_broadcast_id || '(none)');
  console.log('  Channel ID:', stream.youtube_channel_id || '(default)');
  console.log('  Stream Key:', stream.stream_key ? stream.stream_key.substring(0, 8) + '...' : '(none)');
  console.log('  RTMP URL:', stream.rtmp_url);
  console.log('\n🖼️ METADATA:');
  console.log('  Thumbnail (video):', stream.video_thumbnail || '(none)');
  console.log('  Thumbnail (YouTube):', stream.youtube_thumbnail_path || '(none)');
  console.log('  YouTube Description:', stream.youtube_description || '(none)');
  console.log('  Privacy:', stream.youtube_privacy || '(none)');
  console.log('  Tags:', stream.youtube_tags || '(none)');
  console.log('  Category ID:', stream.youtube_category_id || '(none)');
  console.log('  Language:', stream.youtube_language || '(none)');
  console.log('\n⚙️ AUTO SETTINGS:');
  console.log('  Use YouTube API:', stream.use_youtube_api ? 'YES' : 'NO');
  console.log('  Made for Kids:', stream.youtube_made_for_kids ? 'YES' : 'NO');
  console.log('  Age Restricted:', stream.youtube_age_restricted ? 'YES' : 'NO');
  console.log('  Synthetic Content:', stream.youtube_synthetic_content ? 'YES' : 'NO');
  console.log('  Auto Start:', stream.youtube_auto_start ? 'YES' : 'NO');
  console.log('  Auto End:', stream.youtube_auto_end ? 'YES' : 'NO');
  console.log('  Active Schedule ID:', stream.active_schedule_id || '(none)');
  
  // Check schedule data
  console.log('\n=== CHECKING SCHEDULE DATA ===\n');
  db.get(`
    SELECT 
      id, stream_id,
      youtube_broadcast_id, broadcast_status,
      schedule_time, duration, status,
      is_recurring, recurring_days,
      created_at, executed_at
    FROM stream_schedules 
    WHERE id = ?
  `, [HSN_SCHEDULE_ID], (err, schedule) => {
    if (err) {
      console.error('Error fetching schedule:', err);
      process.exit(1);
    }
    
    if (!schedule) {
      console.error('Schedule not found!');
      process.exit(1);
    }
    
    console.log('📅 SCHEDULE DATA:');
    console.log('  ID:', schedule.id);
    console.log('  Stream ID:', schedule.stream_id);
    console.log('  Schedule Time:', schedule.schedule_time);
    console.log('  Duration:', schedule.duration, 'minutes');
    console.log('  Status:', schedule.status);
    console.log('  Is Recurring:', schedule.is_recurring ? 'YES' : 'NO');
    console.log('  Recurring Days:', schedule.recurring_days || '(none)');
    console.log('\n🎬 BROADCAST INFO:');
    console.log('  Broadcast ID:', schedule.youtube_broadcast_id || '(none)');
    console.log('  Broadcast Status:', schedule.broadcast_status || '(none)');
    console.log('  Created At:', schedule.created_at);
    console.log('  Executed At:', schedule.executed_at || '(not executed yet)');
    
    // Check if broadcast exists and has metadata
    if (schedule.youtube_broadcast_id) {
      console.log('\n=== BROADCAST EXISTS ===');
      console.log('✅ Broadcast ID found in schedule:', schedule.youtube_broadcast_id);
      console.log('⚠️ Need to check YouTube API to verify metadata was applied');
      console.log('\nTo verify metadata on YouTube:');
      console.log('1. Go to YouTube Studio');
      console.log('2. Find broadcast:', schedule.youtube_broadcast_id);
      console.log('3. Check if thumbnail and metadata are present');
    } else {
      console.log('\n=== NO BROADCAST CREATED ===');
      console.log('❌ Schedule has no broadcast ID');
      console.log('❌ This means broadcast creation failed');
      console.log('\nPossible reasons:');
      console.log('1. Stream key not found in YouTube channel');
      console.log('2. YouTube API authentication failed');
      console.log('3. Broadcast creation error (check logs)');
    }
    
    process.exit(0);
  });
});
