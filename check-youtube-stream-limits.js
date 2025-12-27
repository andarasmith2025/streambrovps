const { db } = require('./db/database');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING YOUTUBE 24-HOUR STREAMING LIMITS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 YouTube Live Streaming Limits:\n');
console.log('  • Unverified channels: Cannot live stream');
console.log('  • Verified channels: Can stream up to 12 hours');
console.log('  • After 12 hours: Stream automatically ends');
console.log('  • Multiple streams: Max 5 concurrent streams per channel');
console.log('  • 24-hour limit: Some channels limited to 24 hours total/day');
console.log('');

const now = new Date();
const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

console.log('─'.repeat(63));
console.log('📊 CHECKING STREAM USAGE IN LAST 24 HOURS:\n');
console.log(`Current Time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
console.log(`24 Hours Ago: ${last24Hours.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
console.log('');

// Get all channels
db.all(
  `SELECT channel_id, channel_title FROM youtube_channels WHERE channel_id NOT LIKE 'migrated_%'`,
  (err, channels) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }

    let processed = 0;
    const channelStats = [];

    channels.forEach(channel => {
      // Get streams for this channel in last 24 hours
      db.all(
        `SELECT 
          id, title, status, start_time, end_time, duration,
          CASE 
            WHEN end_time IS NOT NULL THEN 
              CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)
            WHEN start_time IS NOT NULL THEN 
              CAST((julianday('now') - julianday(start_time)) * 24 AS REAL)
            ELSE 0
          END as actual_hours
        FROM streams 
        WHERE youtube_channel_id = ?
        AND (start_time >= ? OR status = 'live')
        ORDER BY start_time DESC`,
        [channel.channel_id, last24Hours.toISOString()],
        (err, streams) => {
          if (err) {
            console.error('Error:', err);
            return;
          }

          const totalHours = streams.reduce((sum, s) => sum + (s.actual_hours || 0), 0);
          const liveStreams = streams.filter(s => s.status === 'live');
          const completedStreams = streams.filter(s => s.status === 'offline' || s.status === 'completed');

          channelStats.push({
            channel: channel.channel_title,
            channelId: channel.channel_id,
            totalStreams: streams.length,
            liveStreams: liveStreams.length,
            completedStreams: completedStreams.length,
            totalHours: totalHours,
            streams: streams
          });

          processed++;
          if (processed === channels.length) {
            displayResults(channelStats);
          }
        }
      );
    });

    if (channels.length === 0) {
      console.log('No channels found');
      process.exit(0);
    }
  }
);

function displayResults(channelStats) {
  channelStats.forEach(stat => {
    console.log(`📺 ${stat.channel.toUpperCase()}`);
    console.log(`   Channel ID: ${stat.channelId}`);
    console.log(`   Total Streams (24h): ${stat.totalStreams}`);
    console.log(`   Currently Live: ${stat.liveStreams}`);
    console.log(`   Completed: ${stat.completedStreams}`);
    console.log(`   Total Hours Streamed: ${stat.totalHours.toFixed(2)} hours`);
    
    const remainingHours = 24 - stat.totalHours;
    if (stat.totalHours >= 24) {
      console.log(`   ⚠️  WARNING: 24-HOUR LIMIT REACHED!`);
      console.log(`   ❌ Cannot create new streams until limit resets`);
    } else if (stat.totalHours >= 20) {
      console.log(`   ⚠️  WARNING: Approaching 24-hour limit`);
      console.log(`   Remaining: ${remainingHours.toFixed(2)} hours`);
    } else {
      console.log(`   ✅ Remaining: ${remainingHours.toFixed(2)} hours`);
    }

    if (stat.liveStreams > 5) {
      console.log(`   ⚠️  WARNING: More than 5 concurrent streams!`);
    }

    console.log('');

    // Show live streams details
    if (stat.liveStreams > 0) {
      console.log('   🔴 Live Streams:');
      stat.streams.filter(s => s.status === 'live').forEach((s, idx) => {
        console.log(`      ${idx + 1}. ${s.title.substring(0, 45)}...`);
        console.log(`         Started: ${new Date(s.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
        console.log(`         Duration: ${s.actual_hours.toFixed(2)} hours so far`);
        
        if (s.actual_hours >= 12) {
          console.log(`         ⚠️  WARNING: Exceeded 12-hour limit! Should have auto-ended`);
        }
      });
      console.log('');
    }
  });

  console.log('═'.repeat(63));
  console.log('📊 ANALYSIS:\n');

  const overLimit = channelStats.filter(s => s.totalHours >= 24);
  const nearLimit = channelStats.filter(s => s.totalHours >= 20 && s.totalHours < 24);
  const tooManyConcurrent = channelStats.filter(s => s.liveStreams > 5);

  if (overLimit.length > 0) {
    console.log('❌ CHANNELS OVER 24-HOUR LIMIT:');
    overLimit.forEach(s => {
      console.log(`   • ${s.channel}: ${s.totalHours.toFixed(2)} hours`);
    });
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('   • Wait until 24-hour window resets');
    console.log('   • Stop some streams to free up hours');
    console.log('   • Use different channel for new streams');
    console.log('');
  }

  if (nearLimit.length > 0) {
    console.log('⚠️  CHANNELS NEAR 24-HOUR LIMIT:');
    nearLimit.forEach(s => {
      console.log(`   • ${s.channel}: ${s.totalHours.toFixed(2)} hours (${(24 - s.totalHours).toFixed(2)}h remaining)`);
    });
    console.log('');
  }

  if (tooManyConcurrent.length > 0) {
    console.log('⚠️  CHANNELS WITH TOO MANY CONCURRENT STREAMS:');
    tooManyConcurrent.forEach(s => {
      console.log(`   • ${s.channel}: ${s.liveStreams} concurrent streams (max 5)`);
    });
    console.log('');
  }

  if (overLimit.length === 0 && nearLimit.length === 0 && tooManyConcurrent.length === 0) {
    console.log('✅ All channels within YouTube limits');
    console.log('');
    console.log('💡 The issue is likely:');
    console.log('   • OAuth token expired (need CLIENT_ID/SECRET to refresh)');
    console.log('   • Not YouTube streaming limits');
  }

  console.log('═'.repeat(63));
  process.exit(0);
}
