const db = require('./db/database');

db.all(`
  SELECT 
    id, 
    title, 
    youtube_stream_id,
    youtube_made_for_kids, 
    youtube_age_restricted, 
    youtube_synthetic_content,
    created_at
  FROM streams 
  ORDER BY created_at DESC 
  LIMIT 3
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('\n=== Latest 3 Streams ===\n');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.title}`);
      console.log(`   ID: ${row.id}`);
      console.log(`   YouTube Stream ID: ${row.youtube_stream_id || 'NOT SET'}`);
      console.log(`   Made for Kids: ${row.youtube_made_for_kids ? 'YES' : 'NO'}`);
      console.log(`   Age Restricted: ${row.youtube_age_restricted ? 'YES' : 'NO'}`);
      console.log(`   Synthetic Content: ${row.youtube_synthetic_content ? 'YES' : 'NO'}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
  }
  process.exit();
});
