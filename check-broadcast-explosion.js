const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING BROADCAST EXPLOSION ISSUE');
console.log('═══════════════════════════════════════════════════════════\n');

// Get all streams with broadcast_id
db.all(
  `SELECT 
    s.id as stream_id,
    s.title,
    s.youtube_broadcast_id,
    s.youtube_channel_id,
    s.status,
    s.created_at,
    s.updated_at,
    yc.channel_title
   FROM streams s
   LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
   WHERE s.youtube_broadcast_id IS NOT NULL
   ORDER BY s.created_at DESC`,
  (err, streams) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    console.log(`📊 Total broadcasts in database: ${streams.length}\n`);

    // Group by channel
    const byChannel = {};
    streams.forEach(s => {
      const channel = s.channel_title || 'Unknown';
      if (!byChannel[channel]) byChannel[channel] = [];
      byChannel[channel].push(s);
    });

    Object.keys(byChannel).forEach(channel => {
      const channelStreams = byChannel[channel];
      console.log(`📺 ${channel}: ${channelStreams.length} broadcasts`);
    });

    console.log('\n' + '─'.repeat(63));
    console.log('🔍 Checking for duplicate broadcasts (same title):\n');

    // Group by title to find duplicates
    const byTitle = {};
    streams.forEach(s => {
      const title = s.title;
      if (!byTitle[title]) byTitle[title] = [];
      byTitle[title].push(s);
    });

    const duplicates = Object.keys(byTitle).filter(title => byTitle[title].length > 1);
    
    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} titles with multiple broadcasts:\n`);
      
      duplicates.slice(0, 10).forEach((title, idx) => {
        const broadcasts = byTitle[title];
        console.log(`${idx + 1}. "${title.substring(0, 50)}..." (${broadcasts.length} broadcasts)`);
        broadcasts.forEach((b, bidx) => {
          console.log(`   ${bidx + 1}. Broadcast ID: ${b.youtube_broadcast_id}`);
          console.log(`      Status: ${b.status}`);
          console.log(`      Created: ${b.created_at}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No duplicate broadcasts found');
    }

    // Check schedules
    console.log('─'.repeat(63));
    console.log('🔍 Checking schedules:\n');

    db.all(
      `SELECT 
        COUNT(*) as total_schedules,
        COUNT(DISTINCT stream_id) as unique_streams,
        COUNT(CASE WHEN youtube_broadcast_id IS NOT NULL THEN 1 END) as schedules_with_broadcast
       FROM stream_schedules`,
      (err, stats) => {
        if (err) {
          console.error('Error:', err);
          process.exit(1);
        }

        const stat = stats[0];
        console.log(`Total schedules: ${stat.total_schedules}`);
        console.log(`Unique streams: ${stat.unique_streams}`);
        console.log(`Schedules with broadcast ID: ${stat.schedules_with_broadcast}`);
        console.log('');

        // Calculate ratio
        const broadcastsPerStream = streams.length / stat.unique_streams;
        console.log(`📊 Average broadcasts per stream: ${broadcastsPerStream.toFixed(2)}`);
        
        if (broadcastsPerStream > 2) {
          console.log('⚠️  WARNING: Too many broadcasts per stream!');
          console.log('This indicates broadcast explosion issue.');
        }

        console.log('\n' + '═'.repeat(63));
        console.log('💡 ANALYSIS:\n');

        if (duplicates.length > 0) {
          console.log('❌ PROBLEM: Multiple broadcasts for same stream title');
          console.log('');
          console.log('POSSIBLE CAUSES:');
          console.log('  1. PM2 restart creates new broadcast each time');
          console.log('  2. Multi-schedule creates broadcast for each schedule');
          console.log('  3. broadcastScheduler not checking existing broadcasts');
          console.log('');
          console.log('SOLUTIONS:');
          console.log('  1. Check if broadcast exists before creating new one');
          console.log('  2. Reuse broadcast_id from stream table');
          console.log('  3. Delete old upcoming broadcasts from YouTube');
          console.log('  4. Fix broadcastScheduler to not create duplicates');
        }

        console.log('═'.repeat(63));
        process.exit(0);
      }
    );
  }
);
