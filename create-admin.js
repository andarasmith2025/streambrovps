// Script untuk membuat user admin baru
// Usage: node create-admin.js <username> <password>

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./db/database');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
    console.log('Usage: node create-admin.js <username> <password>');
    console.log('Example: node create-admin.js admin mypassword123');
    process.exit(1);
}

async function createAdmin() {
    try {
        // Cek apakah username sudah ada
        db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
            if (err) {
                console.error('Error checking user:', err.message);
                process.exit(1);
            }

            if (row) {
                console.log(`❌ User '${username}' already exists!`);
                console.log('Use reset-password.js to change password instead.');
                process.exit(1);
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();

            // Insert user baru
            db.run(
                'INSERT INTO users (id, username, password, user_role, status) VALUES (?, ?, ?, ?, ?)',
                [userId, username, hashedPassword, 'admin', 'active'],
                function (err) {
                    if (err) {
                        console.error('Error creating admin:', err.message);
                        process.exit(1);
                    }

                    console.log('✅ Admin user created successfully!');
                    console.log(`Username: ${username}`);
                    console.log(`Password: ${password}`);
                    console.log(`Role: admin`);
                    console.log(`Status: active`);
                    console.log('\nYou can now login at: http://your-server:7575/login');
                    
                    db.close();
                    process.exit(0);
                }
            );
        });
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createAdmin();
