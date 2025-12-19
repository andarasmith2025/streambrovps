const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('Connected to database\n');
  
  db.all('SELECT id, title, status, use_youtube_api, created_at FROM streams ORDER BY created_at DESC LIMIT 5', (err, rows) => {
    if (err) {
      console.error('Query error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${rows.length} stream(s):\n`);
    rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   YouTube API: ${row.use_youtube_api}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
    
    db.close();
    process.exit(0);
  });
});
