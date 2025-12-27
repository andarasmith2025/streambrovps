const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

const streamId = '1e191c57-888d-4d42-8266-508148246b40';

console.log('=== Checking Stream Stop Time ===\n');

db.get(`
  SELECT 
    id,
    title,
    status,
    start_time,
    scheduled_end_time,
    end_time,
    updated_at,
    status_updated_at
  FROM streams
  WHERE id = ?
`, [streamId], (err, stream) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  if (!stream) {
    console.log('Stream not found');
    db.close();
    return;
  }

  console.log(`Stream: ${stream.title}`);
  console.log(`Status: ${stream.status}`);
  console.log(`Start Time: ${stream.start_time}`);
  console.log(`Scheduled End Time: ${stream.scheduled_end_time}`);
  console.log(`Actual End Time: ${stream.end_time}`);
  console.log(`Last Updated: ${stream.updated_at}`);
  console.log(`Status Updated: ${stream.status_updated_at}`);
  
  if (stream.start_time) {
    const start = new Date(stream.start_time);
    console.log(`\nStart (WIB): ${start.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
  }
  
  if (stream.scheduled_end_time) {
    const scheduledEnd = new Date(stream.scheduled_end_time);
    console.log(`Scheduled End (WIB): ${scheduledEnd.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
  }
  
  if (stream.end_time) {
    const actualEnd = new Date(stream.end_time);
    console.log(`Actual End (WIB): ${actualEnd.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
  }
  
  if (stream.status_updated_at) {
    const statusUpdate = new Date(stream.status_updated_at);
    console.log(`Status Changed (WIB): ${statusUpdate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false })}`);
  }
  
  // Check if auto-stopped
  if (stream.scheduled_end_time && stream.end_time) {
    const scheduledEnd = new Date(stream.scheduled_end_time);
    const actualEnd = new Date(stream.end_time);
    const diffMinutes = Math.round((actualEnd - scheduledEnd) / 60000);
    
    console.log(`\nTime difference: ${diffMinutes} minutes`);
    
    if (Math.abs(diffMinutes) <= 2) {
      console.log('✅ Stream stopped automatically (within 2 minutes of scheduled time)');
    } else if (diffMinutes < 0) {
      console.log(`⚠️  Stream stopped ${Math.abs(diffMinutes)} minutes BEFORE scheduled time (manual stop?)`);
    } else {
      console.log(`⚠️  Stream stopped ${diffMinutes} minutes AFTER scheduled time (delayed auto-stop?)`);
    }
  }

  db.close();
});
