require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

async function checkMultiJadwal() {
  try {
    console.log('\n=== CHECKING MULTI JADWAL ===\n');
    
    const streamId = '63ec7285-df9d-46c2-93ee-abb18e43b538';
    
    const stream = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, title, status, youtube_thumbnail_path, youtube_broadcast_id, created_at
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
    console.log('   Thumbnail Path:', stream.youtube_thumbnail_path || 'None');
    console.log('   Broadcast ID:', stream.youtube_broadcast_id || 'None');
    console.log('   Created:', stream.created_at);
    
    // Get schedules
    const schedules = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, schedule_time, duration, is_recurring, recurring_days
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
      const schedTime = new Date(sch.schedule_time);
      const timeStr = schedTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`   ${idx + 1}. ${timeStr} (${sch.duration}min) - Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
    });
    
    // Check if thumbnail file exists
    if (stream.youtube_thumbnail_path) {
      const fs = require('fs');
      let thumbnailPath = stream.youtube_thumbnail_path;
      
      // Check different path variations
      const pathVariations = [
        thumbnailPath,
        path.join(__dirname, 'public', thumbnailPath),
        path.join(__dirname, thumbnailPath)
      ];
      
      console.log('\n🖼️  Thumbnail Check:');
      let found = false;
      for (const p of pathVariations) {
        if (fs.existsSync(p)) {
          console.log('   ✅ Found at:', p);
          const stats = fs.statSync(p);
          console.log('   Size:', (stats.size / 1024).toFixed(2), 'KB');
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log('   ❌ Thumbnail file NOT FOUND');
        console.log('   Tried paths:');
        pathVariations.forEach(p => console.log('     -', p));
      }
    }
    
    console.log('\n=== END ===\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

checkMultiJadwal();
