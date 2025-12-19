const { db } = require('./db/database');

console.log('\n=== Checking Users Table Structure ===\n');

// Get table structure
db.all('PRAGMA table_info(users)', [], (err, columns) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('Users table columns:');
  columns.forEach(c => {
    console.log(`- ${c.name} (${c.type})`);
  });
  
  console.log('\n=== All Users in Database ===\n');
  
  // Get all users
  db.all('SELECT * FROM users', [], (err2, users) => {
    if (err2) {
      console.error('Error:', err2);
      process.exit(1);
    }
    
    console.log(`Found ${users.length} user(s):\n`);
    
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.username || 'No username'}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Role: ${u.user_role || 'not set'}`);
      console.log(`   Has YouTube Client ID: ${!!u.youtube_client_id}`);
      console.log('');
    });
    
    // Check for the admin ID
    const adminId = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb';
    const adminUser = users.find(u => u.id === adminId);
    
    if (adminUser) {
      console.log(`✓ Admin user (${adminId}) found!`);
    } else {
      console.log(`❌ Admin user (${adminId}) NOT FOUND in database!`);
      console.log('\n⚠️  Your session user ID does not match any user in database.');
      console.log('   Please logout and login again with one of the usernames above.');
    }
    
    process.exit(0);
  });
});
