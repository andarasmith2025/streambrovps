const { db } = require('./db/database');

console.log('Checking youtube_channel_id for HSN streams...\n');

db.all(
  `SELECT id, title, youtube_channel_id 
   FROM streams 
   WHERE title LIKE '%Tibetan%' 
   ORDER BY created_at DESC 
   LIMIT 10`,
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    console.log(`Found ${rows.length} Tibetan streams:\n`);
    
    rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.title.substring(0, 50)}...`);
      console.log(`   Stream ID: ${row.id}`);
      console.log(`   Channel ID: ${row.youtube_channel_id || 'NULL ❌'}`);
      console.log('');
    });
    
    const withChannel = rows.filter(r => r.youtube_channel_id).length;
    const withoutChannel = rows.filter(r => !r.youtube_channel_id).length;
    
    console.log(`Summary: ${withChannel} with channel ID, ${withoutChannel} without (NULL)`);
    
    process.exit(0);
  }
);
