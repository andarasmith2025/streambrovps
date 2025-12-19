const { db } = require('./db/database');

console.log('Checking oauth_states table...\n');

// Check if table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='oauth_states'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err);
    process.exit(1);
  }
  
  if (!row) {
    console.log('❌ oauth_states table does NOT exist!');
    console.log('This table is required for OAuth flow to work.');
    console.log('');
    console.log('Creating table...');
    
    db.run(`CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      redirect_uri TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`, (createErr) => {
      if (createErr) {
        console.error('Failed to create table:', createErr);
        process.exit(1);
      }
      console.log('✓ Table created successfully');
      process.exit(0);
    });
  } else {
    console.log('✓ oauth_states table exists');
    console.log('');
    
    // Check recent states
    db.all("SELECT * FROM oauth_states ORDER BY created_at DESC LIMIT 5", (err2, rows) => {
      if (err2) {
        console.error('Error querying states:', err2);
        process.exit(1);
      }
      
      if (!rows || rows.length === 0) {
        console.log('No OAuth states found (table is empty)');
      } else {
        console.log(`Found ${rows.length} recent OAuth state(s):\n`);
        rows.forEach((row, i) => {
          console.log(`${i + 1}. State: ${row.state.substring(0, 16)}...`);
          console.log(`   User ID: ${row.user_id}`);
          console.log(`   Redirect URI: ${row.redirect_uri}`);
          console.log(`   Created: ${row.created_at}`);
          console.log('');
        });
      }
      
      process.exit(0);
    });
  }
});
