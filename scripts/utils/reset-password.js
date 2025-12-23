// Script untuk reset password user
// Usage: node reset-password.js <username> <new-password>

const bcrypt = require('bcrypt');
const { db } = require('./db/database');

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.log('Usage: node reset-password.js <username> <new-password>');
    console.log('Example: node reset-password.js admin newpassword123');
    process.exit(1);
}

async function resetPassword() {
    try {
        // Hash password baru
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password di database
        db.run(
            'UPDATE users SET password = ? WHERE username = ?',
            [hashedPassword, username],
            function (err) {
                if (err) {
                    console.error('Error updating password:', err.message);
                    process.exit(1);
                }

                if (this.changes === 0) {
                    console.log(`User '${username}' not found!`);
                    process.exit(1);
                }

                console.log(`✅ Password for user '${username}' has been reset successfully!`);
                console.log(`New password: ${newPassword}`);
                process.exit(0);
            }
        );
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

resetPassword();
