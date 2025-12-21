const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== Checking Yesterday\'s Schedules & History ===\n');

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

const today = new Date(now);
today.setHours(0, 0, 0, 0);

console.log('Current Time:', now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
console.log('Yesterday Start:', yesterday.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
console.log('Today Start:', today.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
console.log('');

// Check all streams with schedules
db.all(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.created_at,
    s.start_time,
    s.end_time,
    COUNT(sc.id) as schedule_count
  FROM streams s
  LEFT JOIN stream_schedules sc ON s.id = sc.stream_id
  WHERE s.created_at >= ?
  GROUP BY s.id
  ORDER BY s.created_at DESC
`, [yesterday.toISOString()], (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`\n📋 Found ${streams.length} stream(s) created since yesterday:\n`);

  if (streams.length === 0) {
    console.log('No streams found.');
    db.close();
    return;
  }

  let processedStreams = 0;

  streams.forEach((stream, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Stream #${idx + 1}: ${stream.title}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`ID: ${stream.id}`);
    console.log(`Status: ${stream.status}`);
    console.log(`Created: ${new Date(stream.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    console.log(`Start Time: ${stream.start_time ? new Date(stream.start_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Not started'}`);
    console.log(`End Time: ${stream.end_time ? new Date(stream.end_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Not ended'}`);
    console.log(`Schedule Count: ${stream.schedule_count}`);

    // Get all schedules for this stream
    db.all(`
      SELECT 
        id,
        schedule_time,
        duration,
        is_recurring,
        recurring_days,
        status,
        executed_at
      FROM stream_schedules
      WHERE stream_id = ?
      ORDER BY schedule_time ASC
    `, [stream.id], (err, schedules) => {
      if (err) {
        console.error('Error getting schedules:', err);
        return;
      }

      console.log(`\n📅 Schedules (${schedules.length}):`);
      schedules.forEach((sch, i) => {
        const schTime = new Date(sch.schedule_time);
        console.log(`\n  Schedule #${i + 1}:`);
        console.log(`    Time: ${schTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
        console.log(`    Duration: ${sch.duration} minutes`);
        console.log(`    Status: ${sch.status}`);
        console.log(`    Recurring: ${sch.is_recurring ? 'Yes' : 'No'}`);
        if (sch.is_recurring) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayIndices = sch.recurring_days.split(',').map(d => parseInt(d));
          const dayNames = dayIndices.map(d => days[d]).join(', ');
          console.log(`    Days: ${dayNames}`);
        }
        console.log(`    Executed At: ${sch.executed_at ? new Date(sch.executed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Not executed'}`);
      });

      // Get history for this stream
      db.all(`
        SELECT 
          id,
          status,
          start_time,
          end_time,
          duration_seconds,
          error_message,
          created_at
        FROM stream_history
        WHERE stream_id = ?
        ORDER BY created_at DESC
      `, [stream.id], (err, history) => {
        if (err) {
          console.error('Error getting history:', err);
          return;
        }

        console.log(`\n📊 History (${history.length} entries):`);
        if (history.length === 0) {
          console.log('  ⚠️  No history found - Stream may not have been executed!');
        } else {
          history.forEach((h, i) => {
            console.log(`\n  History #${i + 1}:`);
            console.log(`    Status: ${h.status}`);
            console.log(`    Start: ${h.start_time ? new Date(h.start_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'N/A'}`);
            console.log(`    End: ${h.end_time ? new Date(h.end_time).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'N/A'}`);
            console.log(`    Duration: ${h.duration_seconds ? Math.floor(h.duration_seconds / 60) + ' minutes' : 'N/A'}`);
            if (h.error_message) {
              console.log(`    Error: ${h.error_message}`);
            }
            console.log(`    Created: ${new Date(h.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
          });
        }

        processedStreams++;
        if (processedStreams === streams.length) {
          console.log(`\n${'='.repeat(60)}`);
          console.log('✅ Analysis Complete');
          console.log(`${'='.repeat(60)}\n`);
          
          // Summary
          const totalSchedules = streams.reduce((sum, s) => sum + s.schedule_count, 0);
          const totalHistory = history.length;
          
          console.log('📈 SUMMARY:');
          console.log(`  Total Streams: ${streams.length}`);
          console.log(`  Total Schedules: ${totalSchedules}`);
          console.log(`  Total History Entries: ${totalHistory}`);
          
          if (totalSchedules > totalHistory) {
            console.log(`\n⚠️  WARNING: ${totalSchedules - totalHistory} schedule(s) may not have been executed!`);
            console.log('   Possible causes:');
            console.log('   1. Token refresh failed');
            console.log('   2. YouTube API error');
            console.log('   3. Scheduler not running');
            console.log('   4. Stream still scheduled (not executed yet)');
          }
          
          db.close();
        }
      });
    });
  });
});
