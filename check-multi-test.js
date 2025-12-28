require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

async function checkMultiTest() {
  try {
    console.log('\n=== MULTI JADWAL TEST STATUS ===\n');
    
    const streamId = 'a90c2d49-b09c-4c90-ad94-e0bc38037316';
    
    const stream = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, title, status, youtube_broadcast_id, start_time, scheduled_end_time
        FROM streams 
        WHERE id = ?
      `, [streamId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!stream) {
      console.log('❌ Stream not found');
      return;
    }
    
    console.log('📺 Stream:', stream.title);
    console.log('   Status:', stream.status);
    console.log('   Broadcast ID:', stream.youtube_broadcast_id || 'None');
    console.log('   Start Time:', stream.start_time || 'Not started');
    console.log('   Scheduled End:', stream.scheduled_end_time || 'Not set');
    
    console.log('\n=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

checkMultiTest();
