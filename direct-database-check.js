const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== Direct Database Check ===\n');

// Get absolute path to database
const dbPath = path.resolve(__dirname, 'db', 'streambro.db');
console.log('Database path:', dbPath);

// Check if file exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  console.log('❌ Database file does not exist at:', dbPath);
  process.exit(1);
}

const stats = fs.statSync(dbPath);
console.log('Database file size:', Math.round(stats.size / 1024), 'KB');
console.log('Last modified:', stats.mtime.toLocaleString());

// Connect directly to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database successfully\n');
});

// Check tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    return;
  }
  
  console.log('Tables in database:', tables.map(t => t.name).join(', '));
  
  // Check streams count
  db.get('SELECT COUNT(*) as count FROM streams', [], (err, row) => {
    if (err) {
      console.error('Error counting streams:', err);
    } else {
      console.log('Streams count:', row.count);
    }
    
    // If streams exist, show them
    if (row.count > 0) {
      db.all('SELECT id, title, status, platform, created_at FROM streams ORDER BY created_at DESC LIMIT 10', [], (err, streams) => {
        if (err) {
          console.error('Error getting streams:', err);
        } else {
          console.log('\nRecent streams:');
          streams.forEach((stream, index) => {
            console.log(`${index + 1}. ${stream.title} (${stream.id.substring(0, 8)}...)`);
            console.log(`   Status: ${stream.status}, Platform: ${stream.platform}`);
            console.log(`   Created: ${new Date(stream.created_at).toLocaleString()}`);
          });
        }
        
        // Check schedules
        db.get('SELECT COUNT(*) as count FROM stream_schedules', [], (err, row) => {
          if (err) {
            console.error('Error counting schedules:', err);
          } else {
            console.log('\nSchedules count:', row.count);
          }
          
          if (row.count > 0) {
            db.all(`SELECT s.id, s.schedule_time, s.status, s.duration, st.title as stream_title
                    FROM stream_schedules s
                    LEFT JOIN streams st ON s.stream_id = st.id
                    ORDER BY s.schedule_time DESC LIMIT 10`, [], (err, schedules) => {
              if (err) {
                console.error('Error getting schedules:', err);
              } else {
                console.log('\nRecent schedules:');
                schedules.forEach((schedule, index) => {
                  const scheduleTime = new Date(schedule.schedule_time);
                  console.log(`${index + 1}. ${schedule.stream_title || 'Unknown'}`);
                  console.log(`   Time: ${scheduleTime.toLocaleString()}`);
                  console.log(`   Status: ${schedule.status}, Duration: ${schedule.duration}min`);
                });
              }
              
              // Check current time and pending schedules
              const now = new Date();
              db.all(`SELECT s.*, st.title as stream_title
                      FROM stream_schedules s
                      LEFT JOIN streams st ON s.stream_id = st.id
                      WHERE s.status = 'pending' AND s.schedule_time <= ?
                      ORDER BY s.schedule_time`, [now.toISOString()], (err, pendingSchedules) => {
                if (err) {
                  console.error('Error getting pending schedules:', err);
                } else {
                  console.log(`\nOverdue pending schedules: ${pendingSchedules.length}`);
                  
                  pendingSchedules.forEach(schedule => {
                    const scheduleTime = new Date(schedule.schedule_time);
                    const minutesOverdue = Math.round((now - scheduleTime) / (1000 * 60));
                    console.log(`- ${schedule.stream_title}: ${minutesOverdue} minutes overdue`);
                  });
                  
                  if (pendingSchedules.length > 0) {
                    console.log('\n❌ SCHEDULER ISSUE: Found overdue pending schedules');
                    console.log('This confirms the scheduler is not executing schedules properly');
                  }
                }
                
                db.close();
              });
            });
          } else {
            db.close();
          }
        });
      });
    } else {
      // No streams found - check if this is the right database
      console.log('\n❌ No streams found in database');
      console.log('This suggests either:');
      console.log('1. Wrong database file');
      console.log('2. Database was cleared');
      console.log('3. Application uses different database');
      
      // Check for other database files
      console.log('\nLooking for other database files...');
      const currentDir = process.cwd();
      
      function findDbFiles(dir, depth = 0) {
        if (depth > 2) return; // Limit search depth
        
        try {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isFile() && file.endsWith('.db')) {
              const size = Math.round(stat.size / 1024);
              console.log(`Found: ${fullPath} (${size}KB, modified: ${stat.mtime.toLocaleString()})`);
            } else if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
              findDbFiles(fullPath, depth + 1);
            }
          });
        } catch (err) {
          // Ignore permission errors
        }
      }
      
      findDbFiles(currentDir);
      db.close();
    }
  });
});