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
    console.log('✅ Connected to streambro.db');
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
    youtube_broadcast_id TEXT,
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
  
  // Add youtube_broadcast_id column if it doesn't exist (migration)
  db.run(`ALTER TABLE streams ADD COLUMN youtube_broadcast_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_broadcast_id column:', err.message);
    }
  });
  
  // Add YouTube API fields (migration)
  db.run(`ALTER TABLE streams ADD COLUMN use_youtube_api BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding use_youtube_api column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_description TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_description column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_privacy TEXT DEFAULT 'unlisted'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_privacy column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_made_for_kids BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_made_for_kids column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_age_restricted BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_age_restricted column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_auto_start BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_auto_start column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_auto_end BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_auto_end column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE streams ADD COLUMN youtube_synthetic_content BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_synthetic_content column:', err.message);
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

  // Table for YouTube broadcasts (link broadcast with video and stream)
  db.run(`CREATE TABLE IF NOT EXISTS youtube_broadcasts (
    id TEXT PRIMARY KEY,
    broadcast_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    video_id TEXT,
    stream_id TEXT,
    title TEXT,
    description TEXT,
    scheduled_start_time TIMESTAMP,
    stream_key TEXT,
    rtmp_url TEXT,
    status TEXT DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (video_id) REFERENCES videos(id),
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE SET NULL
  )`, (err) => {
    if (err) {
      console.error('Error creating youtube_broadcasts table:', err.message);
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

  // Add youtube_broadcast_id column for lazy broadcast creation
  db.run(`ALTER TABLE stream_schedules ADD COLUMN youtube_broadcast_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_broadcast_id column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_broadcast_id column to stream_schedules table');
    }
  });

  // Add broadcast_status column to track broadcast creation status
  db.run(`ALTER TABLE stream_schedules ADD COLUMN broadcast_status TEXT DEFAULT 'pending'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding broadcast_status column:', err.message);
    } else if (!err) {
      console.log('✅ Added broadcast_status column to stream_schedules table');
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

  // Add YouTube API credentials per user
  db.run(`ALTER TABLE users ADD COLUMN youtube_client_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_client_id column:', err.message);
    } else if (!err) {
      console.log('Added youtube_client_id column to users table');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN youtube_client_secret TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_client_secret column:', err.message);
    } else if (!err) {
      console.log('Added youtube_client_secret column to users table');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN youtube_redirect_uri TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_redirect_uri column:', err.message);
    } else if (!err) {
      console.log('Added youtube_redirect_uri column to users table');
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

  // Add active_schedule_id to streams table to track which schedule is currently running
  db.run(`ALTER TABLE streams ADD COLUMN active_schedule_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding active_schedule_id column:', err.message);
    } else if (!err) {
      console.log('Added active_schedule_id column to streams table');
    }
  });

  // Add manual_stop flag to prevent auto-recovery of manually stopped streams
  db.run(`ALTER TABLE streams ADD COLUMN manual_stop INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding manual_stop column:', err.message);
    } else if (!err) {
      console.log('Added manual_stop column to streams table');
    }
  });

  // OAuth states table for callback validation (no session dependency!)
  db.run(`CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating oauth_states table:', err.message);
    }
  });

  // Cleanup old oauth states (older than 1 hour)
  db.run(`DELETE FROM oauth_states WHERE datetime(created_at) < datetime('now', '-1 hour')`, (err) => {
    if (err && !err.message.includes('no such table')) {
      console.error('Error cleaning oauth_states:', err.message);
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
    use_youtube_api BOOLEAN DEFAULT 0,
    youtube_description TEXT,
    youtube_privacy TEXT DEFAULT 'unlisted',
    youtube_made_for_kids BOOLEAN DEFAULT 0,
    youtube_age_restricted BOOLEAN DEFAULT 0,
    youtube_synthetic_content BOOLEAN DEFAULT 0,
    youtube_auto_start BOOLEAN DEFAULT 0,
    youtube_auto_end BOOLEAN DEFAULT 0,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating stream_templates table:', err.message);
    }
  });
  
  // Add YouTube API metadata columns to existing stream_templates table
  db.run(`ALTER TABLE stream_templates ADD COLUMN use_youtube_api BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding use_youtube_api column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_description TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_description column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_privacy TEXT DEFAULT 'unlisted'`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_privacy column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_made_for_kids BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_made_for_kids column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_age_restricted BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_age_restricted column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_synthetic_content BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_synthetic_content column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_auto_start BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_auto_start column:', err.message);
    }
  });
  
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_auto_end BOOLEAN DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding youtube_auto_end column:', err.message);
    }
  });

  // ========================================
  // Gemini AI & YouTube Metadata Migrations
  // ========================================
  
  // Add Gemini API key to users table
  db.run(`ALTER TABLE users ADD COLUMN gemini_api_key TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding gemini_api_key column:', err.message);
    } else if (!err) {
      console.log('✅ Added gemini_api_key column to users table');
    }
  });

  // Add YouTube metadata fields to streams table
  db.run(`ALTER TABLE streams ADD COLUMN youtube_tags TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_tags column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_tags column to streams table');
    }
  });

  db.run(`ALTER TABLE streams ADD COLUMN youtube_category_id TEXT DEFAULT '22'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_category_id column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_category_id column to streams table');
    }
  });

  db.run(`ALTER TABLE streams ADD COLUMN youtube_language TEXT DEFAULT 'en'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_language column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_language column to streams table');
    }
  });

  db.run(`ALTER TABLE streams ADD COLUMN youtube_enable_dvr BOOLEAN DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_enable_dvr column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_enable_dvr column to streams table');
    }
  });

  db.run(`ALTER TABLE streams ADD COLUMN youtube_enable_embed BOOLEAN DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_enable_embed column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_enable_embed column to streams table');
    }
  });

  db.run(`ALTER TABLE streams ADD COLUMN youtube_record_from_start BOOLEAN DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_record_from_start column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_record_from_start column to streams table');
    }
  });

  db.run(`ALTER TABLE streams ADD COLUMN youtube_latency_preference TEXT DEFAULT 'normal'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_latency_preference column:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_latency_preference column to streams table');
    }
  });

  // Add same fields to stream_templates table
  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_tags TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_tags column to templates:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_tags column to stream_templates table');
    }
  });

  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_category_id TEXT DEFAULT '22'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_category_id column to templates:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_category_id column to stream_templates table');
    }
  });

  db.run(`ALTER TABLE stream_templates ADD COLUMN youtube_language TEXT DEFAULT 'en'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youtube_language column to templates:', err.message);
    } else if (!err) {
      console.log('✅ Added youtube_language column to stream_templates table');
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