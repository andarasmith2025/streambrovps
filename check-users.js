// Script untuk cek semua user di database
const { db } = require('./db/database');

console.log('Checking users in database...\n');

db.all('SELECT id, username, user_role, status, created_at FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error querying users:', err.message);
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log('❌ No users found in database!');
        console.log('\nTo create first admin user, run:');
        console.log('node reset-password.js <username> <password>');
        console.log('\nOr access: http://your-server:7575/setup-account');
    } else {
        console.log(`✅ Found ${rows.length} user(s):\n`);
        rows.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.username}`);
            console.log(`   Role: ${user.user_role}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Created: ${user.created_at}`);
            console.log('');
        });
    }

    db.close();
    process.exit(0);
});
