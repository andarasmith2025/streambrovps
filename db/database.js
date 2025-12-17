const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'streambro.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    createTables();
  }
});
function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_path TEXT,
    gdrive_api_key TEXT,
    user_role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filepath TEXT NOT NULL,
    thumbnail_path TEXT,
    file_size INTEGER,
    duration REAL,
    format TEXT,
    resolution TEXT,
    bitrate INTEGER,
    fps TEXT,
    user_id TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating videos table:', err.message);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS streams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    video_id TEXT,
    rtmp_url TEXT NOT NULL,
    stream_key TEXT NOT NULL,
    platform TEXT,
    platform_icon TEXT,
    bitrate INTEGER DEFAULT 2500,
    resolution TEXT,
    fps INTEGER DEFAULT 30,
    orientation TEXT DEFAULT 'horizontal',
    loop_video BOOLEAN DEFAULT 1,
    schedule_time TIMESTAMP,
    duration INTEGER,
    status TEXT DEFAULT 'offline',
    status_updated_at TIMESTAMP,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    use_advanced_settings BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating streams table:', err.message);
    }
  });
  db.run(`CREATE TABLE IF NOT EXISTS stream_history (
    id TEXT PRIMARY KEY,
    stream_id TEXT,
    title TEXT NOT NULL,
    platform TEXT,
    platform_icon TEXT,
    video_id TEXT,
    video_title TEXT,
    resolution TEXT,
    bitrate INTEGER,
    fps INTEGER,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    use_advanced_settings BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (stream_id) REFERENCES streams(id),
    FOREIGN KEY (video_id) REFERENCES videos(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating stream_history table:', err.message);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_shuffle BOOLEAN DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating playlists table:', err.message);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS playlist_videos (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating playlist_videos table:', err.message);
    }
  });

  // Store YouTube OAuth tokens per user
  db.run(`CREATE TABLE IF NOT EXISTS youtube_tokens (
    user_id TEXT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    expiry_date INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating youtube_tokens table:', err.message);
    }
  });

  // Table for multiple stream schedules
  db.run(`CREATE TABLE IF NOT EXISTS stream_schedules (
    id TEXT PRIMARY KEY,
    stream_id TEXT NOT NULL,
    schedule_time TIMESTAMP NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    is_recurring BOOLEAN DEFAULT 0,
    recurring_days TEXT,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating stream_schedules table:', err.message);
    }
  });

  // Add is_recurring column if not exists
  db.run(`ALTER TABLE stream_schedules ADD COLUMN is_recurring BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding is_recurring column:', err.message);
    }
  });

  // Add recurring_days column if not exists
  db.run(`ALTER TABLE stream_schedules ADD COLUMN recurring_days TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding recurring_days column:', err.message);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN user_role TEXT DEFAULT 'admin'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding user_role column:', err.message);
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding status column:', err.message);
    }
  });

  // Add max_concurrent_streams column for per-user stream limiting
  db.run(`ALTER TABLE users ADD COLUMN max_concurrent_streams INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding max_concurrent_streams column:', err.message);
    } else if (!err) {
      console.log('Added max_concurrent_streams column to users table (default: 1 stream)');
    }
  });

  // Add max_storage_gb column for per-user storage limiting
  db.run(`ALTER TABLE users ADD COLUMN max_storage_gb REAL DEFAULT 3.0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding max_storage_gb column:', err.message);
    } else if (!err) {
      console.log('Added max_storage_gb column to users table (default: 3GB)');
    }
  });

  // Add recurring columns to stream_schedules
  db.run(`ALTER TABLE stream_schedules ADD COLUMN is_recurring BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding is_recurring column:', err.message);
    }
  });

  db.run(`ALTER TABLE stream_schedules ADD COLUMN recurring_days TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding recurring_days column:', err.message);
    }
  });

  // Add user_timezone column for timezone-aware scheduling
  db.run(`ALTER TABLE stream_schedules ADD COLUMN user_timezone TEXT DEFAULT 'Asia/Jakarta'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding user_timezone column:', err.message);
    } else if (!err) {
      console.log('Added user_timezone column to stream_schedules table');
    }
  });

  // Stream Templates table for saving/loading configurations
  db.run(`CREATE TABLE IF NOT EXISTS stream_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    video_id TEXT,
    video_name TEXT,
    stream_title TEXT,
    rtmp_url TEXT,
    stream_key TEXT,
    platform TEXT,
    loop_video BOOLEAN DEFAULT 1,
    schedules TEXT,
    use_advanced_settings BOOLEAN DEFAULT 0,
    advanced_settings TEXT,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating stream_templates table:', err.message);
    }
  });
}
function checkIfUsersExist() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users', [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result.count > 0);
    });
  });
}
module.exports = {
  db,
  checkIfUsersExist
};