const { db } = require('./db/database');

async function checkYouTubeTokens() {
  console.log('\n=== Checking YouTube Tokens Table ===\n');
  
  try {
    // Check if youtube_tokens table exists
    const tables = await new Promise((resolve, reject) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%youtube%'",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log('YouTube-related tables:');
    tables.forEach(t => console.log(`- ${t.name}`));
    
    if (tables.length === 0) {
      console.log('\n❌ No YouTube-related tables found!');
      console.log('Tokens might be stored in users table or sessions');
      return;
    }
    
    // Check youtube_tokens table structure
    for (const table of tables) {
      console.log(`\n--- Table: ${table.name} ---`);
      
      const columns = await new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table.name})`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      
      // Get all rows
      const rows = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log(`\nTotal rows: ${rows.length}`);
      
      if (rows.length > 0) {
        console.log('\nData:');
        rows.forEach((row, idx) => {
          console.log(`\n${idx + 1}. Row:`);
          Object.keys(row).forEach(key => {
            let value = row[key];
            if (key.includes('token') && value && value.length > 20) {
              value = value.substring(0, 20) + '...';
            }
            console.log(`   ${key}: ${value}`);
          });
          
          // Check token expiry
          if (row.expiry_date) {
            const now = Date.now();
            const expiry = Number(row.expiry_date);
            const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
            
            if (minutesUntilExpiry < 0) {
              console.log(`   ⚠️  Token EXPIRED ${Math.abs(minutesUntilExpiry)} minutes ago`);
            } else {
              console.log(`   ✅ Token valid (expires in ${minutesUntilExpiry} minutes)`);
            }
          }
        });
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    db.close();
  }
}

checkYouTubeTokens();
