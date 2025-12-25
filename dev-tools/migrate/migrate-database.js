const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== DATABASE MIGRATION ===\n');
console.log('Migrating from: streambro-server1.db');
console.log('Migrating to: db/streambro.db\n');

const oldDbPath = path.join(__dirname, 'streambro-server1.db');
const newDbPath = path.join(__dirname, 'db', 'streambro.db');

const oldDb = new sqlite3.Database(oldDbPath);
const newDb = new sqlite3.Database(newDbPath);

// Step 1: Get all streams from old database
oldDb.all("SELECT * FROM streams", [], (err, streams) => {
  if (err) {
    console.error('Error reading streams:', err);
    process.exit(1);
  }
  
  console.log(`Found ${streams.length} streams to migrate\n`);
  
  if (streams.length === 0) {
    console.log('No streams to migrate. Exiting.');
    oldDb.close();
    newDb.close();
    process.exit(0);
  }
  
  // Step 2: Insert streams into new database
  const insertStream = newDb.prepare(`
    INSERT OR REPLACE INTO streams (
      id, title, video_id, video_type, video_thumbnail, rtmp_url, stream_key, 
      status, start_time, duration, loop_video, user_id, platform, platform_icon,
      use_youtube_api, youtube_broadcast_id, youtube_stream_id, youtube_privacy,
      youtube_enable_auto_start, youtube_enable_auto_stop, youtube_tags,
      youtube_category_id, youtube_record_from_start, youtube_latency_preference,
      youtube_language, youtube_enable_dvr, youtube_enable_embed,
      active_schedule_id, manual_stop, created_at, status_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let migratedStreams = 0;
  
  streams.forEach((stream, idx) => {
    insertStream.run([
      stream.id, stream.title, stream.video_id, stream.video_type, stream.video_thumbnail,
      stream.rtmp_url, stream.stream_key, stream.status, stream.start_time, stream.duration,
      stream.loop_video, stream.user_id, stream.platform, stream.platform_icon,
      stream.use_youtube_api, stream.youtube_broadcast_id, stream.youtube_stream_id,
      stream.youtube_privacy, stream.youtube_enable_auto_start, stream.youtube_enable_auto_stop,
      stream.youtube_tags, stream.youtube_category_id, stream.youtube_record_from_start,
      stream.youtube_latency_preference, stream.youtube_language, stream.youtube_enable_dvr,
      stream.youtube_enable_embed, stream.active_schedule_id, stream.manual_stop,
      stream.created_at, stream.status_updated_at
    ], (err) => {
      if (err) {
        console.error(`✗ Failed to migrate stream ${stream.title}:`, err.message);
      } else {
        migratedStreams++;
        console.log(`✓ Migrated stream ${migratedStreams}/${streams.length}: ${stream.title}`);
      }
      
      // When all streams are migrated, migrate schedules
      if (idx === streams.length - 1) {
        insertStream.finalize();
        
        setTimeout(() => {
          console.log(`\n✓ Migrated ${migratedStreams} streams\n`);
          migrateSchedules();
        }, 500);
      }
    });
  });
});

function migrateSchedules() {
  console.log('Migrating schedules...\n');
  
  oldDb.all("SELECT * FROM stream_schedules", [], (err, schedules) => {
    if (err) {
      console.error('Error reading schedules:', err);
      oldDb.close();
      newDb.close();
      process.exit(1);
    }
    
    console.log(`Found ${schedules.length} schedules to migrate\n`);
    
    if (schedules.length === 0) {
      console.log('No schedules to migrate.');
      finalizeMigration();
      return;
    }
    
    const insertSchedule = newDb.prepare(`
      INSERT OR REPLACE INTO stream_schedules (
        id, stream_id, schedule_time, duration, status, is_recurring, recurring_days,
        user_timezone, youtube_broadcast_id, broadcast_status, executed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let migratedSchedules = 0;
    
    schedules.forEach((schedule, idx) => {
      insertSchedule.run([
        schedule.id, schedule.stream_id, schedule.schedule_time, schedule.duration,
        schedule.status, schedule.is_recurring, schedule.recurring_days, schedule.user_timezone,
        schedule.youtube_broadcast_id, schedule.broadcast_status, schedule.executed_at,
        schedule.created_at
      ], (err) => {
        if (err) {
          console.error(`✗ Failed to migrate schedule ${schedule.id}:`, err.message);
        } else {
          migratedSchedules++;
          console.log(`✓ Migrated schedule ${migratedSchedules}/${schedules.length}`);
        }
        
        if (idx === schedules.length - 1) {
          insertSchedule.finalize();
          
          setTimeout(() => {
            console.log(`\n✓ Migrated ${migratedSchedules} schedules\n`);
            finalizeMigration();
          }, 500);
        }
      });
    });
  });
}

function finalizeMigration() {
  console.log('=== MIGRATION SUMMARY ===\n');
  
  // Count records in new database
  newDb.get("SELECT COUNT(*) as count FROM streams", [], (err, streamCount) => {
    if (err) {
      console.error('Error counting streams:', err);
    } else {
      console.log(`Total streams in new database: ${streamCount.count}`);
    }
    
    newDb.get("SELECT COUNT(*) as count FROM stream_schedules", [], (err, scheduleCount) => {
      if (err) {
        console.error('Error counting schedules:', err);
      } else {
        console.log(`Total schedules in new database: ${scheduleCount.count}`);
      }
      
      console.log('\n✅ MIGRATION COMPLETED!\n');
      console.log('Please restart your server to see the migrated data.\n');
      
      oldDb.close();
      newDb.close();
      process.exit(0);
    });
  });
}
