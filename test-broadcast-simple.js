/**
 * Simple Broadcast Scheduler Test
 * Tests if broadcast is created correctly for a schedule
 */

const { db } = require('./db/database');
const broadcastScheduler = require('./services/broadcastScheduler');

async function simpleTest() {
  console.log('\n🧪 SIMPLE BROADCAST SCHEDULER TEST\n');
  
  try {
    // Get first pending schedule with YouTube API
    const schedule = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          ss.*,
          s.title,
          s.youtube_description,
          s.youtube_privacy,
          s.youtube_stream_id,
          s.youtube_made_for_kids,
          s.youtube_age_restricted,
          s.youtube_auto_start,
          s.youtube_auto_end,
          s.youtube_tags,
          s.youtube_category_id,
          s.youtube_language,
          s.video_thumbnail,
          s.user_id
        FROM stream_schedules ss
        JOIN streams s ON ss.stream_id = s.id
        WHERE ss.status = 'pending'
          AND s.use_youtube_api = 1
          AND (ss.broadcast_status IS NULL OR ss.broadcast_status = 'pending')
        ORDER BY ss.schedule_time ASC
        LIMIT 1
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!schedule) {
      console.log('❌ No pending schedule found with YouTube API');
      console.log('Please create a scheduled stream first.');
      process.exit(0);
    }
    
    console.log('📋 Schedule Info:');
    console.log(`   ID: ${schedule.id}`);
    console.log(`   Stream: ${schedule.title}`);
    console.log(`   Time: ${new Date(schedule.schedule_time).toLocaleString()}`);
    console.log(`   Stream Key: ${schedule.youtube_stream_id}`);
    console.log(`   Current Broadcast ID: ${schedule.youtube_broadcast_id || 'NONE'}`);
    console.log(`   Thumbnail: ${schedule.video_thumbnail || 'NONE'}`);
    
    console.log('\n🚀 Creating broadcast...\n');
    
    const broadcastId = await broadcastScheduler.createBroadcastForSchedule(schedule);
    
    if (broadcastId) {
      console.log('\n✅ SUCCESS!');
      console.log(`   Broadcast ID: ${broadcastId}`);
      
      // Verify in database
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
      
      console.log(`   Status in DB: ${result.broadcast_status}`);
      console.log(`   Broadcast ID in DB: ${result.youtube_broadcast_id}`);
      
      console.log('\n📺 Check YouTube Studio to verify:');
      console.log('   - Broadcast should have title, description, thumbnail');
      console.log('   - Status should be "Upcoming"');
      console.log('   - Stream key should match');
      
    } else {
      console.log('\n❌ FAILED to create broadcast');
      console.log('Check logs above for error details');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

simpleTest();
