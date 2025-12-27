const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/streambro.db');

console.log('=== Videos Table Schema ===\n');

db.all('PRAGMA table_info(videos)', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log('Columns:');
  rows.forEach(r => {
    console.log(`  ${r.name} (${r.type})`);
  });

  db.close();
});
