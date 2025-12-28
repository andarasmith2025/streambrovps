require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

async function checkCurrentStreams() {
  try {
    console.log('\n=== CURRENT STREAMS STATUS ===\n');
    
    const streamIds = [
      'f4cbdb5b-4e30-4390-b211-76f742daa553', // coba single jadwal
      '477f75f8-55d6-4ce9-be63-9752b81edd07'  // multi jadwal
    ];
    
    for (const streamId of streamIds) {
      const stream = await new Promise((resolve, reject) => {
        db.get(`
          SELECT id, title, status, youtube_broadcast_id, scheduled_end_time, active_schedule_id
          FROM streams 
          WHERE id = ?
        `, [streamId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (stream) {
        console.log('Stream:', stream.title);
        console.log('  Status:', stream.status);
        console.log('  Broadcast ID:', stream.youtube_broadcast_id || 'None');
        console.log('  Scheduled End Time:', stream.scheduled_end_time || 'None');
        console.log('  Active Schedule ID:', stream.active_schedule_id || 'None');
        console.log('');
      }
    }
    
    console.log('=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

checkCurrentStreams();
