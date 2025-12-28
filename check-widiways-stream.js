const { db } = require('./db/database');

const streamId = '7115a94c-c4e9-4a6d-abdd-98af73e728fa';

console.log('Checking WidiWays stream...\n');

db.get(
  'SELECT id, title, status, youtube_broadcast_id, active_schedule_id, scheduled_end_time FROM streams WHERE id = ?',
  [streamId],
  (err, stream) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log('Stream:', JSON.stringify(stream, null, 2));
    
    // Check schedule
    db.get(
      'SELECT * FROM stream_schedules WHERE stream_id = ? ORDER BY created_at DESC LIMIT 1',
      [streamId],
      (err, schedule) => {
        if (err) {
          console.error('Error:', err);
          process.exit(1);
        }
        
        console.log('\nSchedule:', JSON.stringify(schedule, null, 2));
        process.exit(0);
      }
    );
  }
);
