const sqlite3 = require('sqlite3').verbose();

console.log('Cleaning up unused fields from streams table...\n');

const db = new sqlite3.Database('./db/streambro.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to database\n');
  
  // Fields to remove (not used in frontend anymore)
  const fieldsToRemove = [
    'bitrate',
    'fps', 
    'resolution',
    'orientation',
    'use_advanced_settings'
  ];
  
  console.log('📋 Fields to remove:', fieldsToRemove.join(', '));
  console.log('\n⚠️  Creating backup first...\n');
  
  // Create backup
  const backupName = `streambro_backup_${Date.now()}.db`;
  const fs = require('fs');
  fs.copyFileSync('./db/streambro.db', `./db/${backupName}`);
  console.log(`✅ Backup created: db/${backupName}\n`);
  
  // Get current schema
  db.all("PRAGMA table_info(streams)", [], (err, columns) => {
    if (err) {
      console.error('❌ Error getting table info:', err.message);
      db.close();
      return;
    }
    
    console.log('📊 Current streams table columns:', columns.length);
    
    // Filter out columns to remove
    const keepColumns = columns.filter(col => !fieldsToRemove.includes(col.name));
    console.log('📊 Columns after cleanup:', keepColumns.length);
    console.log('\n✅ Keeping these columns:');
    keepColumns.forEach(col => console.log(`   - ${col.name}`));
    
    // Create new table without removed fields
    const columnDefs = keepColumns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.notnull) def += ' NOT NULL';
      if (col.dflt_value) def += ` DEFAULT ${col.dflt_value}`;
      if (col.pk) def += ' PRIMARY KEY';
      return def;
    }).join(',\n    ');
    
    const createTableSQL = `CREATE TABLE streams_new (
    ${columnDefs}
  )`;
    
    console.log('\n🔧 Creating new table...');
    
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating new table:', err.message);
        db.close();
        return;
      }
      
      // Copy data
      const columnNames = keepColumns.map(col => col.name).join(', ');
      const copySQL = `INSERT INTO streams_new (${columnNames}) 
                       SELECT ${columnNames} FROM streams`;
      
      console.log('📦 Copying data to new table...');
      
      db.run(copySQL, (err) => {
        if (err) {
          console.error('❌ Error copying data:', err.message);
          db.close();
          return;
        }
        
        // Drop old table
        console.log('🗑️  Dropping old table...');
        db.run('DROP TABLE streams', (err) => {
          if (err) {
            console.error('❌ Error dropping old table:', err.message);
            db.close();
            return;
          }
          
          // Rename new table
          console.log('✏️  Renaming new table...');
          db.run('ALTER TABLE streams_new RENAME TO streams', (err) => {
            if (err) {
              console.error('❌ Error renaming table:', err.message);
              db.close();
              return;
            }
            
            console.log('\n✅ SUCCESS! Unused fields removed from streams table');
            console.log(`\n📋 Removed fields: ${fieldsToRemove.join(', ')}`);
            console.log(`\n💾 Backup available at: db/${backupName}`);
            
            // Verify
            db.all("PRAGMA table_info(streams)", [], (err, newColumns) => {
              if (err) {
                console.error('❌ Error verifying:', err.message);
              } else {
                console.log(`\n✅ Verified: streams table now has ${newColumns.length} columns`);
              }
              db.close();
            });
          });
        });
      });
    });
  });
});
