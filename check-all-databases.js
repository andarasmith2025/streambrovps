const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('=== CHECKING ALL DATABASES ===\n');

const dbFiles = [
  'db/streambro.db',
  'db/streamflow.db',
  'db/streambro_backup_1766159610811.db',
  'backups/vps-backup-20251219/streambro.db'
];

let maxUsers = 0;
let maxUsersDb = null;

const checkDatabase = (dbPath, callback) => {
  if (!fs.existsSync(dbPath)) {
    console.log(`❌ ${dbPath} - NOT FOUND`);
    callback();
    return;
  }
  
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.log(`❌ ${dbPath} - ERROR: ${err.message}`);
      callback();
      return;
    }
    
    const count = row.count;
    console.log(`✓ ${dbPath} - ${count} users`);
    
    if (count > maxUsers) {
      maxUsers = count;
      maxUsersDb = dbPath;
    }
    
    db.close();
    callback();
  });
};

let checked = 0;
dbFiles.forEach(dbPath => {
  checkDatabase(dbPath, () => {
    checked++;
    if (checked === dbFiles.length) {
      console.log('\n=== RESULT ===');
      if (maxUsersDb) {
        console.log(`Database with most users: ${maxUsersDb}`);
        console.log(`User count: ${maxUsers}`);
        console.log('\nDo you want to restore users from this database? (Y/N)');
      } else {
        console.log('No valid database found');
      }
      process.exit(0);
    }
  });
});
