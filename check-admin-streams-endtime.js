/**
 * Check Admin streams for scheduled_end_time
 */

const { db } = require('./db/database');

async function checkAdminStreamsEndTime() {
  console.log('========================================');
  console.log('Checking Admin Streams - End Time');
  console.log('========================================\n');
  
  try {
    const adminUserId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
    
    // Get Admin streams
    const streams = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, title, status, scheduled_end_time, active_schedule_id, duration, start_time
         FROM streams 
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [adminUserId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`Found ${streams.length} stream(s) for Admin\n`);
    
    for (const stream of streams) {
      console.log(`Stream: ${stream.title}`);
      console.log(`  ID: ${stream.id.substring(0, 8)}...`);
      console.log(`  Status: ${stream.status}`);
      console.log(`  Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);
      console.log(`  Duration: ${stream.duration || 'NOT SET'} minutes`);
      console.log(`  Start Time: ${stream.start_time || 'NOT SET'}`);
      console.log(`  Scheduled End Time: ${stream.scheduled_end_time || 'NOT SET'}`);
      
      // If has active_schedule_id, get schedule details
      if (stream.active_schedule_id) {
        const schedule = await new Promise((resolve, reject) => {
          db.get(
            `SELECT schedule_time, duration, end_time FROM stream_schedules WHERE id = ?`,
            [stream.active_schedule_id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        
        if (schedule) {
          console.log(`  Schedule Time: ${schedule.schedule_time}`);
          console.log(`  Schedule Duration: ${schedule.duration} minutes`);
          console.log(`  Schedule End Time: ${schedule.end_time || 'NOT SET'}`);
        }
      }
      console.log('');
    }
    
    // Summary
    const withEndTime = streams.filter(s => s.scheduled_end_time);
    const withSchedule = streams.filter(s => s.active_schedule_id);
    
    console.log('========================================');
    console.log('SUMMARY:');
    console.log(`  Total Streams: ${streams.length}`);
    console.log(`  With scheduled_end_time: ${withEndTime.length}`);
    console.log(`  With active_schedule_id: ${withSchedule.length}`);
    
    if (withEndTime.length === 0 && streams.length > 0) {
      console.log('\n⚠️  No streams have scheduled_end_time yet');
      console.log('   This is normal - end_time will be set when stream starts');
    }
    
    console.log('========================================');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdminStreamsEndTime();
