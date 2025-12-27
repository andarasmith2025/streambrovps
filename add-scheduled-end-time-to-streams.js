const { db } = require('./db/database');

console.log('=== ADDING SCHEDULED_END_TIME TO STREAMS ===\n');

// Add scheduled_end_time column
db.run("ALTER TABLE streams ADD COLUMN scheduled_end_time TIMESTAMP", (err) => {
  if (err) {
    if (err.message.includes('duplicate column')) {
      console.log('✓ Column scheduled_end_time already exists');
      process.exit(0);
    } else {
      console.error('Error adding column:', err);
      process.exit(1);
    }
  } else {
    console.log('✓ Added scheduled_end_time column to streams table');
    process.exit(0);
  }
});
