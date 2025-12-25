// Debug database connection issue
console.log('=== Database Connection Debug ===\n');

// Check current working directory
console.log('Current working directory:', process.cwd());

// Check database path from our config
const { db } = require('./db/database');
console.log('Database connection from db/database.js initialized');

// Check if we can access the same data the web app sees
console.log('\nTesting database queries...\n');

// 1. Check streams
db.all('SELECT COUNT(*) as count FROM streams', [], (err, rows) => {
  if (err) {
    console.error('Error counting streams:', err);
  } else {
    console.log('Streams count:', rows[0].count);
  }
  
  // 2. Check schedules
  db.all('SELECT COUNT(*) as count FROM stream_schedules', [], (err, rows) => {
    if (err) {
      console.error('Error counting schedules:', err);
    } else {
      console.log('Schedules count:', rows[0].count);
    }
    
    // 3. Check if we can see the specific stream IDs from browser log
    const streamIds = [
      '9e5a0a53-f545-42f1-bc11-861aae325707',
      'de4efd72-8e9f-4ace-b2f8-805d8aec5576',
      'c80160f1-4f95-42eb-93c5-6e3db0d6b457',
      'e139473c-4bfe-4f0e-9a4c-c98af18a40a8',
      'a6f93515-678d-4454-80fe-c11d5f01a15f',
      'e1fae681-fb10-475b-9bdd-67eefcdda416'
    ];
    
    console.log('\nChecking specific stream IDs from browser log...');
    
    let checkedCount = 0;
    streamIds.forEach(streamId => {
      db.get('SELECT id, title, status FROM streams WHERE id = ?', [streamId], (err, row) => {
        checkedCount++;
        if (err) {
          console.error(`Error checking stream ${streamId}:`, err);
        } else if (row) {
          console.log(`✅ Found stream ${streamId}: ${row.title} (${row.status})`);
        } else {
          console.log(`❌ Stream ${streamId} NOT FOUND`);
        }
        
        if (checkedCount === streamIds.length) {
          console.log('\n=== CONCLUSION ===');
          console.log('If streams are NOT FOUND, then:');
          console.log('1. Application is using a different database file');
          console.log('2. Application might be running on VPS with different data');
          console.log('3. Database path configuration is different');
          
          console.log('\nPossible solutions:');
          console.log('1. Check if app is running on VPS: ssh to VPS and check database there');
          console.log('2. Check .env file for DATABASE_PATH configuration');
          console.log('3. Check if there are multiple database files');
          console.log('4. Sync local database with VPS database');
          
          db.close();
        }
      });
    });
  });
});