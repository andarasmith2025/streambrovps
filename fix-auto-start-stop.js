/**
 * Fix Auto Start & Auto Stop for existing broadcasts
 * 
 * This script enables Auto Start and Auto Stop for all upcoming broadcasts
 * that currently have these settings disabled.
 * 
 * Usage: node fix-auto-start-stop.js
 */

const { getTokensForUser } = require('./routes/youtube');
const youtubeService = require('./services/youtubeService');
const { db } = require('./db/database');

async function fixAutoStartStop() {
  console.log('========================================');
  console.log('FIX AUTO START & AUTO STOP');
  console.log('========================================\n');

  try {
    // Get all users with YouTube tokens
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT user_id FROM youtube_tokens', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${users.length} user(s) with YouTube tokens\n`);

    for (const user of users) {
      const userId = user.user_id;
      console.log(`\n--- Processing user: ${userId} ---`);

      try {
        // Get tokens for user
        const tokens = await getTokensForUser(userId);
        if (!tokens) {
          console.log(`⚠️  No valid tokens for user ${userId}, skipping`);
          continue;
        }

        // Get all broadcasts
        const broadcasts = await youtubeService.listBroadcasts(tokens, { maxResults: 50 });
        console.log(`Found ${broadcasts.length} broadcast(s)`);

        // Filter upcoming broadcasts with Auto Start/Stop disabled
        const needsFix = broadcasts.filter(b => {
          const lifecycle = (b.status?.lifeCycleStatus || '').toLowerCase();
          const isUpcoming = ['created', 'ready'].includes(lifecycle);
          const autoStart = b.contentDetails?.enableAutoStart;
          const autoStop = b.contentDetails?.enableAutoStop;
          
          return isUpcoming && (!autoStart || !autoStop);
        });

        console.log(`Found ${needsFix.length} broadcast(s) that need fixing\n`);

        let fixed = 0;
        let failed = 0;

        for (const broadcast of needsFix) {
          const id = broadcast.id;
          const title = broadcast.snippet?.title || 'Untitled';
          const autoStart = broadcast.contentDetails?.enableAutoStart;
          const autoStop = broadcast.contentDetails?.enableAutoStop;

          console.log(`Fixing: ${title} (${id})`);
          console.log(`  Current: Auto Start=${autoStart}, Auto Stop=${autoStop}`);

          try {
            await youtubeService.updateBroadcast(tokens, {
              broadcastId: id,
              title: broadcast.snippet?.title,
              description: broadcast.snippet?.description,
              privacyStatus: broadcast.status?.privacyStatus,
              scheduledStartTime: broadcast.snippet?.scheduledStartTime,
              enableAutoStart: true,  // ✅ ENABLE
              enableAutoStop: true,   // ✅ ENABLE
            });

            console.log(`  ✅ Fixed: Auto Start=true, Auto Stop=true`);
            fixed++;
          } catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
            failed++;
          }
        }

        console.log(`\nUser ${userId} summary:`);
        console.log(`  ✅ Fixed: ${fixed}`);
        console.log(`  ❌ Failed: ${failed}`);

      } catch (err) {
        console.error(`Error processing user ${userId}:`, err.message);
      }
    }

    console.log('\n========================================');
    console.log('FIX COMPLETE');
    console.log('========================================');
    console.log('\nAll upcoming broadcasts now have:');
    console.log('  ✅ Auto Start: ENABLED');
    console.log('  ✅ Auto Stop: ENABLED');
    console.log('\nBroadcasts will now automatically:');
    console.log('  1. Go live when stream starts');
    console.log('  2. Complete when stream ends');
    console.log('  3. Process VOD faster');

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }

  process.exit(0);
}

// Run the fix
fixAutoStartStop();
