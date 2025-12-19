const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'streambro.db');
const db = new sqlite3.Database(dbPath);

console.log('=== CLEANING UP UNUSED FIELDS ===\n');

console.log('📋 FRONTEND FORM FIELDS (yang masih digunakan):');
console.log('');
console.log('Basic Fields:');
console.log('  ✓ streamTitle → title');
console.log('  ✓ videoId → video_id');
console.log('  ✓ loopVideo → loop_video');
console.log('');
console.log('Manual RTMP Fields:');
console.log('  ✓ rtmpUrl → rtmp_url');
console.log('  ✓ streamKey → stream_key');
console.log('');
console.log('YouTube API Fields:');
console.log('  ✓ youtubeRtmpUrl → rtmp_url');
console.log('  ✓ youtubeStreamKey → stream_key');
console.log('  ✓ youtubeStreamId → (hidden field)');
console.log('  ✓ youtubeDescription → youtube_description');
console.log('  ✓ youtubePrivacy → youtube_privacy');
console.log('  ✓ youtubeMadeForKids → youtube_made_for_kids');
console.log('  ✓ youtubeAgeRestricted → youtube_age_restricted');
console.log('  ✓ youtubeSyntheticContent → youtube_synthetic_content');
console.log('  ✓ youtubeAutoStart → youtube_auto_start');
console.log('  ✓ youtubeAutoEnd → youtube_auto_end');
console.log('  ✓ youtubeThumbnail → (file upload, not in DB)');
console.log('');
console.log('Schedule Fields:');
console.log('  ✓ schedules → stream_schedules table');
console.log('');

console.log('❌ UNUSED FIELDS (akan dihapus):');
console.log('  - bitrate (Advanced Settings dihapus)');
console.log('  - fps (Advanced Settings dihapus)');
console.log('  - resolution (Advanced Settings dihapus)');
console.log('  - orientation (Advanced Settings dihapus)');
console.log('  - use_advanced_settings (Advanced Settings dihapus)');
console.log('');

console.log('⚠️  WARNING: This will modify the database schema!');
console.log('Creating backup first...\n');

// Backup database
const fs = require('fs');
const backupPath = path.join(__dirname, 'db', `streambro_backup_${Date.now()}.db`);
fs.copyFileSync(dbPath, backupPath);
console.log(`✓ Backup created: ${backupPath}\n`);

// SQLite doesn't support DROP COLUMN directly, need to recreate table
console.log('Recreating streams table without unused fields...\n');

db.serialize(() => {
  // Create new table with only needed fields
  db.run(`CREATE TABLE streams_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    video_id TEXT,
    rtmp_url TEXT NOT NULL,
    stream_key TEXT NOT NULL,
    platform TEXT DEFAULT 'Custom',
    platform_icon TEXT DEFAULT 'ti-broadcast',
    loop_video INTEGER DEFAULT 0,
    schedule_time TEXT,
    duration INTEGER DEFAULT 0,
    status TEXT DEFAULT 'offline',
    status_updated_at TIMESTAMP,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    youtube_broadcast_id TEXT,
    active_schedule_id TEXT,
    youtube_description TEXT,
    youtube_privacy TEXT DEFAULT 'unlisted',
    youtube_made_for_kids INTEGER DEFAULT 0,
    youtube_auto_start INTEGER DEFAULT 0,
    use_youtube_api INTEGER DEFAULT 0,
    youtube_auto_end INTEGER DEFAULT 0,
    manual_stop INTEGER DEFAULT 0,
    youtube_age_restricted INTEGER DEFAULT 0,
    youtube_synthetic_content INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      process.exit(1);
    }
    
    console.log('✓ New table created');
    
    // Copy data from old table to new table
    db.run(`INSERT INTO streams_new 
            SELECT id, title, video_id, rtmp_url, stream_key, platform, platform_icon,
                   loop_video, schedule_time, duration, status, status_updated_at,
                   start_time, end_time, created_at, updated_at, user_id,
                   youtube_broadcast_id, active_schedule_id, youtube_description,
                   youtube_privacy, youtube_made_for_kids, youtube_auto_start,
                   use_youtube_api, youtube_auto_end, manual_stop,
                   youtube_age_restricted, youtube_synthetic_content
            FROM streams`, (err2) => {
      if (err2) {
        console.error('Error copying data:', err2);
        process.exit(1);
      }
      
      console.log('✓ Data copied to new table');
      
      // Drop old table
      db.run('DROP TABLE streams', (err3) => {
        if (err3) {
          console.error('Error dropping old table:', err3);
          process.exit(1);
        }
        
        console.log('✓ Old table dropped');
        
        // Rename new table
        db.run('ALTER TABLE streams_new RENAME TO streams', (err4) => {
          if (err4) {
            console.error('Error renaming table:', err4);
            process.exit(1);
          }
          
          console.log('✓ Table renamed');
          console.log('');
          console.log('=== CLEANUP COMPLETE ===\n');
          console.log('✅ Removed fields:');
          console.log('  - bitrate');
          console.log('  - fps');
          console.log('  - resolution');
          console.log('  - orientation');
          console.log('  - use_advanced_settings');
          console.log('');
          console.log('✅ Database schema is now clean and matches frontend form!');
          console.log('');
          console.log(`Backup saved at: ${backupPath}`);
          
          db.close();
          process.exit(0);
        });
      });
    });
  });
});
