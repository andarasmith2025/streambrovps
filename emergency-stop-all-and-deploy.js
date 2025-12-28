/**
 * EMERGENCY: Stop all streams and clean up
 */

const { db } = require('./db/database');

async function emergencyStopAll() {
  console.log('========================================');
  console.log('EMERGENCY: STOPPING ALL STREAMS');
  console.log('========================================\n');
  
  try {
    // 1. Force all streams to offline
    console.log('1. Forcing all streams to offline...');
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE streams SET 
          status = 'offline',
          active_schedule_id = NULL,
          youtube_broadcast_id = NULL,
          manual_stop = 1,
          status_updated_at = CURRENT_TIMESTAMP
         WHERE status != 'offline'`,
        [],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Updated ${this.changes} stream(s) to offline`);
            resolve();
          }
        }
      );
    });
    
    // 2. Clear all schedule broadcast IDs
    console.log('\n2. Clearing all schedule broadcast IDs...');
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE stream_schedules SET 
          youtube_broadcast_id = NULL,
          broadcast_status = 'pending'
         WHERE youtube_broadcast_id IS NOT NULL`,
        [],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Cleared ${this.changes} schedule broadcast ID(s)`);
            resolve();
          }
        }
      );
    });
    
    // 3. Disable auto-start for all streams
    console.log('\n3. Disabling auto-start for all streams...');
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE streams SET 
          youtube_auto_start = 0
         WHERE youtube_auto_start = 1`,
        [],
        function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Disabled auto-start for ${this.changes} stream(s)`);
            resolve();
          }
        }
      );
    });
    
    console.log('\n========================================');
    console.log('✅ EMERGENCY CLEANUP COMPLETE');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('1. Deploy new code to VPS (broadcast created AFTER FFmpeg active)');
    console.log('2. Restart PM2');
    console.log('3. Re-enable auto-start for streams you want');
    console.log('4. Create new schedules');
    console.log('\n⚠️  DO NOT create schedules until new code is deployed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

emergencyStopAll();
