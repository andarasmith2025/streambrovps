const { db } = require('./db/database');

async function checkBroadcastCreated() {
  try {
    console.log('\n=== CHECKING IF BROADCAST WAS CREATED ===\n');

    const stream = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM streams WHERE title LIKE ?',
        ['%jadwal multi baru%'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!stream) {
      console.log('❌ Stream not found');
      return;
    }

    console.log(`📺 Stream: ${stream.title}`);
    console.log(`   ID: ${stream.id}`);
    console.log(`   Status: ${stream.status}`);
    console.log(`   Broadcast ID: ${stream.youtube_broadcast_id || 'NOT SET'}`);
    console.log(`   Start Time: ${stream.start_time}`);
    console.log(`   Scheduled End: ${stream.scheduled_end_time || 'NOT SET'}`);
    console.log(`   Active Schedule ID: ${stream.active_schedule_id || 'NOT SET'}`);

    if (!stream.youtube_broadcast_id) {
      console.log('\n❌ PROBLEM: Broadcast ID is NOT SET!');
      console.log('   This means broadcast was NEVER created.');
      console.log('   The "NEW BROADCAST FLOW" failed silently.');
    } else {
      console.log('\n✅ Broadcast ID exists: ' + stream.youtube_broadcast_id);
    }

    console.log('\n=== END ===\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkBroadcastCreated();
