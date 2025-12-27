const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DEBUG HSN Auto-Stop Issue ===\n');

// Get current time in different formats
const now = new Date();
console.log('Current Time Analysis:');
console.log(`  JavaScript Date: ${now}`);
console.log(`  ISO String: ${now.toISOString()}`);
console.log(`  WIB Time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
console.log(`  Unix Timestamp: ${now.getTime()}`);
console.log('');

// Check active HSN streams
db.all(`
  SELECT 
    s.id,
    s.title,
    s.status,
    s.start_time,
    s.scheduled_end_time,
    s.active_schedule_id,
    s.duration,
    s.youtube_channel_id,
    yc.channel_title as channel_name
  FROM streams s
  LEFT JOIN youtube_channels yc ON s.youtube_channel_id = yc.channel_id
  WHERE s.youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w'
    AND s.status IN ('active', 'live')
  ORDER BY s.start_time DESC
`, (err, streams) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${streams.length} active/live HSN stream(s):\n`);
  
  if (streams.length === 0) {
    console.log('No active HSN streams found.\n');
    
    // Check recent streams
    db.all(`
      SELECT 
        s.id,
        s.title,
        s.status,
        s.start_time,
        s.scheduled_end_time,
        s.updated_at
      FROM streams s
      WHERE s.youtube_channel_id = 'UCsAt2CugoD0xatdKguG1O5w'
      ORDER BY s.updated_at DESC
      LIMIT 3
    `, (err, recentStreams) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        return;
      }
      
      console.log('Recent HSN streams:');
      recentStreams.forEach((stream, idx) => {
        console.log(`\n[${idx + 1}] ${stream.title}`);
        console.log(`    Status: ${stream.status}`);
        console.log(`    Start: ${stream.start_time}`);
        console.log(`    Scheduled End: ${stream.scheduled_end_time}`);
        console.log(`    Last Updated: ${stream.updated_at}`);
      });
      
      db.close();
    });
    return;
  }
  
  streams.forEach((stream, idx) => {
    console.log(`\n[${'='.repeat(60)}]`);
    console.log(`[${idx + 1}] Stream: ${stream.title}`);
    console.log(`[${'='.repeat(60)}]`);
    console.log(`ID: ${stream.id}`);
    console.log(`Status: ${stream.status}`);
    console.log(`Channel: ${stream.channel_name || 'Unknown'}`);
    console.log(`Active Schedule ID: ${stream.active_schedule_id || 'None'}`);
    console.log(`Duration: ${stream.duration || 'Not set'} minutes`);
    console.log('');
    
    // Analyze times
    console.log('Time Analysis:');
    console.log(`  Start Time (DB): ${stream.start_time}`);
    console.log(`  Scheduled End Time (DB): ${stream.scheduled_end_time}`);
    
    if (stream.start_time) {
      const startDate = new Date(stream.start_time);
      console.log(`  Start Time (Parsed): ${startDate}`);
      console.log(`  Start Time (WIB): ${startDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
    }
    
    if (stream.scheduled_end_time) {
      const endDate = new Date(stream.scheduled_end_time);
      const currentTime = new Date();
      const diffMs = endDate.getTime() - currentTime.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      
      console.log(`  Scheduled End (Parsed): ${endDate}`);
      console.log(`  Scheduled End (WIB): ${endDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      console.log('');
      console.log('Should Stop Analysis:');
      console.log(`  Current Time: ${currentTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`  End Time: ${endDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`  Time Difference: ${diffMinutes} minutes`);
      
      if (diffMinutes < 0) {
        console.log(`  ⚠️  STREAM IS ${Math.abs(diffMinutes)} MINUTES LATE!`);
        console.log(`  ⚠️  SHOULD HAVE STOPPED AT: ${endDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
      } else {
        console.log(`  ✓ Stream will stop in ${diffMinutes} minutes`);
      }
    } else {
      console.log(`  ⚠️  NO SCHEDULED_END_TIME SET!`);
      
      // Try to calculate from duration
      if (stream.duration && stream.start_time) {
        const startDate = new Date(stream.start_time);
        const calculatedEnd = new Date(startDate.getTime() + stream.duration * 60 * 1000);
        console.log(`  Calculated End (from duration): ${calculatedEnd.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`);
      }
    }
    
    // Check schedule if active_schedule_id exists
    if (stream.active_schedule_id) {
      console.log('');
      console.log('Checking Active Schedule...');
      
      db.get(`
        SELECT 
          id,
          time as start_time,
          end_time,
          duration,
          is_recurring,
          recurring_days
        FROM stream_schedules
        WHERE id = ?
      `, [stream.active_schedule_id], (err, schedule) => {
        if (err) {
          console.error('  Error fetching schedule:', err);
          return;
        }
        
        if (schedule) {
          console.log(`  Schedule ID: ${schedule.id}`);
          console.log(`  Start Time: ${schedule.start_time}`);
          console.log(`  End Time: ${schedule.end_time || 'Not set'}`);
          console.log(`  Duration: ${schedule.duration} minutes`);
          console.log(`  Recurring: ${schedule.is_recurring ? 'Yes' : 'No'}`);
          if (schedule.is_recurring) {
            console.log(`  Days: ${schedule.recurring_days}`);
          }
          
          if (!schedule.end_time) {
            console.log(`  ⚠️  SCHEDULE HAS NO END_TIME!`);
          }
        } else {
          console.log(`  ⚠️  Schedule ${stream.active_schedule_id} not found!`);
        }
        
        if (idx === streams.length - 1) {
          db.close();
        }
      });
    } else if (idx === streams.length - 1) {
      db.close();
    }
  });
});
