const { db } = require('./db/database');

console.log('Checking schedule ownership and user info...\n');

db.all(
  `SELECT 
    ss.id as schedule_id,
    ss.stream_id,
    ss.schedule_time,
    ss.status as schedule_status,
    s.title as stream_title,
    s.user_id,
    u.username
   FROM stream_schedules ss
   JOIN streams s ON ss.stream_id = s.id
   LEFT JOIN users u ON s.user_id = u.id
   WHERE ss.status = 'pending'
   ORDER BY ss.schedule_time ASC`,
  [],
  (err, rows) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} pending schedule(s):\n`);
    console.log('='.repeat(80));
    
    rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.stream_title}`);
      console.log('-'.repeat(80));
      console.log(`   Schedule ID: ${row.schedule_id}`);
      console.log(`   Stream ID: ${row.stream_id}`);
      console.log(`   Schedule Time: ${row.schedule_time}`);
      console.log('');
      console.log(`   👤 OWNER INFO:`);
      console.log(`      User ID: ${row.user_id || 'NULL'}`);
      console.log(`      Username: ${row.username || 'NULL'}`);
      console.log(`      Role: ${row.role || 'NULL'}`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    
    // Check total users
    db.get('SELECT COUNT(*) as total FROM users', [], (err, result) => {
      if (err) {
        console.error('Error counting users:', err);
      } else {
        console.log(`\n📊 Total users in database: ${result.total}`);
      }
      
      // Check your admin user
      db.get(
        `SELECT id, username, role FROM users WHERE id = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb'`,
        [],
        (err, admin) => {
          if (err) {
            console.error('Error getting admin:', err);
          } else if (admin) {
            console.log(`\n👑 YOUR ADMIN ACCOUNT:`);
            console.log(`   User ID: ${admin.id}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Role: ${admin.role}`);
          }
          
          db.close();
        }
      );
    });
  }
);
