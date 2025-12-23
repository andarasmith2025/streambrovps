// Script untuk aktivasi user yang inactive
// Usage: node activate-user.js <username>

const { db } = require('./db/database');

const username = process.argv[2];

if (!username) {
    console.log('Usage: node activate-user.js <username>');
    console.log('Example: node activate-user.js johndoe');
    process.exit(1);
}

db.run(
    'UPDATE users SET status = ? WHERE username = ?',
    ['active', username],
    function (err) {
        if (err) {
            console.error('Error activating user:', err.message);
            process.exit(1);
        }

        if (this.changes === 0) {
            console.log(`❌ User '${username}' not found!`);
            process.exit(1);
        }

        console.log(`✅ User '${username}' has been activated!`);
        console.log('User can now login.');
        
        db.close();
        process.exit(0);
    }
);
