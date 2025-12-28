const { db } = require('./db/database');

const streamId = '7115a94c-c4e9-4a6d-abdd-98af73e728fa';

console.log('Fixing WidiWays stream - clearing old schedule data...\n');

db.run(
  'UPDATE streams SET active_schedule_id = NULL, scheduled_end_time = NULL, status = ? WHERE id = ?',
  ['scheduled', streamId],
  (err) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log('✅ Cleared active_schedule_id and scheduled_end_time');
    console.log('✅ Set status to "scheduled"');
    console.log('\nStream will start on next scheduler check (within 60 seconds)');
    process.exit(0);
  }
);
