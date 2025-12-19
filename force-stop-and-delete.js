const sqlite3 = require('sqlite3').verbose();

console.log('🛑 Force stopping and deleting all streams...\n');

const db = new sqlite3.Database('./db/streambro.db', (err) => {
  if (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
  
  // First, get all streams
  db.all('SELECT id, title, status FROM streams', [], (err, streams) => {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }
    
    console.log(`Found ${streams.length} stream(s):\n`);
    streams.forEach(s => {
      console.log(`  • ${s.title} (${s.status})`);
    });
    
    console.log('\n🛑 Setting all streams to offline...');
    
    // Set all to offline
    db.run("UPDATE streams SET status = 'offline', end_time = datetime('now')", [], function(err) {
      if (err) {
        console.error('❌ Error updating streams:', err.message);
      } else {
        console.log(`✅ Updated ${this.changes} stream(s) to offline`);
      }
      
      console.log('🗑️  Deleting all schedules...');
      
      db.run('DELETE FROM stream_schedules', [], function(err) {
        if (err) {
          console.error('❌ Error deleting schedules:', err.message);
        } else {
          console.log(`✅ Deleted ${this.changes} schedule(s)`);
        }
        
        console.log('🗑️  Deleting all streams...');
        
        db.run('DELETE FROM streams', [], function(err) {
          if (err) {
            console.error('❌ Error deleting streams:', err.message);
          } else {
            console.log(`✅ Deleted ${this.changes} stream(s)`);
          }
          
          console.log('\n✅ All streams stopped and deleted!');
          console.log('💡 Refresh browser to see changes');
          console.log('⚠️  Note: FFmpeg processes may still be running');
          console.log('   Check with: pm2 logs streambro\n');
          
          db.close();
        });
      });
    });
  });
});
