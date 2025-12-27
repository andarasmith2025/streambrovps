require('dotenv').config();
const { db } = require('./db/database');
const { google } = require('googleapis');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING YOUTUBE API BROADCASTS vs DATABASE');
console.log('═══════════════════════════════════════════════════════════\n');

async function checkBroadcasts() {
  // Get HSN channel credentials
  const channel = await new Promise((resolve, reject) => {
    db.get(
      `SELECT yc.*, u.youtube_client_id, u.youtube_client_secret, u.youtube_redirect_uri
       FROM youtube_channels yc
       JOIN users u ON yc.user_id = u.id
       WHERE yc.channel_id = 'UCsAt2CugoD0xatdKguG1O5w'`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!channel) {
    console.log('❌ HSN channel not found');
    process.exit(1);
  }

  console.log(`📺 Channel: ${channel.channel_title}`);
  console.log(`User ID: ${channel.user_id}\n`);

  // Create OAuth client
  const oauth2Client = new google.auth.OAuth2(
    channel.youtube_client_id,
    channel.youtube_client_secret,
    channel.youtube_redirect_uri
  );

  oauth2Client.setCredentials({
    access_token: channel.access_token,
    refresh_token: channel.refresh_token,
    expiry_date: channel.expiry_date
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Get all upcoming broadcasts from YouTube API
  console.log('🔍 Fetching broadcasts from YouTube API...\n');

  try {
    const response = await youtube.liveBroadcasts.list({
      part: 'id,snippet,status',
      broadcastStatus: 'upcoming',
      maxResults: 50
    });

    const apiBroadcasts = response.data.items || [];
    console.log(`📊 YouTube API: ${apiBroadcasts.length} upcoming broadcasts\n`);

    if (apiBroadcasts.length > 0) {
      console.log('Upcoming broadcasts in YouTube:\n');
      apiBroadcasts.forEach((b, idx) => {
        console.log(`${idx + 1}. ${b.snippet.title}`);
        console.log(`   Broadcast ID: ${b.id}`);
        console.log(`   Scheduled: ${b.snippet.scheduledStartTime}`);
        console.log(`   Privacy: ${b.status.privacyStatus}`);
        console.log('');
      });
    }

    // Get broadcasts from database
    const dbBroadcasts = await new Promise((resolve, reject) => {
      db.all(
        `SELECT youtube_broadcast_id, title, status 
         FROM streams 
         WHERE youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w' 
         AND youtube_broadcast_id IS NOT NULL`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    console.log('─'.repeat(63));
    console.log(`📊 Database: ${dbBroadcasts.length} broadcasts\n`);

    // Find orphaned broadcasts (in YouTube but not in DB)
    const dbBroadcastIds = new Set(dbBroadcasts.map(b => b.youtube_broadcast_id));
    const orphaned = apiBroadcasts.filter(b => !dbBroadcastIds.has(b.id));

    if (orphaned.length > 0) {
      console.log('─'.repeat(63));
      console.log(`⚠️  ORPHANED BROADCASTS: ${orphaned.length}\n`);
      console.log('These broadcasts exist in YouTube but NOT in database:\n');

      orphaned.forEach((b, idx) => {
        console.log(`${idx + 1}. ${b.snippet.title}`);
        console.log(`   Broadcast ID: ${b.id}`);
        console.log(`   Scheduled: ${b.snippet.scheduledStartTime}`);
        console.log('');
      });

      console.log('💡 These orphaned broadcasts are wasting your API quota!');
      console.log('They were likely created during PM2 restarts but not saved to DB.');
    }

    console.log('\n' + '═'.repeat(63));
    console.log('📊 SUMMARY:\n');
    console.log(`YouTube API: ${apiBroadcasts.length} upcoming`);
    console.log(`Database: ${dbBroadcasts.length} total`);
    console.log(`Orphaned: ${orphaned.length} (in YouTube but not in DB)`);
    console.log('');

    if (orphaned.length > 10) {
      console.log('❌ CRITICAL: Too many orphaned broadcasts!');
      console.log('');
      console.log('CAUSES:');
      console.log('  • PM2 restart creates broadcast but crashes before saving to DB');
      console.log('  • broadcastScheduler creates broadcast but fails to update DB');
      console.log('  • Error during broadcast creation flow');
      console.log('');
      console.log('SOLUTIONS:');
      console.log('  1. Delete orphaned broadcasts from YouTube Studio');
      console.log('  2. Fix broadcast creation to be atomic (create + save in transaction)');
      console.log('  3. Add cleanup job to delete old upcoming broadcasts');
      console.log('  4. Reduce PM2 restarts');
    }

    console.log('═'.repeat(63));

  } catch (error) {
    console.error('❌ Error fetching from YouTube API:', error.message);
    if (error.code === 403) {
      console.log('\n⚠️  This might be the rate limit issue!');
    }
  }
}

checkBroadcasts().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
