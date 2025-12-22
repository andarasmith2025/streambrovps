/**
 * Add youtube_stream_id column to streams table
 * This column stores the YouTube stream ID to reuse the same stream key
 */

const { db } = require('./db/database');

console.log('Adding youtube_stream_id column to streams table...\n');

// Check if column exists
db.get("PRAGMA table_info(streams)", [], (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
    process.exit(1);
  }
  
  // Add column if not exists
  db.run(
    `ALTER TABLE streams ADD COLUMN youtube_stream_id TEXT`,
    [],
    (err) => {
      if (err) {
        if (err.message.includes('duplicate column')) {
          console.log('✓ Column youtube_stream_id already exists');
        } else {
          console.error('❌ Error adding column:', err.message);
          process.exit(1);
        }
      } else {
        console.log('✅ Column youtube_stream_id added successfully');
      }
      
      // Verify
      db.all("PRAGMA table_info(streams)", [], (err, rows) => {
        if (err) {
          console.error('Error verifying:', err);
          process.exit(1);
        }
        
        const hasColumn = rows.some(r => r.name === 'youtube_stream_id');
        console.log('\nVerification:', hasColumn ? '✅ Column exists' : '❌ Column not found');
        
        if (hasColumn) {
          console.log('\n✅ Database schema updated successfully!');
          console.log('   Streams can now reuse YouTube stream IDs');
        }
        
        process.exit(0);
      });
    }
  );
});
