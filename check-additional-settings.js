const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./streambro.db');

console.log('Checking Additional Settings for recent streams...\n');

db.all(`
  SELECT 
    id, 
    stream_title, 
    youtube_synthetic_content, 
    youtube_auto_start, 
    youtube_auto_end,
    updated_at
  FROM streams 
  WHERE user_id='d08453ff-6fa0-445a-947d-c7cb1ac7acfb' 
  ORDER BY updated_at DESC 
  LIMIT 5
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Recent Streams:');
    console.log('================\n');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.stream_title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Synthetic Content: ${row.youtube_synthetic_content === 1 ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   Auto Start: ${row.youtube_auto_start === 1 ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   Auto End: ${row.youtube_auto_end === 1 ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   Updated: ${row.updated_at}`);
      console.log('');
    });
  }
  db.close();
});
