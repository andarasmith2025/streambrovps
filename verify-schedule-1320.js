const { db } = require('./db/database');

console.log('🔍 VERIFYING SCHEDULE 13:20 WIB...\n');

// Check schedule
db.get(
  `SELECT ss.*, s.user_id, s.title, s.rtmp_url, s.stream_key
   FROM stream_schedules ss
   LEFT JOIN streams s ON ss.stream_id = s.id
   WHERE ss.schedule_time LIKE '2025-12-22T13:20%'`,
  [],
  (err, schedule) => {
    if (err) {
      console.error('❌ Error:', err);
      process.exit(1);
    }
    
    if (!schedule) {
      console.log('❌ SCHEDULE NOT FOUND for 13:20 WIB');
      process.exit(1);
    }
    
    console.log('✅ SCHEDULE FOUND!\n');
    console.log('📋 Schedule Details:');
    console.log('   ID:', schedule.id);
    console.log('   Time:', schedule.schedule_time);
    console.log('   Status:', schedule.status);
    console.log('   Recurring:', schedule.is_recurring ? 'Yes' : 'No');
    console.log('   Stream ID:', schedule.stream_id);
    console.log('   User ID:', schedule.user_id);
    console.log('   Title:', schedule.title);
    console.log('   RTMP URL:', schedule.rtmp_url);
    console.log('   Stream Key:', schedule.stream_key ? '***' + schedule.stream_key.slice(-4) : 'N/A');
    
    // Check if user has YouTube token
    db.get(
      'SELECT access_token, expiry_date FROM youtube_tokens WHERE user_id = ?',
      [schedule.user_id],
      (err2, token) => {
        let isExpired = false;
        
        console.log('\n🔑 YouTube Token Status:');
        if (err2) {
          console.log('   ❌ Error checking token:', err2.message);
        } else if (!token) {
          console.log('   ❌ NO TOKEN FOUND for this user');
        } else {
          const expiryDate = new Date(token.expiry_date);
          const now = new Date();
          isExpired = expiryDate < now;
          
          console.log('   ✅ Token exists');
          console.log('   Token length:', token.access_token.length);
          console.log('   Expiry:', expiryDate.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
          console.log('   Status:', isExpired ? '❌ EXPIRED' : '✅ VALID');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 VERDICT:');
        console.log('='.repeat(60));
        
        if (schedule.status === 'pending' && token && !isExpired) {
          console.log('✅ READY TO EXECUTE');
          console.log('   - Schedule exists in database');
          console.log('   - Status is pending');
          console.log('   - User has valid YouTube token');
          console.log('   - Should execute at 13:20 WIB');
        } else {
          console.log('⚠️  POTENTIAL ISSUES:');
          if (schedule.status !== 'pending') {
            console.log('   - Status is not pending:', schedule.status);
          }
          if (!token) {
            console.log('   - User has no YouTube token');
          }
          if (token && isExpired) {
            console.log('   - Token is expired');
          }
        }
        
        console.log('='.repeat(60));
        process.exit(0);
      }
    );
  }
);
