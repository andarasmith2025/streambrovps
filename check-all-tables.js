const sqlite3 = require('sqlite3').verbose();

console.log('Checking all tables in streambro.db...\n');

const db = new sqlite3.Database('./db/streambro.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to streambro.db\n');
  
  // Get all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", [], (err, tables) => {
    if (err) {
      console.error('❌ Error getting tables:', err.message);
      db.close();
      return;
    }
    
    console.log(`📊 Found ${tables.length} tables:\n`);
    
    let completed = 0;
    tables.forEach((table, index) => {
      const tableName = table.name;
      
      // Get table info
      db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
        if (err) {
          console.error(`❌ Error getting info for ${tableName}:`, err.message);
        } else {
          console.log(`${index + 1}. TABLE: ${tableName}`);
          console.log(`   Columns (${columns.length}):`);
          columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
          });
          
          // Get row count
          db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, row) => {
            if (err) {
              console.log(`   ❌ Error counting rows: ${err.message}`);
            } else {
              console.log(`   📝 Rows: ${row.count}`);
            }
            console.log('');
            
            completed++;
            if (completed === tables.length) {
              // Show users detail
              console.log('\n👥 USERS DETAIL:');
              db.all('SELECT id, username, user_role, status, youtube_client_id, created_at FROM users ORDER BY created_at', [], (err, users) => {
                if (err) {
                  console.error('❌ Error:', err.message);
                } else {
                  users.forEach((user, i) => {
                    console.log(`\n${i + 1}. ${user.username} (${user.user_role})`);
                    console.log(`   ID: ${user.id}`);
                    console.log(`   Status: ${user.status}`);
                    console.log(`   YouTube Client ID: ${user.youtube_client_id ? 'SET ✓' : 'NOT SET'}`);
                    console.log(`   Created: ${user.created_at}`);
                  });
                }
                db.close();
              });
            }
          });
        }
      });
    });
  });
});
