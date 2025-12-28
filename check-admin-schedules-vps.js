const { db } = require('./db/database');

const ADMIN_USER_ID = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';

console.log('Checking schedules for Admin account...\n');
console.log('Admin User ID:', ADMIN_USER_ID);
console.log('='.repeat(80));

// Check streams owned by admin
db.all(
  `SELECT id, title, status, use_youtube_api, youtube_channel_id, created_at 
   FROM streams 
   WHERE user_id = ?
   ORDER BY created_at DESC`,
  [ADMIN_USER_ID],
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    console.log(`\n📺 ADMIN STREAMS: ${streams.length} stream(s)\n`);
    
    if (streams.length === 0) {
      console.log('   ❌ No streams found for Admin account\n');
    } else {
      streams.forEach((s, i) => {
        console.log(`${i + 1}. ${s.title}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   Status: ${s.status}`);
        console.log(`   YouTube API: ${s.use_youtube_api ? 'Yes' : 'No'}`);
        console.log(`   Channel ID: ${s.youtube_channel_id || 'NULL'}`);
        console.log(`   Created: ${s.created_at}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(80));
    
    // Check schedules for admin's streams
    if (streams.length > 0) {
      const streamIds = streams.map(s => `'${s.id}'`).join(',');
      
      db.all(
        `SELECT 
          ss.id as schedule_id,
          ss.stream_id,
          ss.schedule_time,
          ss.duration,
          ss.is_recurring,
          ss.recurring_days,
          ss.status,
          ss.broadcast_status,
          ss.youtube_broadcast_id,
          ss.created_at,
          s.title as stream_title
         FROM stream_schedules ss
         JOIN streams s ON ss.stream_id = s.id
         WHERE ss.stream_id IN (${streamIds})
         ORDER BY ss.created_at DESC`,
        [],
        (err, schedules) => {
          if (err) {
            console.error('Error:', err);
            db.close();
            return;
          }
          
          console.log(`\n📅 ADMIN SCHEDULES: ${schedules.length} schedule(s)\n`);
          
          if (schedules.length === 0) {
            console.log('   ❌ No schedules found for Admin streams\n');
          } else {
            // Group by status
            const pending = schedules.filter(s => s.status === 'pending');
            const completed = schedules.filter(s => s.status === 'completed');
            const failed = schedules.filter(s => s.status === 'failed');
            
            console.log(`   Pending: ${pending.length}`);
            console.log(`   Completed: ${completed.length}`);
            console.log(`   Failed: ${failed.length}\n`);
            
            if (pending.length > 0) {
              console.log('   PENDING SCHEDULES:');
              console.log('   ' + '-'.repeat(76));
              pending.forEach((sch, i) => {
                console.log(`   ${i + 1}. ${sch.stream_title}`);
                console.log(`      Schedule ID: ${sch.schedule_id}`);
                console.log(`      Time: ${sch.schedule_time}`);
                console.log(`      Duration: ${sch.duration} minutes`);
                console.log(`      Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
                if (sch.is_recurring) {
                  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const selectedDays = sch.recurring_days.split(',').map(d => days[parseInt(d)]).join(', ');
                  console.log(`      Days: ${selectedDays}`);
                }
                console.log(`      Broadcast Status: ${sch.broadcast_status || 'NULL'}`);
                console.log(`      Broadcast ID: ${sch.youtube_broadcast_id || 'NULL'}`);
                console.log(`      Created: ${sch.created_at}`);
                console.log('');
              });
            }
            
            if (completed.length > 0) {
              console.log(`   ✅ ${completed.length} completed schedule(s) (not shown)\n`);
            }
            
            if (failed.length > 0) {
              console.log(`   ❌ ${failed.length} failed schedule(s) (not shown)\n`);
            }
          }
          
          console.log('='.repeat(80));
          db.close();
        }
      );
    } else {
      console.log('\n💡 TIP: Create a new stream with YouTube API mode to test the broadcast fix\n');
      console.log('='.repeat(80));
      db.close();
    }
  }
);
