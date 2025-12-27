const { db } = require('./db/database');

console.log('Checking latest Healing Earth streams...\n');

db.all(
  `SELECT id, title, status, youtube_broadcast_id, start_time, updated_at 
   FROM streams 
   WHERE youtube_channel_id = 'UCDM_CmM0o5WN6tkF7bbEeRQ' 
   ORDER BY updated_at DESC 
   LIMIT 5`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    console.log(`Found ${streams.length} recent streams:\n`);

    streams.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.title.substring(0, 60)}...`);
      console.log(`   Stream ID: ${s.id}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Broadcast ID: ${s.youtube_broadcast_id || '❌ MISSING'}`);
      console.log(`   Start Time: ${s.start_time || 'Not started'}`);
      console.log(`   Updated: ${s.updated_at}`);
      console.log('');
    });

    process.exit(0);
  }
);
