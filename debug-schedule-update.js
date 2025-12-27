const { db } = require('./db/database');

// Test stream ID - ganti dengan ID stream HSN Anda
const TEST_STREAM_ID = '32bcf084-5af7-4ce7-a006-075793c1f688';

console.log('=== DEBUG SCHEDULE UPDATE ===\n');

async function debugSchedule() {
  try {
    // Get stream info
    const stream = await new Promise((resolve, reject) => {
      db.get(`SELECT id, title, schedule_time, duration, status FROM streams WHERE id = ?`, 
        [TEST_STREAM_ID], 
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!stream) {
      console.error('❌ Stream not found!');
      process.exit(1);
    }
    
    console.log('📺 STREAM INFO:');
    console.log('  ID:', stream.id);
    console.log('  Title:', stream.title);
    console.log('  Schedule Time (main):', stream.schedule_time);
    console.log('  Duration:', stream.duration, 'minutes');
    console.log('  Status:', stream.status);
    
    // Get all schedules for this stream
    console.log('\n📅 SCHEDULES:');
    const schedules = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          id, stream_id, schedule_time, duration, 
          status, is_recurring, recurring_days,
          created_at, updated_at, executed_at
        FROM stream_schedules 
        WHERE stream_id = ?
        ORDER BY schedule_time ASC
      `, [TEST_STREAM_ID], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (schedules.length === 0) {
      console.log('  ⚠️ No schedules found for this stream');
    } else {
      schedules.forEach((schedule, index) => {
        console.log(`\n  Schedule ${index + 1}:`);
        console.log('    ID:', schedule.id);
        console.log('    Schedule Time:', schedule.schedule_time);
        console.log('    Duration:', schedule.duration, 'minutes');
        console.log('    Status:', schedule.status);
        console.log('    Is Recurring:', schedule.is_recurring ? 'YES' : 'NO');
        console.log('    Recurring Days:', schedule.recurring_days || '(none)');
        console.log('    Created At:', schedule.created_at);
        console.log('    Updated At:', schedule.updated_at || '(never)');
        console.log('    Executed At:', schedule.executed_at || '(not executed)');
        
        // Parse and display in readable format
        const scheduleDate = new Date(schedule.schedule_time);
        console.log('    Readable Time:', scheduleDate.toLocaleString('id-ID', { 
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }));
      });
    }
    
    console.log('\n=== TESTING SCHEDULE UPDATE ===\n');
    console.log('To test schedule update:');
    console.log('1. Edit stream in dashboard');
    console.log('2. Change schedule time (e.g., from 09:05 to 10:00)');
    console.log('3. Save stream');
    console.log('4. Run this script again to verify');
    console.log('\nExpected behavior:');
    console.log('- Old schedule should be deleted');
    console.log('- New schedule should be created with new time');
    console.log('- stream.schedule_time should match first schedule');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugSchedule();
