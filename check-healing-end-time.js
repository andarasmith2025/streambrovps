require('dotenv').config();
const { db } = require('./db/database');

console.log('Checking Healing Earth schedules end_time...\n');

const query = `
  SELECT 
    ss.id,
    ss.schedule_time,
    ss.duration,
    ss.end_time,
    s.title
  FROM stream_schedules ss
  JOIN streams s ON ss.stream_id = s.id
  JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE yc.channel_title LIKE '%Healing Earth%'
  LIMIT 10
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log(`Found ${rows.length} schedules:\n`);
  
  rows.forEach((row, idx) => {
    console.log(`${idx + 1}. Schedule ID: ${row.id}`);
    console.log(`   Title: ${row.title}`);
    console.log(`   Schedule Time: ${row.schedule_time}`);
    console.log(`   Duration: ${row.duration || 'NULL'}`);
    console.log(`   End Time: ${row.end_time || 'NULL'}`);
    console.log('');
  });

  process.exit(0);
});
