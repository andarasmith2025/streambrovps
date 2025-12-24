// Test which database is currently being used by the application
const { db } = require('./db/database');

console.log('=== TESTING CURRENT DATABASE CONNECTION ===\n');

// Try to get stream count
db.get("SELECT COUNT(*) as count FROM streams", [], (err, result) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log(`Current database has ${result.count} stream(s)\n`);
  
  // Get users
  db.all("SELECT id, username, user_role FROM users", [], (err, users) => {
    if (err) {
      console.error('Error getting users:', err);
    } else {
      console.log(`Users in current database (${users.length}):`);
      users.forEach(u => {
        console.log(`  - ${u.username} (${u.user_role})`);
      });
    }
    
    console.log('\n✓ This is the database currently used by the application');
    console.log('  Location: db/streambro.db\n');
    
    process.exit(0);
  });
});
