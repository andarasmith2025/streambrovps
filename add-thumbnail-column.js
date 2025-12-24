const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./streambro.db');

console.log('[Migration] Adding youtube_thumbnail_path column to streams table...');

db.run(`
  ALTER TABLE streams 
  ADD COLUMN youtube_thumbnail_path TEXT
`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('[Migration] ✓ Column youtube_thumbnail_path already exists');
    } else {
      console.error('[Migration] ✗ Error:', err.message);
    }
  } else {
    console.log('[Migration] ✓ Column youtube_thumbnail_path added successfully');
  }
  
  db.close();
});
