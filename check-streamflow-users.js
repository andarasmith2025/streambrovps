const sqlite3 = require('sqlite3').verbose();

console.log('Checking users in streamflow.db files...\n');

// Check root streamflow.db
const db1 = new sqlite3.Database('./streamflow.db', (err) => {
  if (err) {
    console.log('❌ Error opening ./streamflow.db:', err.message);
  } else {
    console.log('📂 Checking: ./streamflow.db');
    db1.all('SELECT id, username, user_role, status, created_at FROM users ORDER BY created_at', [], (err, rows) => {
      if (err) {
        console.log('❌ Error:', err.message);
      } else {
        console.log(`✅ Found ${rows.length} user(s):\n`);
        rows.forEach((row, index) => {
          console.log(`${index + 1}. Username: ${row.username}`);
          console.log(`   Role: ${row.user_role}`);
          console.log(`   Status: ${row.status}`);
          console.log(`   Created: ${row.created_at}\n`);
        });
      }
      db1.close();
      
      // Check db/streamflow.db
      const db2 = new sqlite3.Database('./db/streamflow.db', (err) => {
        if (err) {
          console.log('❌ Error opening ./db/streamflow.db:', err.message);
        } else {
          console.log('\n📂 Checking: ./db/streamflow.db');
          db2.all('SELECT id, username, user_role, status, created_at FROM users ORDER BY created_at', [], (err, rows) => {
            if (err) {
              console.log('❌ Error:', err.message);
            } else {
              console.log(`✅ Found ${rows.length} user(s):\n`);
              rows.forEach((row, index) => {
                console.log(`${index + 1}. Username: ${row.username}`);
                console.log(`   Role: ${row.user_role}`);
                console.log(`   Status: ${row.status}`);
                console.log(`   Created: ${row.created_at}\n`);
              });
            }
            db2.close();
          });
        }
      });
    });
  }
});
