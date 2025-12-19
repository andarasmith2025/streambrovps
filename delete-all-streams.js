const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== DELETE ALL STREAMS & SCHEDULES ===\n');
console.log('⚠️  WARNING: This will delete ALL streams and schedules from database!\n');

rl.question('Are you sure? Type "yes" to confirm: ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Cancelled. No data was deleted.');
    rl.close();
    process.exit(0);
  }
  
  const db = new sqlite3.Database('./db/streambro.db', (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
      rl.close();
      process.exit(1);
    }
    
    console.log('\n🗑️  Deleting all schedules...');
    
    db.run('DELETE FROM stream_schedules', [], function(err) {
      if (err) {
        console.error('❌ Error deleting schedules:', err.message);
        db.close();
        rl.close();
        return;
      }
      
      console.log(`✅ Deleted ${this.changes} schedule(s)`);
      
      console.log('🗑️  Deleting all streams...');
      
      db.run('DELETE FROM streams', [], function(err) {
        if (err) {
          console.error('❌ Error deleting streams:', err.message);
          db.close();
          rl.close();
          return;
        }
        
        console.log(`✅ Deleted ${this.changes} stream(s)`);
        console.log('\n✅ All streams and schedules have been deleted!');
        console.log('💡 Refresh your browser to see the changes.\n');
        
        db.close();
        rl.close();
      });
    });
  });
});
