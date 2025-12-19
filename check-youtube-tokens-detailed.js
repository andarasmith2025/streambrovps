// Script untuk cek YouTube tokens di database
const { db } = require('./db/database');

console.log('Checking YouTube tokens in database...\n');

db.all(`
  SELECT 
    yt.user_id,
    u.username,
    yt.access_token,
    yt.refresh_token,
    yt.expiry_date,
    yt.created_at,
    yt.updated_at
  FROM youtube_tokens yt
  LEFT JOIN users u ON yt.user_id = u.id
  ORDER BY yt.updated_at DESC
`, [], (err, rows) => {
    if (err) {
        console.error('Error querying youtube_tokens:', err.message);
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log('❌ No YouTube tokens found in database!');
        console.log('\nThis means OAuth callback is NOT saving tokens to database.');
        console.log('Users need to reconnect YouTube to save tokens.');
    } else {
        console.log(`✅ Found ${rows.length} YouTube token(s):\n`);
        rows.forEach((token, index) => {
            console.log(`${index + 1}. Username: ${token.username || 'UNKNOWN'}`);
            console.log(`   User ID: ${token.user_id}`);
            console.log(`   Access Token: ${token.access_token ? token.access_token.substring(0, 20) + '...' : 'NULL'}`);
            console.log(`   Refresh Token: ${token.refresh_token ? token.refresh_token.substring(0, 20) + '...' : 'NULL'}`);
            console.log(`   Expiry Date: ${token.expiry_date || 'NULL'}`);
            console.log(`   Created: ${token.created_at}`);
            console.log(`   Updated: ${token.updated_at}`);
            
            // Check if token is expired
            if (token.expiry_date) {
                const expiryTime = new Date(token.expiry_date).getTime();
                const now = Date.now();
                const isExpired = expiryTime < now;
                console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
                if (!isExpired) {
                    const minutesLeft = Math.floor((expiryTime - now) / 1000 / 60);
                    console.log(`   Expires in: ${minutesLeft} minutes`);
                }
            }
            console.log('');
        });
    }

    db.close();
    process.exit(0);
});
