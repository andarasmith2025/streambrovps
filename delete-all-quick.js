const sqlite3 = require('sqlite3').verbose();

console.log('🗑️  Deleting all streams and schedules...\n');

const db = new sqlite3.Database('./db/streambro.db', (err) => {
  if (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
  
  db.run('DELETE FROM stream_schedules', [], function(err) {
    if (err) {
      console.error('❌ Error deleting schedules:', err.message);
    } else {
      console.log(`✅ Deleted ${this.changes} schedule(s)`);
    }
    
    db.run('DELETE FROM streams', [], function(err) {
      if (err) {
        console.error('❌ Error deleting streams:', err.message);
      } else {
        console.log(`✅ Deleted ${this.changes} stream(s)`);
      }
      
      console.log('\n✅ Database cleaned!');
      console.log('💡 Refresh browser (Ctrl+Shift+R) to see changes\n');
      
      db.close();
    });
  });
});
