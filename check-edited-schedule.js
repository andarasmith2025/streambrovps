require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

async function checkEditedSchedule() {
  try {
    console.log('\n=== CHECKING EDITED SCHEDULE ===\n');
    
    const streamId = '477f75f8-55d6-4ce9-be63-9752b81edd07';
    
    // Get stream info
    const stream = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, title, schedule_time, duration, status, created_at
        FROM streams 
        WHERE id = ?
      `, [streamId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('Stream Info:');
    console.log('  ID:', stream.id);
    console.log('  Title:', stream.title);
    console.log('  Schedule Time:', stream.schedule_time);
    console.log('  Duration:', stream.duration, 'minutes');
    console.log('  Status:', stream.status);
    console.log('  Created:', stream.created_at);
    
    // Get schedules
    const schedules = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, schedule_time, duration, end_time, is_recurring, recurring_days, created_at
        FROM stream_schedules
        WHERE stream_id = ?
        ORDER BY schedule_time
      `, [streamId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('\n📅 Schedules (' + schedules.length + '):');
    schedules.forEach((sch, idx) => {
      console.log(`\n  Schedule ${idx + 1}:`);
      console.log('    ID:', sch.id);
      console.log('    Schedule Time:', sch.schedule_time);
      console.log('    Duration:', sch.duration, 'minutes');
      console.log('    End Time:', sch.end_time);
      console.log('    Recurring:', sch.is_recurring ? 'Yes' : 'No');
      if (sch.is_recurring) {
        console.log('    Days:', sch.recurring_days);
      }
      console.log('    Created:', sch.created_at);
    });
    
    console.log('\n=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

checkEditedSchedule();
