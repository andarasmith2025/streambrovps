// Check TES 1 stream owner
const { db } = require('./db/database');

console.log('🔍 Checking TES 1 stream owner...\n');

// Check stream with user info
db.get(
  `SELECT 
    s.id, 
    s.title, 
    s.status, 
    s.user_id,
    u.username,
    u.user_role
  FROM streams s
  LEFT JOIN users u ON s.user_id = u.id
  WHERE s.id = '33da4281-9b40-4fa2-b3b8-48fa6ddd0134'`,
  (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }

    if (!stream) {
      console.log('✅ Stream TES 1 not found (already deleted or never existed)');
      process.exit(0);
    }

    console.log('📋 Stream Information:');
    console.log(`   ID: ${stream.id}`);
    console.log(`   Title: ${stream.title}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   User ID: ${stream.user_id}`);
    console.log(`   Username: ${stream.username || 'Unknown'}`);
    console.log(`   User Role: ${stream.user_role || 'Unknown'}`);
    console.log('');

    // Check schedules
    db.all(
      `SELECT id, schedule_time, status, user_timezone 
       FROM stream_schedules 
       WHERE stream_id = '33da4281-9b40-4fa2-b3b8-48fa6ddd0134'`,
      (err, schedules) => {
        if (err) {
          console.error('❌ Error checking schedules:', err);
          process.exit(1);
        }

        console.log(`📅 Schedules: ${schedules.length} found`);
        schedules.forEach((s, i) => {
          console.log(`   ${i + 1}. Time: ${s.schedule_time}`);
          console.log(`      Status: ${s.status}`);
          console.log(`      Timezone: ${s.user_timezone}`);
        });
        console.log('');

        // List all users for reference
        db.all('SELECT id, username, user_role FROM users', (err, users) => {
          if (err) {
            console.error('❌ Error listing users:', err);
            process.exit(1);
          }

          console.log('👥 All Users in System:');
          users.forEach((u, i) => {
            const marker = u.id === stream.user_id ? ' ← OWNER' : '';
            console.log(`   ${i + 1}. ${u.username} (${u.user_role})${marker}`);
            console.log(`      ID: ${u.id}`);
          });
          console.log('');

          if (stream.username) {
            console.log(`⚠️  This stream belongs to: ${stream.username}`);
            console.log('   Make sure this is YOUR stream before deleting!');
          } else {
            console.log('⚠️  Stream has no owner (orphaned)');
            console.log('   Safe to delete');
          }

          process.exit(0);
        });
      }
    );
  }
);
