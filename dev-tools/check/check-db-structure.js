const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== CHECKING DATABASE STRUCTURE ===\n');

// Check both databases
const databases = [
  { name: 'streambro-server1.db', path: path.join(__dirname, 'streambro-server1.db') },
  { name: 'db/streambro.db', path: path.join(__dirname, 'db', 'streambro.db') }
];

databases.forEach((dbInfo, dbIdx) => {
  const db = new sqlite3.Database(dbInfo.path);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DATABASE: ${dbInfo.name}`);
  console.log(`PATH: ${dbInfo.path}`);
  console.log('='.repeat(60));
  
  // Get table list
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log(`\nTables (${tables.length}):`);
    tables.forEach(t => console.log(`  - ${t.name}`));
    
    // Get streams table structure
    db.all("PRAGMA table_info(streams)", [], (err, columns) => {
      if (err) {
        console.error('\nError getting streams structure:', err);
      } else {
        console.log(`\nSTREAMS table columns (${columns.length}):`);
        columns.forEach(col => {
          console.log(`  ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });
      }
      
      // Get stream_schedules table structure
      db.all("PRAGMA table_info(stream_schedules)", [], (err, columns) => {
        if (err) {
          console.error('\nError getting stream_schedules structure:', err);
        } else {
          console.log(`\nSTREAM_SCHEDULES table columns (${columns.length}):`);
          columns.forEach(col => {
            console.log(`  ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
          });
        }
        
        // Count records
        db.get("SELECT COUNT(*) as count FROM streams", [], (err, result) => {
          const streamCount = err ? 0 : result.count;
          
          db.get("SELECT COUNT(*) as count FROM stream_schedules", [], (err, result) => {
            const scheduleCount = err ? 0 : result.count;
            
            db.get("SELECT COUNT(*) as count FROM users", [], (err, result) => {
              const userCount = err ? 0 : result.count;
              
              console.log(`\nRECORD COUNTS:`);
              console.log(`  Streams: ${streamCount}`);
              console.log(`  Schedules: ${scheduleCount}`);
              console.log(`  Users: ${userCount}`);
              
              db.close();
              
              // Exit after checking last database
              if (dbIdx === databases.length - 1) {
                console.log('\n' + '='.repeat(60));
                console.log('\n✓ Database structure check completed\n');
                process.exit(0);
              }
            });
          });
        });
      });
    });
  });
});
