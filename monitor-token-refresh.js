const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== MONITORING TOKEN STATUS ===');
console.log('Current Time:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
console.log('');

db.get(`
  SELECT 
    user_id,
    created_at,
    expiry_date,
    CASE 
      WHEN datetime(expiry_date/1000, 'unixepoch') > datetime('now') THEN 'VALID'
      ELSE 'EXPIRED'
    END as status,
    CAST((julianday(datetime(expiry_date/1000, 'unixepoch')) - julianday('now')) * 24 * 60 AS INTEGER) as minutes_remaining,
    datetime(created_at, 'localtime') as created_local,
    datetime(expiry_date/1000, 'unixepoch', 'localtime') as expires_local
  FROM youtube_tokens 
  ORDER BY created_at DESC 
  LIMIT 1
`, [], (err, token) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!token) {
    console.log('❌ No tokens found in database');
    db.close();
    return;
  }

  console.log('📊 Latest Token Info:');
  console.log('   User ID:', token.user_id);
  console.log('   Created:', token.created_local);
  console.log('   Expires:', token.expires_local);
  console.log('   Status:', token.status === 'VALID' ? '✅ VALID' : '❌ EXPIRED');
  console.log('   Time Remaining:', token.minutes_remaining, 'minutes');
  console.log('');

  if (token.status === 'VALID') {
    if (token.minutes_remaining > 50) {
      console.log('✅ Token is fresh (recently created/refreshed)');
    } else if (token.minutes_remaining > 5) {
      console.log('⚠️  Token will expire soon, should auto-refresh within 5 minutes');
    } else {
      console.log('🔄 Token should be refreshing now...');
    }
  } else {
    console.log('❌ Token is EXPIRED! Auto-refresh should have happened.');
    console.log('   If you see this, there might be an issue with auto-refresh.');
  }

  console.log('');
  console.log('💡 Run this script again in 1 hour to verify auto-refresh worked.');
  
  db.close();
});
