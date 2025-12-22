const db = require('./db/database');
const { google } = require('googleapis');
require('dotenv').config();

console.log('=== Monitoring OAuth Client Health ===\n');

// Check if .env has valid Client ID
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

console.log('1. Checking .env configuration...');
console.log(`   Client ID: ${clientId ? clientId.substring(0, 20) + '...' : '❌ MISSING'}`);
console.log(`   Client Secret: ${clientSecret ? '✅ Present' : '❌ MISSING'}`);
console.log(`   Redirect URI: ${redirectUri || '❌ MISSING'}`);

if (!clientId || !clientSecret || !redirectUri) {
  console.log('\n❌ ERROR: Missing OAuth configuration in .env');
  console.log('Please check FIX_DELETED_CLIENT_PERMANENT.md for instructions');
  process.exit(1);
}

console.log('\n2. Checking users with YouTube tokens...');

db.all(`
  SELECT 
    u.id,
    u.username,
    u.youtube_channel_title,
    u.youtube_access_token,
    u.youtube_refresh_token,
    u.youtube_token_expiry
  FROM users u
  WHERE u.youtube_access_token IS NOT NULL
`, [], async (err, users) => {
  if (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }

  if (users.length === 0) {
    console.log('   ⚠️  No users with YouTube tokens found');
    console.log('   This is normal if no one has connected YouTube yet');
    db.close();
    process.exit(0);
  }

  console.log(`   Found ${users.length} user(s) with YouTube tokens\n`);

  