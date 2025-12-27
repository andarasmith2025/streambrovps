const { db } = require('./db/database');

console.log('Checking streams table schema...\n');

db.all("PRAGMA table_info(streams)", (err, columns) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('Columns in streams table:');
  columns.forEach(col => {
    console.log(`  ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
  });
  
  const hasYoutubeChannelId = columns.some(col => col.name === 'youtube_channel_id');
  
  console.log(`\nyoutube_channel_id column exists: ${hasYoutubeChannelId ? '✅ YES' : '❌ NO'}`);
  
  if (!hasYoutubeChannelId) {
    console.log('\n⚠️  PROBLEM: youtube_channel_id column is missing!');
    console.log('This is why the channel ID is not being saved.');
  }
  
  process.exit(0);
});
