const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/streambro.db');

console.log('🔍 Checking recent streams for user d08453ff-6fa0-445a-947d-c7cb1ac7acfb...\n');

db.all(`
  SELECT 
    id, 
    title, 
    youtube_tags, 
    youtube_thumbnail_path, 
    youtube_synthetic_content, 
    youtube_auto_start, 
    youtube_auto_end,
    created_at,
    updated_at
  FROM streams 
  WHERE user_id='d08453ff-6fa0-445a-947d-c7cb1ac7acfb' 
  ORDER BY created_at DESC 
  LIMIT 5
`, (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log(`📊 Found ${rows.length} streams:\n`);
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Tags: ${row.youtube_tags || 'NULL'}`);
      console.log(`   Thumbnail: ${row.youtube_thumbnail_path || 'NULL'}`);
      console.log(`   Synthetic Content: ${row.youtube_synthetic_content === 1 ? '✅ YES' : '❌ NO'}`);
      console.log(`   Auto Start: ${row.youtube_auto_start === 1 ? '✅ YES' : '❌ NO'}`);
      console.log(`   Auto End: ${row.youtube_auto_end === 1 ? '✅ YES' : '❌ NO'}`);
      console.log(`   Created: ${row.created_at}`);
      console.log(`   Updated: ${row.updated_at}`);
      console.log('');
    });
  }
  db.close();
});