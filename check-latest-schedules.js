require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

async function checkLatestSchedules() {
  try {
    console.log('\n=== LATEST SCHEDULES (Admin User) ===\n');
    
    const userId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
    
    // Get latest streams
    const streams = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, title, schedule_time, duration, status, created_at
        FROM streams 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Latest', streams.length, 'streams:\n');
    
    for (const stream of streams) {
      console.log('📺 Stream:', stream.title);
      console.log('   ID:', stream.id);
      console.log('   Status:', stream.status);
      console.log('   Created:', stream.created_at);
      
      // Get schedules for this stream
      const schedules = await new Promise((resolve, reject) => {
        db.all(`
          SELECT id, schedule_time, duration, end_time, is_recurring, recurring_days
          FROM stream_schedules
          WHERE stream_id = ?
          ORDER BY schedule_time
        `, [stream.id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      if (schedules.length > 0) {
        console.log('   📅 Schedules (' + schedules.length + '):');
        schedules.forEach((sch, idx) => {
          const schedTime = new Date(sch.schedule_time);
          const timeStr = schedTime.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          console.log(`      ${idx + 1}. ${timeStr} (${sch.duration}min) - Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
          if (sch.is_recurring) {
            console.log(`         Days: ${sch.recurring_days}`);
          }
        });
      } else {
        console.log('   No schedules');
      }
      console.log('');
    }
    
    // Get current time
    const now = new Date();
    console.log('Current time:', now.toLocaleString('en-US', { 
      timeZone: 'Asia/Jakarta',
      hour12: false 
    }));
    
    console.log('\n=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

checkLatestSchedules();
