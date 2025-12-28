/**
 * Check Current State - December 28, 2024 13:00+
 * Cek kondisi setelah jadwal 12:45 gagal
 */

const { db } = require('./db/database');

console.log('========================================');
console.log('CHECKING CURRENT STATE');
console.log('========================================\n');

// 1. Cek stream yang baru saja dijalankan
console.log('1. CHECKING RECENT STREAMS (last 2 hours)...\n');
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

db.all(
  `SELECT 
    id, title, status, 
    start_time, end_time,
    youtube_broadcast_id,
    active_schedule_id,
    duration
   FROM streams 
   WHERE start_time > ?
   ORDER BY start_time DESC`,
  [twoHoursAgo],
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    if (streams.length === 0) {
      console.log('❌ No streams found in last 2 hours\n');
    } else {
      console.log(`✓ Found ${streams.length} stream(s):\n`);
      streams.forEach(s => {
        console.log(`Stream ID: ${s.id}`);
        console.log(`  Title: ${s.title}`);
        console.log(`  Status: ${s.status}`);
        console.log(`  Start: ${s.start_time}`);
        console.log(`  End: ${s.end_time || 'NULL'}`);
        console.log(`  Broadcast ID: ${s.youtube_broadcast_id || 'NULL'}`);
        console.log(`  Active Schedule: ${s.active_schedule_id || 'NULL'}`);
        console.log(`  Duration: ${s.duration || 'NULL'} minutes`);
        console.log('');
      });
    }
    
    // 2. Cek schedules untuk stream tersebut
    console.log('2. CHECKING SCHEDULES FOR THESE STREAMS...\n');
    
    if (streams.length > 0) {
      const streamIds = streams.map(s => s.id).join(',');
      
      db.all(
        `SELECT 
          id, stream_id, schedule_time, duration, end_time,
          is_recurring, recurring_days,
          status, broadcast_status,
          youtube_broadcast_id
         FROM stream_schedules
         WHERE stream_id IN (${streamIds})
         ORDER BY schedule_time DESC`,
        [],
        (err, schedules) => {
          if (err) {
            console.error('Error:', err);
            return;
          }
          
          if (schedules.length === 0) {
            console.log('❌ No schedules found for these streams\n');
          } else {
            console.log(`✓ Found ${schedules.length} schedule(s):\n`);
            schedules.forEach(sch => {
              console.log(`Schedule ID: ${sch.id}`);
              console.log(`  Stream ID: ${sch.stream_id}`);
              console.log(`  Time: ${sch.schedule_time}`);
              console.log(`  Duration: ${sch.duration} minutes`);
              console.log(`  End Time: ${sch.end_time || 'NULL'}`);
              console.log(`  Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
              if (sch.is_recurring) {
                console.log(`  Days: ${sch.recurring_days}`);
              }
              console.log(`  Status: ${sch.status}`);
              console.log(`  Broadcast Status: ${sch.broadcast_status || 'NULL'}`);
              console.log(`  Broadcast ID: ${sch.youtube_broadcast_id || 'NULL'}`);
              console.log('');
            });
          }
          
          // 3. Cek pending schedules untuk hari ini
          console.log('3. CHECKING ALL PENDING SCHEDULES FOR TODAY...\n');
          
          const now = new Date();
          const today = now.getDay(); // 0-6
          
          db.all(
            `SELECT 
              ss.id, ss.stream_id, ss.schedule_time, ss.duration,
              ss.is_recurring, ss.recurring_days,
              ss.status, ss.broadcast_status, ss.youtube_broadcast_id,
              s.title, s.status as stream_status
             FROM stream_schedules ss
             JOIN streams s ON ss.stream_id = s.id
             WHERE ss.status = 'pending'
             ORDER BY ss.schedule_time ASC`,
            [],
            (err, pending) => {
              if (err) {
                console.error('Error:', err);
                db.close();
                return;
              }
              
              if (pending.length === 0) {
                console.log('❌ No pending schedules found\n');
              } else {
                console.log(`✓ Found ${pending.length} pending schedule(s):\n`);
                
                let todaySchedules = 0;
                pending.forEach(sch => {
                  let isToday = false;
                  
                  if (sch.is_recurring && sch.recurring_days) {
                    const days = sch.recurring_days.split(',').map(d => parseInt(d));
                    isToday = days.includes(today);
                  } else {
                    const schDate = new Date(sch.schedule_time);
                    isToday = schDate.toDateString() === now.toDateString();
                  }
                  
                  if (isToday) {
                    todaySchedules++;
                    console.log(`✅ TODAY - Schedule ID: ${sch.id}`);
                  } else {
                    console.log(`Schedule ID: ${sch.id}`);
                  }
                  
                  console.log(`  Stream: ${sch.title} (${sch.stream_id})`);
                  console.log(`  Stream Status: ${sch.stream_status}`);
                  console.log(`  Time: ${sch.schedule_time}`);
                  console.log(`  Duration: ${sch.duration} minutes`);
                  console.log(`  Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
                  if (sch.is_recurring) {
                    console.log(`  Days: ${sch.recurring_days}`);
                  }
                  console.log(`  Broadcast Status: ${sch.broadcast_status || 'NULL'}`);
                  console.log(`  Broadcast ID: ${sch.youtube_broadcast_id || 'NULL'}`);
                  console.log('');
                });
                
                console.log(`\n📊 Summary: ${todaySchedules} schedule(s) for TODAY (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][today]})\n`);
              }
              
              console.log('========================================');
              console.log('CHECK COMPLETE');
              console.log('========================================');
              
              db.close();
            }
          );
        }
      );
    } else {
      db.close();
    }
  }
);
