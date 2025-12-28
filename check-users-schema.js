/**
 * Check users table schema
 */

const { db } = require('./db/database');

async function checkUsersSchema() {
  console.log('Checking users table schema...\n');
  
  try {
    // Get table schema
    const columns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(users)", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Columns in users table:');
    for (const col of columns) {
      console.log(`  ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : 'NULL'}`);
    }
    
    // Get all users
    console.log('\n\nAll users:');
    const users = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const user of users) {
      console.log(`\nUser ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Role: ${user.role || 'N/A'}`);
      console.log(`  Created: ${user.created_at || 'N/A'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsersSchema();
