// Script untuk cek SEMUA user di database dengan detail lengkap
const { db } = require('./db/database');

console.log('Checking ALL users in database (including inactive)...\n');

// Query semua user tanpa filter
db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
        console.error('Error querying users:', err.message);
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log('❌ No users found in database!');
    } else {
        console.log(`✅ Found ${rows.length} user(s) in total:\n`);
        rows.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.username}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email || 'NOT SET'}`);
            console.log(`   Role: ${user.user_role}`);
            console.log(`   Status: ${user.status}`);
            console.log(`   Avatar: ${user.avatar_path || 'NOT SET'}`);
            console.log(`   Created: ${user.created_at}`);
            console.log(`   Updated: ${user.updated_at || 'NOT SET'}`);
            console.log(`   YouTube Client ID: ${user.youtube_client_id ? 'YES' : 'NO'}`);
            console.log(`   YouTube Client Secret: ${user.youtube_client_secret ? 'YES' : 'NO'}`);
            console.log(`   YouTube Redirect URI: ${user.youtube_redirect_uri || 'NOT SET'}`);
            console.log('');
        });
        
        // Summary
        const activeUsers = rows.filter(u => u.status === 'active').length;
        const inactiveUsers = rows.filter(u => u.status === 'inactive').length;
        const adminUsers = rows.filter(u => u.user_role === 'admin').length;
        const memberUsers = rows.filter(u => u.user_role === 'member').length;
        
        console.log('=== SUMMARY ===');
        console.log(`Total Users: ${rows.length}`);
        console.log(`Active: ${activeUsers}`);
        console.log(`Inactive: ${inactiveUsers}`);
        console.log(`Admin: ${adminUsers}`);
        console.log(`Member: ${memberUsers}`);
    }

    db.close();
    process.exit(0);
});
