const { db } = require('./db/database');

console.log('=== CHECKING STREAMS TABLE SCHEMA ===\n');

db.all(`PRAGMA table_info(streams)`, [], (err, columns) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('Columns in streams table:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  process.exit(0);
});
