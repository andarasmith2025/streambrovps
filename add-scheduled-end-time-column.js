/**
 * Add scheduled_end_time column to streams table
 * This column stores the calculated end time for scheduled streams
 */

const { db } = require('./db/database');

async function addScheduledEndTimeColumn() {
  console.log('Adding scheduled_end_time column to streams table...\n');
  
  try {
    // Check if column already exists
    const columns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(streams)", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const hasColumn = columns.some(col => col.name === 'scheduled_end_time');
    
    if (hasColumn) {
      console.log('✅ Column scheduled_end_time already exists');
      process.exit(0);
      return;
    }
    
    // Add column
    await new Promise((resolve, reject) => {
      db.run(
        `ALTER TABLE streams ADD COLUMN scheduled_end_time TIMESTAMP NULL`,
        [],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('✅ Added scheduled_end_time column to streams table');
    console.log('   This column stores the calculated end time for scheduled streams');
    console.log('   Used by auto-stop to determine when to stop the stream');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addScheduledEndTimeColumn();
