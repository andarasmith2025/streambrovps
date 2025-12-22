/**
 * Script untuk generate URL re-authentication dengan prompt=consent
 * Gunakan ini jika terjadi error 'deleted_client'
 */

const tokenManager = require('./services/youtubeTokenManager');
const { db } = require('./db/database');
require('dotenv').config();

async function generateReAuthUrl() {
  const userId = process.argv[2];

  if (!userId) {
    console.log('❌ Usage: node generate-reauth-url.js <user_id>');
    console.log('\nContoh: node generate-reauth-url.js abc123');
    
    // Tampilkan daftar user
    console.log('\n📋 Available users:');
    db.all('SELECT id, username FROM users', [], (err, users) => {
      if (err) {
        console.error('Error:', err);
        process.exit(1);
      }
      
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.id})`);
      });
      
      process.exit(1);
    });
    return;
  }

  try {
    console.log('='.repeat(60));
    console.log('🔗 Generating Re-Authentication URL');
    console.log('='.repeat(60));
    console.log(`\n👤 User ID: ${userId}`);

    const url = await tokenManager.generateReAuthUrl(userId);

    console.log('\n✅ URL berhasil di-generate!');
    console.log('\n📋 Buka URL ini di browser untuk re-authenticate:');
    console.log('\n' + url);
    console.log('\n' + '='.repeat(60));
    console.log('⚠️ PENTING:');
    console.log('   - URL ini menggunakan prompt=consent');
    console.log('   - Google akan memberikan refresh_token baru');
    console.log('   - Setelah login, token akan otomatis tersimpan');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

generateReAuthUrl();
