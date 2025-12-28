const { db } = require('./db/database');

console.log('Checking schedule details with stream info...\n');

db.all(
  `SELECT 
    ss.id as schedule_id,
    ss.stream_id,
    ss.schedule_time,
    ss.duration,
    ss.is_recurring,
    ss.recurring_days,
    ss.status as schedule_status,
    ss.broadcast_status,
    ss.youtube_broadcast_id,
    ss.created_at as schedule_created_at,
    s.title as stream_title,
    s.status as stream_status,
    s.youtube_channel_id,
    s.created_at as stream_created_at,
    s.updated_at as stream_updated_at
   FROM stream_schedules ss
   JOIN streams s ON ss.stream_id = s.id
   WHERE ss.status = 'pending'
   ORDER BY ss.schedule_time ASC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} pending schedule(s):\n`);
    console.log('='.repeat(80));
    
    rows.forEach((row, i) => {
      console.log(`\n${i + 1}. SCHEDULE ID: ${row.schedule_id}`);
      console.log('-'.repeat(80));
      console.log(`   Stream Title: ${row.stream_title}`);
      console.log(`   Stream ID: ${row.stream_id}`);
      console.log(`   Stream Status: ${row.stream_status}`);
      console.log(`   YouTube Channel ID: ${row.youtube_channel_id || 'NULL'}`);
      console.log('');
      console.log(`   Schedule Time: ${row.schedule_time}`);
      console.log(`   Duration: ${row.duration} minutes`);
      console.log(`   Recurring: ${row.is_recurring ? 'Yes' : 'No'}`);
      if (row.is_recurring) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = row.recurring_days.split(',').map(d => days[parseInt(d)]).join(', ');
        console.log(`   Recurring Days: ${selectedDays} (${row.recurring_days})`);
      }
      console.log('');
      console.log(`   Schedule Status: ${row.schedule_status}`);
      console.log(`   Broadcast Status: ${row.broadcast_status || 'NULL'}`);
      console.log(`   Broadcast ID: ${row.youtube_broadcast_id || 'NULL'}`);
      console.log('');
      console.log(`   Schedule Created: ${row.schedule_created_at}`);
      console.log(`   Stream Created: ${row.stream_created_at}`);
      console.log(`   Stream Updated: ${row.stream_updated_at}`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('\nNOTE: These schedules are still "pending" in database.');
    console.log('They should be cleaned up or completed after execution.');
    
    db.close();
  }
);
