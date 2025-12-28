const { db } = require('./db/database');

console.log('Checking users table schema...\n');

// Get table schema
db.all("PRAGMA table_info(users)", [], (err, columns) => {
  if (err) {
    console.error('Error getting schema:', err);
    db.close();
    return;
  }
  
  console.log('USERS TABLE COLUMNS:');
  console.log('='.repeat(80));
  columns.forEach(col => {
    console.log(`  ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  console.log('='.repeat(80));
  
  // Now check schedule ownership with correct columns
  db.all(
    `SELECT 
      ss.id as schedule_id,
      ss.stream_id,
      ss.schedule_time,
      s.title as stream_title,
      s.user_id,
      u.username,
      u.user_role
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
      
      console.log(`\n\nPENDING SCHEDULES (${rows.length}):`);
      console.log('='.repeat(80));
      
      rows.forEach((row, i) => {
        console.log(`\n${i + 1}. ${row.stream_title}`);
        console.log(`   Schedule ID: ${row.schedule_id}`);
        console.log(`   Schedule Time: ${row.schedule_time}`);
        console.log(`   👤 Owner: ${row.username || 'NULL'} (${row.user_id || 'NULL'})`);
        console.log(`   Role: ${row.user_role || 'NULL'}`);
      });
      
      console.log('\n' + '='.repeat(80));
      
      // Check your admin account
      db.get(
        `SELECT id, username, user_role FROM users WHERE id = 'd08453ff-6fa0-445a-947d-c7cb1ac7acfb'`,
        [],
        (err, admin) => {
          if (err) {
            console.error('Error getting admin:', err);
          } else if (admin) {
            console.log(`\n👑 YOUR ADMIN ACCOUNT:`);
            console.log(`   User ID: ${admin.id}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Role: ${admin.user_role}`);
          } else {
            console.log(`\n⚠️  Admin account not found with ID: d08453ff-6fa0-445a-947d-c7cb1ac7acfb`);
          }
          
          // Count total users
          db.get('SELECT COUNT(*) as total FROM users', [], (err, result) => {
            if (!err) {
              console.log(`\n📊 Total users in database: ${result.total}`);
            }
            db.close();
          });
        }
      );
    }
  );
});
