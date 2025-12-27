const { db } = require('./db/database');

db.get(
  `SELECT channel_title, channel_id, expiry_date,
          CASE WHEN access_token IS NOT NULL THEN 'YES' ELSE 'NO' END as has_token
   FROM youtube_channels 
   WHERE channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ'`,
  (err, channel) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    const now = Date.now();
    const expiry = new Date(channel.expiry_date);
    const hoursLeft = (channel.expiry_date - now) / (1000 * 60 * 60);

    console.log('Healing Earth Token Status:\n');
    console.log(`Channel: ${channel.channel_title}`);
    console.log(`Has Token: ${channel.has_token}`);
    console.log(`Expiry: ${expiry.toLocaleString()}`);
    console.log(`Hours Left: ${hoursLeft.toFixed(2)}`);
    console.log(`Status: ${hoursLeft > 0 ? '✅ VALID' : '❌ EXPIRED'}`);

    process.exit(0);
  }
);
