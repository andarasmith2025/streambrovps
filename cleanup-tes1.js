// Cleanup script for TES 1 stream
const { db } = require('./db/database');

console.log('🔍 Checking for TES 1 stream...\n');

// First, check if stream exists
db.get(
  "SELECT id, title, status FROM streams WHERE id = '33da4281-9b40-4fa2-b3b8-48fa6ddd0134'",
  (err, stream) => {
    if (err) {
      console.error('❌ Error checking stream:', err);
      process.exit(1);
    }

    if (!stream) {
      console.log('✅ Stream TES 1 not found (already deleted)');
      process.exit(0);
    }

    console.log('📋 Found stream:');
    console.log(`   ID: ${stream.id}`);
    console.log(`   Title: ${stream.title}`);
    console.log(`   Status: ${stream.status}`);
    console.log('');

    // Check schedules
    db.all(
      "SELECT id, schedule_time, status FROM stream_schedules WHERE stream_id = '33da4281-9b40-4fa2-b3b8-48fa6ddd0134'",
      (err, schedules) => {
        if (err) {
          console.error('❌ Error checking schedules:', err);
          process.exit(1);
        }

        console.log(`📅 Found ${schedules.length} schedule(s)`);
        schedules.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.schedule_time} (${s.status})`);
        });
        console.log('');

        // Delete schedules first (foreign key constraint)
        console.log('🗑️  Deleting schedules...');
        db.run(
          "DELETE FROM stream_schedules WHERE stream_id = '33da4281-9b40-4fa2-b3b8-48fa6ddd0134'",
          function (err) {
            if (err) {
              console.error('❌ Error deleting schedules:', err);
              process.exit(1);
            }

            console.log(`✅ Deleted ${this.changes} schedule(s)`);
            console.log('');

            // Now delete the stream
            console.log('🗑️  Deleting stream...');
            db.run(
              "DELETE FROM streams WHERE id = '33da4281-9b40-4fa2-b3b8-48fa6ddd0134'",
              function (err) {
                if (err) {
                  console.error('❌ Error deleting stream:', err);
                  process.exit(1);
                }

                console.log(`✅ Deleted stream successfully!`);
                console.log('');
                console.log('🎉 Cleanup complete!');
                process.exit(0);
              }
            );
          }
        );
      }
    );
  }
);
