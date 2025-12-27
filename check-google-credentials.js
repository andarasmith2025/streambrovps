const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING GOOGLE CREDENTIALS SOURCES');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('1️⃣ CHECKING ENVIRONMENT VARIABLES:\n');
console.log(`GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ EXISTS' : '❌ NOT FOUND'}`);
console.log(`GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ EXISTS' : '❌ NOT FOUND'}`);
console.log(`GOOGLE_REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI ? '✅ EXISTS' : '❌ NOT FOUND'}`);

if (process.env.GOOGLE_CLIENT_ID) {
  console.log(`\nClient ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 30)}...`);
}

console.log('\n' + '─'.repeat(63));
console.log('2️⃣ CHECKING DATABASE SETTINGS TABLE:\n');

// Check if settings table exists
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`, (err, table) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  if (!table) {
    console.log('⚠️  Settings table does NOT exist\n');
    checkYoutubeService();
    return;
  }

  console.log('✅ Settings table exists\n');

  db.all(`SELECT key, value FROM settings WHERE key LIKE '%GOOGLE%' OR key LIKE '%CLIENT%'`, (err, settings) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    if (settings.length === 0) {
      console.log('⚠️  No Google credentials found in settings table\n');
    } else {
      console.log(`Found ${settings.length} credential(s) in database:\n`);
      settings.forEach(s => {
        const displayValue = s.value ? s.value.substring(0, 30) + '...' : 'NULL';
        console.log(`  ${s.key}: ${displayValue}`);
      });
      console.log('');
    }

    checkYoutubeService();
  });
});

function checkYoutubeService() {
  console.log('─'.repeat(63));
  console.log('3️⃣ CHECKING HOW YOUTUBESERVICE LOADS CREDENTIALS:\n');

  const fs = require('fs');
  
  // Check if youtubeService.js exists
  if (!fs.existsSync('./services/youtubeService.js')) {
    console.log('❌ youtubeService.js not found');
    process.exit(1);
  }

  const content = fs.readFileSync('./services/youtubeService.js', 'utf8');
  
  // Check how it loads credentials
  if (content.includes('process.env.GOOGLE_CLIENT_ID')) {
    console.log('✅ Uses process.env.GOOGLE_CLIENT_ID');
  }
  
  if (content.includes('settings') || content.includes('Settings')) {
    console.log('✅ Uses database settings table');
  }

  if (content.includes('getOAuthClient')) {
    console.log('✅ Has getOAuthClient function');
  }

  console.log('\n' + '─'.repeat(63));
  console.log('4️⃣ CHECKING YOUTUBE CHANNELS WITH TOKENS:\n');

  db.all(
    `SELECT channel_title, channel_id, 
            CASE WHEN access_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_access,
            CASE WHEN refresh_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_refresh,
            expiry_date
     FROM youtube_channels`,
    (err, channels) => {
      if (err) {
        console.error('Error:', err);
        process.exit(1);
      }

      console.log(`Found ${channels.length} channel(s):\n`);
      channels.forEach(ch => {
        console.log(`📺 ${ch.channel_title || 'NULL'}`);
        console.log(`   Channel ID: ${ch.channel_id}`);
        console.log(`   Has Access Token: ${ch.has_access}`);
        console.log(`   Has Refresh Token: ${ch.has_refresh}`);
        console.log(`   Token Expiry: ${ch.expiry_date ? new Date(ch.expiry_date).toLocaleString() : 'NULL'}`);
        console.log('');
      });

      console.log('═'.repeat(63));
      console.log('📊 SUMMARY:\n');
      
      const hasEnvVars = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
      const hasTokens = channels.some(ch => ch.has_refresh === 'YES');
      
      if (hasEnvVars && hasTokens) {
        console.log('✅ Everything is configured correctly');
        console.log('   - Environment variables: Present');
        console.log('   - Channel tokens: Present');
        console.log('');
        console.log('💡 Token refresh should work now');
      } else if (!hasEnvVars && hasTokens) {
        console.log('⚠️  PARTIAL CONFIGURATION:');
        console.log('   - Environment variables: ❌ MISSING');
        console.log('   - Channel tokens: ✅ Present');
        console.log('');
        console.log('💡 Tokens exist but cannot be refreshed without CLIENT_ID/SECRET');
        console.log('💡 This explains why broadcasts cannot be created');
      } else if (hasEnvVars && !hasTokens) {
        console.log('⚠️  PARTIAL CONFIGURATION:');
        console.log('   - Environment variables: ✅ Present');
        console.log('   - Channel tokens: ❌ MISSING');
        console.log('');
        console.log('💡 Need to authenticate channels via YouTube Manage page');
      } else {
        console.log('❌ INCOMPLETE CONFIGURATION:');
        console.log('   - Environment variables: ❌ MISSING');
        console.log('   - Channel tokens: ❌ MISSING');
        console.log('');
        console.log('💡 Need to setup Google OAuth credentials first');
      }

      console.log('');
      console.log('═'.repeat(63));
      process.exit(0);
    }
  );
}
