const { db } = require('./db/database');

console.log('=== CHECKING STREAM_SCHEDULES SCHEMA ===\n');

db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='stream_schedules'", [], (err, row) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (row) {
    console.log('Table exists!');
    console.log('\nSchema:');
    console.log(row.sql);
    console.log('\n');
    
    // Check if end_time column exists
    db.all("PRAGMA table_info(stream_schedules)", [], (err, columns) => {
      if (err) {
        console.error('Error getting columns:', err);
        process.exit(1);
      }
      
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      
      const hasEndTime = columns.some(col => col.name === 'end_time');
      console.log('\nHas end_time column?', hasEndTime ? 'YES' : 'NO');
      
      process.exit(0);
    });
  } else {
    console.log('Table does NOT exist!');
    process.exit(0);
  }
});
