const { db } = require('./db/database');

const userId = '3e0fcf48-d8da-4d9a-8d8d-b67ffc018138'; // Bang Teguh
const newRedirectUri = 'https://streambro.nivarastudio.site/oauth2/callback';

console.log('Updating redirect URI for user Bang Teguh...\n');
console.log(`New Redirect URI: ${newRedirectUri}\n`);

db.run(`
  UPDATE users 
  SET youtube_redirect_uri = ?
  WHERE id = ?
`, [newRedirectUri, userId], function(err) {
  if (err) {
    console.error('Error updating redirect URI:', err);
    process.exit(1);
  }
  
  if (this.changes > 0) {
    console.log('✓ Redirect URI updated successfully!');
    console.log(`  Rows affected: ${this.changes}`);
  } else {
    console.log('⚠ No rows updated. User not found?');
  }
  
  db.close();
});
