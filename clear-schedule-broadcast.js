const { db } = require('./db/database');

const scheduleId = 'f969c94f-7d75-4107-bf00-f7abfa7ce685';

db.run(
  `UPDATE stream_schedules 
   SET youtube_broadcast_id = NULL, 
       broadcast_status = 'pending' 
   WHERE id = ?`,
  [scheduleId],
  function(err) {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('✅ Cleared broadcast_id from schedule');
      console.log(`   Updated ${this.changes} row(s)`);
      console.log('');
      console.log('Schedule is now ready for next execution');
      console.log('UI will no longer show this as active');
    }
    db.close();
  }
);
