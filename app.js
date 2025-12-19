const pathLib = require('path');
require('dotenv').config({ path: pathLib.join(__dirname, '.env'), debug: true });
// Optional secondary env file for OAuth secrets
require('dotenv').config({ path: pathLib.join(__dirname, '.env.google'), override: false });
require('./services/logger.js');
const express = require('express');
const path = require('path');
const engine = require('ejs-mate');
const os = require('os');
const multer = require('multer');
const fs = require('fs');
const csrf = require('csrf');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('./models/User');
const { db, checkIfUsersExist } = require('./db/database');
const systemMonitor = require('./services/systemMonitor');
const { uploadVideo, upload } = require('./middleware/uploadMiddleware');
const { ensureDirectories } = require('./utils/storage');
const { getVideoInfo, generateThumbnail } = require('./utils/videoProcessor');
const Video = require('./models/Video');
const Playlist = require('./models/Playlist');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

// Set FFmpeg and FFprobe paths globally BEFORE loading other modules
const ffmpegPath = ffmpegInstaller.path;
const ffprobePath = ffprobeInstaller.path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const streamingService = require('./services/streamingService');
const schedulerService = require('./services/schedulerService');
const { getYouTubeClient } = require('./config/google');
const GracefulShutdown = require('./utils/GracefulShutdown');

// Helper function to parse schedule time
function parseScheduleTime(scheduleTimeStr) {
  if (!scheduleTimeStr) {
    throw new Error('schedule_time is required');
  }
  
  // Check if it's time-only format (HH:MM or HH:MM:SS)
  if (scheduleTimeStr.includes(':') && !scheduleTimeStr.includes('T') && !scheduleTimeStr.includes('-')) {
    // Time only format - create datetime for today in local timezone
    const today = new Date();
    const timeParts = scheduleTimeStr.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time format: ${scheduleTimeStr}`);
    }
    
    today.setHours(hours, minutes, 0, 0);
    
    // Return in local timezone format (YYYY-MM-DDTHH:MM:SS)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const hour = String(today.getHours()).padStart(2, '0');
    const minute = String(today.getMinutes()).padStart(2, '0');
    const second = String(today.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  } else {
    // Full datetime format - keep as is (already in local timezone from frontend)
    // Just validate it's a valid date
    const parsedDate = new Date(scheduleTimeStr);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid datetime format: ${scheduleTimeStr}`);
    }
    
    // Return the original string (local timezone format)
    // Remove any timezone info if present
    return scheduleTimeStr.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('-----------------------------------');
  console.error('UNHANDLED REJECTION AT:', promise);
  console.error('REASON:', reason);
  console.error('-----------------------------------');
});
process.on('uncaughtException', (error) => {
  console.error('-----------------------------------');
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('-----------------------------------');
});
const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT || 7575;

// Increase timeout for large file uploads (30 minutes)
const uploadTimeout = 30 * 60 * 1000;

// Startup sanity log for OAuth envs (safe: only lengths)
try {
  const cidLen = (process.env.GOOGLE_CLIENT_ID || '').length;
  const redir = process.env.GOOGLE_REDIRECT_URI;
  console.log(`[Startup] OAuth env: client_id length=${cidLen}, redirect_uri=${redir || 'undefined'}`);
} catch { }

// Fallback loader: manually parse GOOGLE_* lines if missing after dotenv
try {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    const candidates = [pathLib.join(__dirname, '.env'), pathLib.join(__dirname, '.env.google')];
    for (const envPath of candidates) {
      if (!fs.existsSync(envPath)) continue;
      let raw = fs.readFileSync(envPath, 'utf8');
      // strip BOM/zero-width
      raw = raw.replace(/\uFEFF/g, '');
      const parsed = {};
      raw.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*(GOOGLE_[A-Z_]+)\s*=\s*(.*)\s*$/);
        if (m) {
          const key = m[1];
          let val = m[2];
          // strip surrounding quotes if present
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
            val = val.slice(1, -1);
          }
          // remove stray CR characters
          val = val.replace(/\r/g, '').trim();
          if (!process.env[key] && val) process.env[key] = val;
          parsed[key] = val;
        }
      });
      const cidLen2 = (process.env.GOOGLE_CLIENT_ID || '').length;
      const redir2 = process.env.GOOGLE_REDIRECT_URI;
      console.log(`[Startup] Fallback parsed ${envPath}. keys=${Object.keys(parsed).join(', ') || 'none'}; client_id length=${cidLen2}, redirect_uri=${redir2 || 'undefined'}`);
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI) break;
    }
  }
} catch (e) {
  console.warn('[Startup] Fallback .env parser error:', e?.message);
}
const tokens = new csrf();
ensureDirectories();
ensureDirectories();
app.locals.helpers = {
  getUsername: function (req) {
    if (req.session && req.session.username) {
      return req.session.username;
    }
    return 'User';
  },
  getAvatar: function (req) {
    if (req.session && req.session.userId) {
      const avatarPath = req.session.avatar_path;
      if (avatarPath) {
        return `<img src="${avatarPath}" alt="${req.session.username || 'User'}'s Profile" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='/images/default-avatar.svg';">`;
      }
    }
    return '<img src="/images/default-avatar.svg" alt="Default Profile" class="w-full h-full object-cover">';
  },
  getPlatformIcon: function (platform) {
    switch (platform) {
      case 'YouTube': return 'youtube';
      case 'Facebook': return 'facebook';
      case 'Twitch': return 'twitch';
      case 'TikTok': return 'tiktok';
      case 'Instagram': return 'instagram';
      case 'Shopee Live': return 'shopping-bag';
      case 'Restream.io': return 'live-photo';
      default: return 'broadcast';
    }
  },
  getPlatformColor: function (platform) {
    switch (platform) {
      case 'YouTube': return 'red-500';
      case 'Facebook': return 'blue-500';
      case 'Twitch': return 'purple-500';
      case 'TikTok': return 'gray-100';
      case 'Instagram': return 'pink-500';
      case 'Shopee Live': return 'orange-500';
      case 'Restream.io': return 'teal-500';
      default: return 'gray-400';
    }
  },
  formatDateTime: function (isoString) {
    if (!isoString) return '--';

    const utcDate = new Date(isoString);

    return utcDate.toLocaleString('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  },
  formatDuration: function (seconds) {
    if (!seconds) return '--';
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
  }
};
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './db/',
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true, // Always use secure for production HTTPS
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'none' // Required for cross-site OAuth redirects with secure cookies
  }
}));
app.use(async (req, res, next) => {
  console.log('Session check - Path:', req.path, 'SessionID:', req.sessionID, 'UserID:', req.session?.userId);
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.session.username = user.username;
        req.session.avatar_path = user.avatar_path;
        if (user.email) req.session.email = user.email;
        res.locals.user = {
          id: user.id,
          username: user.username,
          avatar_path: user.avatar_path,
          email: user.email,
          user_role: user.user_role
        };
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }
  res.locals.req = req;
  next();
});
app.use(function (req, res, next) {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = uuidv4();
  }
  res.locals.csrfToken = tokens.create(req.session.csrfSecret);
  next();
});
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.use('/uploads', function (req, res, next) {
  res.header('Cache-Control', 'no-cache');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});
app.use(express.urlencoded({ extended: true, limit: '10gb' }));
app.use(express.json({ limit: '10gb' }));

// TEMP: debug env endpoint
app.get('/debug/env', (req, res) => {
  res.json({
    GOOGLE_CLIENT_ID_length: (process.env.GOOGLE_CLIENT_ID || '').length,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || null,
    has_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET)
  });
});

// Resolve req.session.userId from username if missing (helps DB persistence)
app.use((req, res, next) => {
  if (!req.session) return next();
  if (!req.session.userId && req.session.username) {
    db.get('SELECT id FROM users WHERE username = ?', [req.session.username], (err, row) => {
      if (!err && row && row.id) {
        req.session.userId = row.id;
      }
      next();
    });
  } else {
    next();
  }
});

// Load youtube_tokens from DB into session if absent
// Also auto-refresh if expired
app.use(async (req, res, next) => {
  if (!req.session || req.session.youtubeTokens) return next();
  const userId = req.session.userId || req.session.user_id;
  if (!userId) return next();
  
  try {
    // Use getTokensForUser which has auto-refresh logic
    const { getTokensForUser } = require('./routes/youtube');
    const tokens = await getTokensForUser(userId);
    
    if (tokens) {
      req.session.youtubeTokens = tokens;
    }
    next();
  } catch (error) {
    console.error('[Middleware] Failed to load/refresh YouTube tokens:', error.message);
    next();
  }
});

// OAuth routes
const oauthRoutes = require('./routes/oauth');
app.use('/oauth2', oauthRoutes);

// YouTube feature routes
const youtubeRoutes = require('./routes/youtube');
app.use('/youtube', youtubeRoutes);

// YouTube API configuration routes
const youtubeApiRoutes = require('./routes/youtube-api');
app.use('/api/youtube', youtubeApiRoutes);

// YouTube Broadcasts routes (local database)
const youtubeBroadcastsRoutes = require('./routes/youtube-broadcasts');
app.use('/api/youtube-broadcasts', youtubeBroadcastsRoutes);

// Stream Templates routes
const templatesRoutes = require('./routes/templates');
app.use('/api/templates', templatesRoutes);

// Expose session-based flags to views (after session is set up and body parsers)
// Ensure youtubeChannel is populated if tokens exist
app.use(async (req, res, next) => {
  try {
    if (req.session && req.session.youtubeTokens && !req.session.youtubeChannel) {
      try {
        const yt = getYouTubeClient(req.session.youtubeTokens);
        const me = await yt.channels.list({ mine: true, part: ['snippet', 'statistics'] });
        const channel = me?.data?.items?.[0];
        if (channel) {
          req.session.youtubeChannel = {
            id: channel.id,
            title: channel.snippet?.title,
            avatar: channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.high?.url || null,
            subs: channel.statistics?.subscriberCount || null
          };
        }
      } catch (e) {
        // non-fatal; keep tokens so user still connected
        console.warn('[YouTube] Failed to refresh channel info:', e?.message);
      }
    }
  } catch { }
  next();
});

// Make flags available to views
app.use((req, res, next) => {
  try {
    res.locals.youtubeConnected = Boolean(req.session && req.session.youtubeTokens);
    res.locals.youtubeChannel = req.session && req.session.youtubeChannel ? req.session.youtubeChannel : null;
    res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
    if (req.session && req.session.flash) delete req.session.flash;
  } catch { }
  next();
});

const csrfProtection = function (req, res, next) {
  if ((req.path === '/login' && req.method === 'POST') ||
    (req.path === '/setup-account' && req.method === 'POST') ||
    (req.path === '/youtube/schedule-live' && req.method === 'POST') ||
    (req.path && req.path.startsWith('/youtube/'))) {
    return next();
  }
  const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  if (!token || !tokens.verify(req.session.csrfSecret, token)) {
    return res.status(403).render('error', {
      title: 'Error',
      error: 'CSRF validation failed. Please try again.'
    });
  }
  next();
};
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.user_role !== 'admin') {
      return res.redirect('/dashboard');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.redirect('/dashboard');
  }
};

// TEMP: debug users endpoint (admin only)
app.get('/debug/users', isAuthenticated, isAdmin, (req, res) => {
  db.all('SELECT id, username, user_role, status, created_at, youtube_client_id, youtube_client_secret, youtube_redirect_uri FROM users ORDER BY created_at DESC', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.all('SELECT user_id, access_token, refresh_token, expiry_date, created_at, updated_at FROM youtube_tokens', [], (err2, tokens) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }
      
      res.json({
        total_users: users.length,
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          role: u.user_role,
          status: u.status,
          created: u.created_at,
          has_youtube_credentials: !!(u.youtube_client_id && u.youtube_client_secret),
          redirect_uri: u.youtube_redirect_uri
        })),
        total_tokens: tokens.length,
        tokens: tokens.map(t => ({
          user_id: t.user_id,
          has_access_token: !!t.access_token,
          has_refresh_token: !!t.refresh_token,
          expiry_date: t.expiry_date,
          updated: t.updated_at
        }))
      });
    });
  });
});

// TEMP: debug session endpoint
app.get('/debug/session', isAuthenticated, (req, res) => {
  res.json({
    session_id: req.sessionID,
    user_id: req.session.userId,
    username: req.session.username,
    has_youtube_tokens_in_session: !!req.session.youtubeTokens,
    youtube_tokens: req.session.youtubeTokens ? {
      has_access_token: !!req.session.youtubeTokens.access_token,
      has_refresh_token: !!req.session.youtubeTokens.refresh_token,
      expiry_date: req.session.youtubeTokens.expiry_date
    } : null,
    has_youtube_channel_in_session: !!req.session.youtubeChannel,
    youtube_channel: req.session.youtubeChannel,
    res_locals: {
      youtubeConnected: res.locals.youtubeConnected,
      youtubeChannel: res.locals.youtubeChannel
    }
  });
});

app.use('/uploads', function (req, res, next) {
  res.header('Cache-Control', 'no-cache');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});
app.use('/uploads/avatars', (req, res, next) => {
  const file = path.join(__dirname, 'public', 'uploads', 'avatars', path.basename(req.path));
  if (fs.existsSync(file)) {
    const ext = path.extname(file).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    res.header('Content-Type', contentType);
    res.header('Cache-Control', 'max-age=60, must-revalidate');
    fs.createReadStream(file).pipe(res);
  } else {
    next();
  }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('login', {
      title: 'Login',
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  },
  requestWasSuccessful: (request, response) => {
    return response.statusCode < 400;
  }
});
const loginDelayMiddleware = async (req, res, next) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  next();
};
app.get('/login', async (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  try {
    const usersExist = await checkIfUsersExist();
    if (!usersExist) {
      return res.redirect('/setup-account');
    }
    res.render('login', {
      title: 'Login',
      error: null
    });
  } catch (error) {
    console.error('Error checking for users:', error);
    res.render('login', {
      title: 'Login',
      error: 'System error. Please try again.'
    });
  }
});
app.post('/login', loginDelayMiddleware, loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findByUsername(username);
    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }
    const passwordMatch = await User.verifyPassword(password, user.password);
    if (!passwordMatch) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    if (user.status !== 'active') {
      return res.render('login', {
        title: 'Login',
        error: 'Your account is not active. Please contact administrator for activation.'
      });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.avatar_path = user.avatar_path;
    req.session.user_role = user.user_role;
    
    // Save session explicitly before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('login', {
          title: 'Login',
          error: 'Session error. Please try again.'
        });
      }
      console.log('Login successful for user:', user.username);
      console.log('Session ID:', req.sessionID);
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Login',
      error: 'An error occurred during login. Please try again.'
    });
  }
});
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/signup', async (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  try {
    const usersExist = await checkIfUsersExist();
    if (!usersExist) {
      return res.redirect('/setup-account');
    }
    res.render('signup', {
      title: 'Sign Up',
      error: null,
      success: null
    });
  } catch (error) {
    console.error('Error loading signup page:', error);
    res.render('signup', {
      title: 'Sign Up',
      error: 'System error. Please try again.',
      success: null
    });
  }
});

app.post('/signup', upload.single('avatar'), async (req, res) => {
  const { username, password, confirmPassword, user_role, status } = req.body;

  try {
    if (!username || !password) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Username and password are required',
        success: null
      });
    }

    if (password !== confirmPassword) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Passwords do not match',
        success: null
      });
    }

    if (password.length < 6) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Password must be at least 6 characters long',
        success: null
      });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Username already exists',
        success: null
      });
    }

    let avatarPath = null;
    if (req.file) {
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    // Auto-activate member accounts, admin accounts need approval
    const finalRole = user_role || 'member';
    const finalStatus = finalRole === 'member' ? 'active' : (status || 'inactive');
    
    const newUser = await User.create({
      username,
      password,
      avatar_path: avatarPath,
      user_role: finalRole,
      status: finalStatus
    });

    if (newUser) {
      const successMessage = finalRole === 'member' 
        ? 'Account created successfully! You can now login.'
        : 'Account created successfully! Please wait for admin approval to activate your account.';
      
      return res.render('signup', {
        title: 'Sign Up',
        error: null,
        success: successMessage
      });
    } else {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Failed to create account. Please try again.',
        success: null
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    return res.render('signup', {
      title: 'Sign Up',
      error: 'An error occurred during registration. Please try again.',
      success: null
    });
  }
});

app.get('/setup-account', async (req, res) => {
  try {
    const usersExist = await checkIfUsersExist();
    if (usersExist && !req.session.userId) {
      return res.redirect('/login');
    }
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.username) {
        return res.redirect('/dashboard');
      }
    }
    res.render('setup-account', {
      title: 'Complete Your Account',
      user: req.session.userId ? await User.findById(req.session.userId) : {},
      error: null
    });
  } catch (error) {
    console.error('Setup account error:', error);
    res.redirect('/login');
  }
});
app.post('/setup-account', upload.single('avatar'), [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.render('setup-account', {
        title: 'Complete Your Account',
        user: { username: req.body.username || '' },
        error: errors.array()[0].msg
      });
    }
    const existingUsername = await User.findByUsername(req.body.username);
    if (existingUsername) {
      return res.render('setup-account', {
        title: 'Complete Your Account',
        user: { email: req.body.email || '' },
        error: 'Username is already taken'
      });
    }
    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
    const usersExist = await checkIfUsersExist();
    if (!usersExist) {
      try {
        const user = await User.create({
          username: req.body.username,
          password: req.body.password,
          avatar_path: avatarPath,
          user_role: 'admin',
          status: 'active'
        });
        req.session.userId = user.id;
        req.session.username = req.body.username;
        req.session.user_role = user.user_role;
        if (avatarPath) {
          req.session.avatar_path = avatarPath;
        }
        console.log('Setup account - Using user ID from database:', user.id);
        console.log('Setup account - Session userId set to:', req.session.userId);
        return res.redirect('/dashboard');
      } catch (error) {
        console.error('User creation error:', error);
        return res.render('setup-account', {
          title: 'Complete Your Account',
          user: {},
          error: 'Failed to create user. Please try again.'
        });
      }
    } else {
      await User.update(req.session.userId, {
        username: req.body.username,
        password: req.body.password,
        avatar_path: avatarPath,
      });
      req.session.username = req.body.username;
      if (avatarPath) {
        req.session.avatar_path = avatarPath;
      }
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Account setup error:', error);
    res.render('setup-account', {
      title: 'Complete Your Account',
      user: { email: req.body.email || '' },
      error: 'An error occurred. Please try again.'
    });
  }
});
app.get('/', (req, res) => {
  // Redirect to login if not authenticated, otherwise to dashboard
  if (req.session && req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});
app.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('dashboard', {
      title: 'Dashboard',
      active: 'dashboard',
      user: user
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/login');
  }
});
app.get('/gallery', isAuthenticated, async (req, res) => {
  try {
    const videos = await Video.findAll(req.session.userId);
    res.render('gallery', {
      title: 'Video Gallery',
      active: 'gallery',
      user: await User.findById(req.session.userId),
      videos: videos
    });
  } catch (error) {
    console.error('Gallery error:', error);
    res.redirect('/dashboard');
  }
});

app.get('/settings', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: user
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.redirect('/login');
  }
});
app.get('/history', isAuthenticated, async (req, res) => {
  try {
    res.render('history', {
      active: 'history',
      title: 'Stream History',
      helpers: app.locals.helpers
    });
  } catch (error) {
    console.error('Error rendering history page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load stream history',
      error: error
    });
  }
});

// API endpoint to get history with pagination
app.get('/api/history', isAuthenticated, async (req, res) => {
  try {
    const db = require('./db/database').db;
    const limit = parseInt(req.query.limit) || 1000;
    
    // Auto-cleanup: Keep only last 1000 records per user
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM stream_history 
         WHERE id NOT IN (
           SELECT id FROM stream_history 
           WHERE user_id = ? 
           ORDER BY start_time DESC 
           LIMIT 1000
         ) AND user_id = ?`,
        [req.session.userId, req.session.userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // Get history
    const history = await new Promise((resolve, reject) => {
      db.all(
        `SELECT h.*, v.thumbnail_path 
         FROM stream_history h 
         LEFT JOIN videos v ON h.video_id = v.id 
         WHERE h.user_id = ? 
         ORDER BY h.start_time DESC 
         LIMIT ?`,
        [req.session.userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    res.json({ success: true, history: history || [] });
  } catch (error) {
    console.error('Error fetching stream history:', error);
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});
app.delete('/api/history/:id', isAuthenticated, async (req, res) => {
  try {
    const db = require('./db/database').db;
    const historyId = req.params.id;
    const history = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM stream_history WHERE id = ? AND user_id = ?',
        [historyId, req.session.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'History entry not found or not authorized'
      });
    }
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM stream_history WHERE id = ?',
        [historyId],
        function (err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    res.json({ success: true, message: 'History entry deleted' });
  } catch (error) {
    console.error('Error deleting history entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete history entry'
    });
  }
});

// Bulk delete history entries
app.post('/api/history/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    const db = require('./db/database').db;
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No IDs provided'
      });
    }
    
    // Delete only entries that belong to the user
    const placeholders = ids.map(() => '?').join(',');
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM stream_history WHERE id IN (${placeholders}) AND user_id = ?`,
        [...ids, req.session.userId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    res.json({ success: true, message: `${ids.length} history entries deleted` });
  } catch (error) {
    console.error('Error bulk deleting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete history entries'
    });
  }
});

app.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();

    const usersWithStats = await Promise.all(users.map(async (user) => {
      const videoStats = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as totalSize 
           FROM videos WHERE user_id = ?`,
          [user.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      const streamStats = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM streams WHERE user_id = ?`,
          [user.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      const activeStreamStats = await new Promise((resolve, reject) => {
        db.get(
          `SELECT COUNT(*) as count FROM streams WHERE user_id = ? AND status = 'live'`,
          [user.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      return {
        ...user,
        videoCount: videoStats.count,
        totalVideoSize: videoStats.totalSize > 0 ? formatFileSize(videoStats.totalSize) : null,
        streamCount: streamStats.count,
        activeStreamCount: activeStreamStats.count
      };
    }));

    res.render('users', {
      title: 'User Management',
      active: 'users',
      users: usersWithStats,
      user: req.user
    });
  } catch (error) {
    console.error('Users page error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load users page',
      user: req.user
    });
  }
});

app.post('/api/users/status', isAdmin, async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or status'
      });
    }

    if (userId == req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.updateStatus(userId, status);

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

app.post('/api/users/role', isAdmin, async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or role'
      });
    }

    if (userId == req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.updateRole(userId, role);

    res.json({
      success: true,
      message: `User role updated to ${role} successfully`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

app.post('/api/users/stream-limit', isAdmin, async (req, res) => {
  try {
    const { userId, maxStreams } = req.body;

    if (!userId || maxStreams === undefined || maxStreams === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or stream limit'
      });
    }

    const streamLimit = parseInt(maxStreams);
    if (isNaN(streamLimit) || streamLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stream limit must be a positive number'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.updateStreamLimit(userId, streamLimit);

    res.json({
      success: true,
      message: `Stream limit updated to ${streamLimit} for user ${user.username}`
    });
  } catch (error) {
    console.error('Error updating stream limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stream limit'
    });
  }
});

app.post('/api/users/storage-limit', isAdmin, async (req, res) => {
  try {
    const { userId, maxStorageGB } = req.body;

    if (!userId || maxStorageGB === undefined || maxStorageGB === null) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or storage limit'
      });
    }

    const storageLimit = parseFloat(maxStorageGB);
    if (isNaN(storageLimit) || storageLimit < 0) {
      return res.status(400).json({
        success: false,
        message: 'Storage limit must be a positive number'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.updateStorageLimit(userId, storageLimit);

    res.json({
      success: true,
      message: `Storage limit updated to ${storageLimit}GB for user ${user.username}`
    });
  } catch (error) {
    console.error('Error updating storage limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update storage limit'
    });
  }
});

app.get('/api/users/quota', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get active streams count
    const Stream = require('./models/Stream');
    const activeStreams = await Stream.findAll(userId, 'live');
    const activeStreamCount = activeStreams ? activeStreams.length : 0;

    // Get total storage used
    const Video = require('./models/Video');
    const videos = await Video.findAll(userId);
    let totalStorageBytes = 0;
    if (videos && videos.length > 0) {
      totalStorageBytes = videos.reduce((sum, video) => sum + (video.file_size || 0), 0);
    }
    const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024);

    res.json({
      success: true,
      quota: {
        streams: {
          used: activeStreamCount,
          limit: user.max_concurrent_streams || 1,
          percentage: Math.round((activeStreamCount / (user.max_concurrent_streams || 1)) * 100)
        },
        storage: {
          used: totalStorageGB,
          limit: user.max_storage_gb || 3,
          percentage: Math.round((totalStorageGB / (user.max_storage_gb || 3)) * 100)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quota'
    });
  }
});

app.post('/api/users/delete', isAdmin, async (req, res) => {
  try {
    const { userId} = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (userId == req.session.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.delete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

app.post('/api/users/update', isAdmin, upload.single('avatar'), async (req, res) => {
  try {
    const { userId, username, role, status, password } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let avatarPath = user.avatar_path;
    if (req.file) {
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    const updateData = {
      username: username || user.username,
      user_role: role || user.user_role,
      status: status || user.status,
      avatar_path: avatarPath
    };

    if (password && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      updateData.password = await bcrypt.hash(password, 10);
    }

    await User.updateProfile(userId, updateData);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

app.post('/api/users/create', isAdmin, upload.single('avatar'), async (req, res) => {
  try {
    const { username, role, status, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    let avatarPath = '/uploads/avatars/default-avatar.svg';
    if (req.file) {
      avatarPath = `/uploads/avatars/${req.file.filename}`;
    }

    const userData = {
      username: username,
      password: password,
      user_role: role || 'user',
      status: status || 'active',
      avatar_path: avatarPath
    };

    const result = await User.create(userData);

    res.json({
      success: true,
      message: 'User created successfully',
      userId: result.id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

app.get('/api/users/:id/videos', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const videos = await Video.findAll(userId);
    res.json({ success: true, videos });
  } catch (error) {
    console.error('Get user videos error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user videos' });
  }
});

app.get('/api/users/:id/streams', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const streams = await Stream.findAll(userId);
    res.json({ success: true, streams });
  } catch (error) {
    console.error('Get user streams error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user streams' });
  }
});

app.get('/api/system-stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await systemMonitor.getSystemStats();
    
    // Add stream capacity calculation
    const { getStreamCapacityInfo } = require('./utils/streamCapacityCalculator');
    const capacityInfo = getStreamCapacityInfo(stats);
    
    res.json({
      ...stats,
      capacity: capacityInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });
  return addresses.length > 0 ? addresses : ['localhost'];
}
app.post('/settings/profile', isAuthenticated, upload.single('avatar'), [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('settings', {
        title: 'Settings',
        active: 'settings',
        user: await User.findById(req.session.userId),
        error: errors.array()[0].msg,
        activeTab: 'profile'
      });
    }
    const currentUser = await User.findById(req.session.userId);
    if (req.body.username !== currentUser.username) {
      const existingUser = await User.findByUsername(req.body.username);
      if (existingUser) {
        return res.render('settings', {
          title: 'Settings',
          active: 'settings',
          user: currentUser,
          error: 'Username is already taken',
          activeTab: 'profile'
        });
      }
    }
    const updateData = {
      username: req.body.username
    };
    if (req.file) {
      updateData.avatar_path = `/uploads/avatars/${req.file.filename}`;
    }
    await User.update(req.session.userId, updateData);
    req.session.username = updateData.username;
    if (updateData.avatar_path) {
      req.session.avatar_path = updateData.avatar_path;
    }
    return res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: await User.findById(req.session.userId),
      success: 'Profile updated successfully!',
      activeTab: 'profile'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: await User.findById(req.session.userId),
      error: 'An error occurred while updating your profile',
      activeTab: 'profile'
    });
  }
});
app.post('/settings/password', isAuthenticated, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('settings', {
        title: 'Settings',
        active: 'settings',
        user: await User.findById(req.session.userId),
        error: errors.array()[0].msg,
        activeTab: 'security'
      });
    }
    const user = await User.findById(req.session.userId);
    const passwordMatch = await User.verifyPassword(req.body.currentPassword, user.password);
    if (!passwordMatch) {
      return res.render('settings', {
        title: 'Settings',
        active: 'settings',
        user: user,
        error: 'Current password is incorrect',
        activeTab: 'security'
      });
    }
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    await User.update(req.session.userId, { password: hashedPassword });
    return res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: await User.findById(req.session.userId),
      success: 'Password changed successfully',
      activeTab: 'security'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: await User.findById(req.session.userId),
      error: 'An error occurred while changing your password',
      activeTab: 'security'
    });
  }
});
app.get('/settings', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: user
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.redirect('/dashboard');
  }
});
app.post('/settings/integrations/gdrive', isAuthenticated, [
  body('apiKey').notEmpty().withMessage('API Key is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('settings', {
        title: 'Settings',
        active: 'settings',
        user: await User.findById(req.session.userId),
        error: errors.array()[0].msg,
        activeTab: 'integrations'
      });
    }
    await User.update(req.session.userId, {
      gdrive_api_key: req.body.apiKey
    });
    return res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: await User.findById(req.session.userId),
      success: 'Google Drive API key saved successfully!',
      activeTab: 'integrations'
    });
  } catch (error) {
    console.error('Error saving Google Drive API key:', error);
    res.render('settings', {
      title: 'Settings',
      active: 'settings',
      user: await User.findById(req.session.userId),
      error: 'An error occurred while saving your Google Drive API key',
      activeTab: 'integrations'
    });
  }
});
app.post('/upload/video', isAuthenticated, uploadVideo.single('video'), async (req, res) => {
  try {
    console.log('Upload request received:', req.file);
    console.log('Session userId for upload:', req.session.userId);

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Check storage limit
    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    if (user) {
      // Get current storage usage
      const videos = await Video.findAll(userId);
      let totalStorageBytes = 0;
      if (videos && videos.length > 0) {
        totalStorageBytes = videos.reduce((sum, video) => sum + (video.file_size || 0), 0);
      }
      
      const newFileSize = req.file.size;
      const totalAfterUpload = totalStorageBytes + newFileSize;
      const maxStorageBytes = (user.max_storage_gb || 3) * 1024 * 1024 * 1024;
      
      if (totalAfterUpload > maxStorageBytes) {
        // Delete the uploaded file since we're rejecting it
        const uploadedFilePath = req.file.path;
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        
        const currentGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2);
        const maxGB = user.max_storage_gb || 3;
        const newFileGB = (newFileSize / (1024 * 1024 * 1024)).toFixed(2);
        
        return res.status(413).json({
          error: `Storage limit exceeded. You have used ${currentGB}/${maxGB} GB. This file (${newFileGB} GB) would exceed your limit. Please delete some videos to free up space.`
        });
      }
    }
    const { filename, originalname, path: videoPath, mimetype, size } = req.file;
    const thumbnailName = path.basename(filename, path.extname(filename)) + '.jpg';
    const videoInfo = await getVideoInfo(videoPath);
    const thumbnailRelativePath = await generateThumbnail(videoPath, thumbnailName)
      .then(() => `/uploads/thumbnails/${thumbnailName}`)
      .catch(() => null);
    
    // Analyze video quality and streaming compatibility
    const { analyzeVideo } = require('./utils/videoAnalyzer');
    const analysis = await analyzeVideo(videoPath);
    let format = 'unknown';
    if (mimetype === 'video/mp4') format = 'mp4';
    else if (mimetype === 'video/avi') format = 'avi';
    else if (mimetype === 'video/quicktime') format = 'mov';
    const videoData = {
      title: path.basename(originalname, path.extname(originalname)),
      original_filename: originalname,
      filepath: `/uploads/videos/${filename}`,
      thumbnail_path: thumbnailRelativePath,
      file_size: size,
      duration: videoInfo.duration,
      format: format,
      user_id: req.session.userId
    };
    const video = await Video.create(videoData);
    res.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        filepath: video.filepath,
        thumbnail_path: video.thumbnail_path,
        duration: video.duration,
        file_size: video.file_size,
        format: video.format
      },
      analysis: analysis.success ? {
        quality: analysis.video,
        compatibility: analysis.compatibility,
        issues: analysis.issues,
        warnings: analysis.warnings,
        recommendations: analysis.recommendations
      } : null
    });
  } catch (error) {
    console.error('Upload error details:', error);
    res.status(500).json({
      error: 'Failed to upload video',
      details: error.message
    });
  }
});
app.post('/api/videos/upload', isAuthenticated, (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File too large. Maximum size is 10GB.'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field.'
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    // Check storage limit
    const userId = req.session.userId;
    const user = await User.findById(userId);
    
    if (user) {
      // Get current storage usage
      const videos = await Video.findAll(userId);
      let totalStorageBytes = 0;
      if (videos && videos.length > 0) {
        totalStorageBytes = videos.reduce((sum, video) => sum + (video.file_size || 0), 0);
      }
      
      const newFileSize = req.file.size;
      const totalAfterUpload = totalStorageBytes + newFileSize;
      const maxStorageBytes = (user.max_storage_gb || 3) * 1024 * 1024 * 1024;
      
      if (totalAfterUpload > maxStorageBytes) {
        // Delete the uploaded file since we're rejecting it
        const uploadedFilePath = path.join(__dirname, 'public', 'uploads', 'videos', req.file.filename);
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        
        const currentGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2);
        const maxGB = user.max_storage_gb || 3;
        const newFileGB = (newFileSize / (1024 * 1024 * 1024)).toFixed(2);
        
        return res.status(413).json({
          success: false,
          error: `Storage limit exceeded. You have used ${currentGB}/${maxGB} GB. This file (${newFileGB} GB) would exceed your limit. Please delete some videos to free up space.`
        });
      }
    }
    let title = path.parse(req.file.originalname).name;
    const filePath = `/uploads/videos/${req.file.filename}`;
    const fullFilePath = path.join(__dirname, 'public', filePath);
    const fileSize = req.file.size;
    await new Promise((resolve, reject) => {
      const probe = ffmpeg(fullFilePath).setFfprobePath(ffprobeInstaller.path);
      probe.ffprobe((err, metadata) => {
        if (err) {
          console.error('Error extracting metadata:', err);
          return reject(err);
        }
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const duration = metadata.format.duration || 0;
        const format = metadata.format.format_name || '';
        const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : '';
        const bitrate = metadata.format.bit_rate ?
          Math.round(parseInt(metadata.format.bit_rate) / 1000) :
          null;
        let fps = null;
        if (videoStream && videoStream.avg_frame_rate) {
          const fpsRatio = videoStream.avg_frame_rate.split('/');
          if (fpsRatio.length === 2 && parseInt(fpsRatio[1]) !== 0) {
            fps = Math.round((parseInt(fpsRatio[0]) / parseInt(fpsRatio[1]) * 100)) / 100;
          } else {
            fps = parseInt(fpsRatio[0]) || null;
          }
        }
        const thumbnailFilename = `thumb-${path.parse(req.file.filename).name}.jpg`;
        const thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;
        const fullThumbnailPath = path.join(__dirname, 'public', thumbnailPath);
        ffmpeg(fullFilePath)
          .screenshots({
            timestamps: ['10%'],
            filename: thumbnailFilename,
            folder: path.join(__dirname, 'public', 'uploads', 'thumbnails'),
            size: '854x480'
          })
          .on('end', async () => {
            try {
              const videoData = {
                title,
                filepath: filePath,
                thumbnail_path: thumbnailPath,
                file_size: fileSize,
                duration,
                format,
                resolution,
                bitrate,
                fps,
                user_id: req.session.userId
              };
              const video = await Video.create(videoData);
              res.json({
                success: true,
                message: 'Video uploaded successfully',
                video
              });
              resolve();
            } catch (dbError) {
              console.error('Database error:', dbError);
              reject(dbError);
            }
          })
          .on('error', (err) => {
            console.error('Error creating thumbnail:', err);
            reject(err);
          });
      });
    });
  } catch (error) {
    console.error('Upload error details:', error);
    res.status(500).json({
      error: 'Failed to upload video',
      details: error.message
    });
  }
});
app.get('/api/videos', isAuthenticated, async (req, res) => {
  try {
    const videos = await Video.findAll(req.session.userId);
    res.json({ success: true, videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
});
app.delete('/api/videos/:id', isAuthenticated, async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    if (video.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const videoPath = path.join(__dirname, 'public', video.filepath);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    if (video.thumbnail_path) {
      const thumbnailPath = path.join(__dirname, 'public', video.thumbnail_path);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    await Video.delete(videoId, req.session.userId);
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
});
app.post('/api/videos/:id/rename', isAuthenticated, [
  body('title').trim().isLength({ min: 1 }).withMessage('Title cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    if (video.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'You don\'t have permission to rename this video' });
    }
    await Video.update(req.params.id, { title: req.body.title });
    res.json({ success: true, message: 'Video renamed successfully' });
  } catch (error) {
    console.error('Error renaming video:', error);
    res.status(500).json({ error: 'Failed to rename video' });
  }
});
app.get('/stream/:videoId', isAuthenticated, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).send('Video not found');
    }
    if (video.user_id !== req.session.userId) {
      return res.status(403).send('You do not have permission to access this video');
    }
    const videoPath = path.join(__dirname, 'public', video.filepath);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).send('Error streaming video');
  }
});
app.get('/api/settings/gdrive-status', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.json({
      hasApiKey: !!user.gdrive_api_key,
      message: user.gdrive_api_key ? 'Google Drive API key is configured' : 'No Google Drive API key found'
    });
  } catch (error) {
    console.error('Error checking Google Drive API status:', error);
    res.status(500).json({ error: 'Failed to check API key status' });
  }
});
app.post('/api/settings/gdrive-api-key', isAuthenticated, [
  body('apiKey').notEmpty().withMessage('API Key is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }
    await User.update(req.session.userId, {
      gdrive_api_key: req.body.apiKey
    });
    return res.json({
      success: true,
      message: 'Google Drive API key saved successfully!'
    });
  } catch (error) {
    console.error('Error saving Google Drive API key:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while saving your Google Drive API key'
    });
  }
});
app.post('/api/videos/import-drive', isAuthenticated, [
  body('driveUrl').notEmpty().withMessage('Google Drive URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }
    const { driveUrl } = req.body;
    const { extractFileId, downloadFile } = require('./utils/googleDriveService');
    try {
      const fileId = extractFileId(driveUrl);
      const jobId = uuidv4();
      processGoogleDriveImport(jobId, fileId, req.session.userId)
        .catch(err => console.error('Drive import failed:', err));
      return res.json({
        success: true,
        message: 'Video import started',
        jobId: jobId
      });
    } catch (error) {
      console.error('Google Drive URL parsing error:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid Google Drive URL format'
      });
    }
  } catch (error) {
    console.error('Error importing from Google Drive:', error);
    res.status(500).json({ success: false, error: 'Failed to import video' });
  }
});
app.get('/api/videos/import-status/:jobId', isAuthenticated, async (req, res) => {
  const jobId = req.params.jobId;
  if (!importJobs[jobId]) {
    return res.status(404).json({ success: false, error: 'Import job not found' });
  }
  return res.json({
    success: true,
    status: importJobs[jobId]
  });
});
const importJobs = {};
async function processGoogleDriveImport(jobId, fileId, userId) {
  const { downloadFile } = require('./utils/googleDriveService');
  const { getVideoInfo, generateThumbnail } = require('./utils/videoProcessor');
  const ffmpeg = require('fluent-ffmpeg');

  importJobs[jobId] = {
    status: 'downloading',
    progress: 0,
    message: 'Starting download...'
  };

  try {
    const result = await downloadFile(fileId, (progress) => {
      importJobs[jobId] = {
        status: 'downloading',
        progress: progress.progress,
        message: `Downloading ${progress.filename}: ${progress.progress}%`
      };
    });

    importJobs[jobId] = {
      status: 'processing',
      progress: 100,
      message: 'Processing video...'
    };

    const videoInfo = await getVideoInfo(result.localFilePath);

    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(result.localFilePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });

    let resolution = '';
    let bitrate = null;

    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    if (videoStream) {
      resolution = `${videoStream.width}x${videoStream.height}`;
    }

    if (metadata.format && metadata.format.bit_rate) {
      bitrate = Math.round(parseInt(metadata.format.bit_rate) / 1000);
    }

    const thumbnailName = path.basename(result.filename, path.extname(result.filename)) + '.jpg';
    const thumbnailRelativePath = await generateThumbnail(result.localFilePath, thumbnailName)
      .then(() => `/uploads/thumbnails/${thumbnailName}`)
      .catch(() => null);

    let format = path.extname(result.filename).toLowerCase().replace('.', '');
    if (!format) format = 'mp4';

    const videoData = {
      title: path.basename(result.originalFilename, path.extname(result.originalFilename)),
      filepath: `/uploads/videos/${result.filename}`,
      thumbnail_path: thumbnailRelativePath,
      file_size: result.fileSize,
      duration: videoInfo.duration,
      format: format,
      resolution: resolution,
      bitrate: bitrate,
      user_id: userId
    };

    const video = await Video.create(videoData);

    importJobs[jobId] = {
      status: 'complete',
      progress: 100,
      message: 'Video imported successfully',
      videoId: video.id
    };
    setTimeout(() => {
      delete importJobs[jobId];
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error processing Google Drive import:', error);
    importJobs[jobId] = {
      status: 'failed',
      progress: 0,
      message: error.message || 'Failed to import video'
    };
    setTimeout(() => {
      delete importJobs[jobId];
    }, 5 * 60 * 1000);
  }
}
app.get('/api/stream/videos', isAuthenticated, async (req, res) => {
  try {
    const videos = await Video.findAll(req.session.userId);
    const formattedVideos = videos.map(video => {
      const duration = video.duration ? Math.floor(video.duration) : 0;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      return {
        id: video.id,
        name: video.title,
        thumbnail: video.thumbnail_path,
        resolution: video.resolution || '1280x720',
        duration: formattedDuration,
        url: `/stream/${video.id}`,
        type: 'video'
      };
    });
    res.json(formattedVideos);
  } catch (error) {
    console.error('Error fetching videos for stream:', error);
    res.status(500).json({ error: 'Failed to load videos' });
  }
});

app.get('/api/stream/content', isAuthenticated, async (req, res) => {
  try {
    const videos = await Video.findAll(req.session.userId);
    const formattedVideos = videos.map(video => {
      const duration = video.duration ? Math.floor(video.duration) : 0;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      return {
        id: video.id,
        name: video.title,
        thumbnail: video.thumbnail_path,
        resolution: video.resolution || '1280x720',
        duration: formattedDuration,
        url: `/stream/${video.id}`,
        type: 'video'
      };
    });

    const playlists = await Playlist.findAll(req.session.userId);
    const formattedPlaylists = playlists.map(playlist => {
      return {
        id: playlist.id,
        name: playlist.name,
        thumbnail: '/images/playlist-thumbnail.svg',
        resolution: 'Playlist',
        duration: `${playlist.video_count || 0} videos`,
        url: `/playlist/${playlist.id}`,
        type: 'playlist',
        description: playlist.description,
        is_shuffle: playlist.is_shuffle
      };
    });

    const allContent = [...formattedPlaylists, ...formattedVideos];

    res.json(allContent);
  } catch (error) {
    console.error('Error fetching content for stream:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
});
const Stream = require('./models/Stream');
const { title } = require('process');
app.get('/api/streams', isAuthenticated, async (req, res) => {
  try {
    const filter = req.query.filter;
    const streams = await Stream.findAll(req.session.userId, filter);
    
    // Fetch schedules for each stream
    const StreamSchedule = require('./models/StreamSchedule');
    for (const stream of streams) {
      stream.schedules = await StreamSchedule.findByStreamId(stream.id);
    }
    
    res.json({ success: true, streams });
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch streams' });
  }
});
app.post('/api/streams', isAuthenticated, upload.single('youtubeThumbnail'), [
  body('streamTitle').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('rtmpUrl').trim().isLength({ min: 1 }).withMessage('RTMP URL is required'),
  body('streamKey').trim().isLength({ min: 1 }).withMessage('Stream key is required')
], async (req, res) => {
  try {
    console.log('Session userId for stream creation:', req.session.userId);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }
    // Allow same stream key for multiple streams
    // User can use the same YouTube/Facebook key for different scheduled streams
    // Only one stream can be active at a time with the same key (handled by platform)
    let platform = 'Custom';
    let platform_icon = 'ti-broadcast';
    if (req.body.rtmpUrl.includes('youtube.com')) {
      platform = 'YouTube';
      platform_icon = 'ti-brand-youtube';
    } else if (req.body.rtmpUrl.includes('facebook.com')) {
      platform = 'Facebook';
      platform_icon = 'ti-brand-facebook';
    } else if (req.body.rtmpUrl.includes('twitch.tv')) {
      platform = 'Twitch';
      platform_icon = 'ti-brand-twitch';
    } else if (req.body.rtmpUrl.includes('tiktok.com')) {
      platform = 'TikTok';
      platform_icon = 'ti-brand-tiktok';
    } else if (req.body.rtmpUrl.includes('instagram.com')) {
      platform = 'Instagram';
      platform_icon = 'ti-brand-instagram';
    } else if (req.body.rtmpUrl.includes('shopee.io')) {
      platform = 'Shopee Live';
      platform_icon = 'ti-brand-shopee';
    } else if (req.body.rtmpUrl.includes('restream.io')) {
      platform = 'Restream.io';
      platform_icon = 'ti-live-photo';
    }
    // Check if using YouTube API mode
    const useYouTubeAPI = req.body.useYouTubeAPI === 'true' || req.body.useYouTubeAPI === true;
    
    const streamData = {
      title: req.body.streamTitle,
      video_id: req.body.videoId || null,
      rtmp_url: req.body.rtmpUrl,
      stream_key: req.body.streamKey,
      platform,
      platform_icon,
      bitrate: parseInt(req.body.bitrate) || 2500,
      resolution: req.body.resolution || '1280x720',
      fps: parseInt(req.body.fps) || 30,
      orientation: req.body.orientation || 'horizontal',
      loop_video: req.body.loopVideo === 'true' || req.body.loopVideo === true,
      use_advanced_settings: req.body.useAdvancedSettings === 'true' || req.body.useAdvancedSettings === true,
      use_youtube_api: useYouTubeAPI,
      user_id: req.session.userId
    };
    
    // Add YouTube API specific fields if using YouTube API
    if (useYouTubeAPI) {
      streamData.youtube_description = req.body.youtubeDescription || '';
      streamData.youtube_privacy = req.body.youtubePrivacy || 'unlisted';
      streamData.youtube_made_for_kids = req.body.youtubeMadeForKids === 'true' || req.body.youtubeMadeForKids === true;
      streamData.youtube_age_restricted = req.body.youtubeAgeRestricted === 'true' || req.body.youtubeAgeRestricted === true;
      streamData.youtube_synthetic_content = req.body.youtubeSyntheticContent === 'true' || req.body.youtubeSyntheticContent === true;
      streamData.youtube_auto_start = req.body.youtubeAutoStart === 'true' || req.body.youtubeAutoStart === true;
      streamData.youtube_auto_end = req.body.youtubeAutoEnd === 'true' || req.body.youtubeAutoEnd === true;
    }
    // Handle Stream Now vs Schedule mode
    const streamNow = req.body.streamNow === true || req.body.streamNow === 'true';
    
    // Parse schedules if it's a JSON string (from FormData)
    let schedules = req.body.schedules;
    if (typeof schedules === 'string') {
      try {
        schedules = JSON.parse(schedules);
      } catch (e) {
        console.error('[CREATE STREAM] Error parsing schedules JSON:', e);
        schedules = null;
      }
    }
    const hasSchedules = schedules && Array.isArray(schedules) && schedules.length > 0;
    
    if (streamNow) {
      // Stream Now mode - start immediately
      streamData.status = 'offline'; // Will be started by user clicking "Start"
      streamData.duration = 0; // No duration limit for manual stream
      console.log(`[CREATE STREAM] Stream Now mode - will start manually`);
    } else if (hasSchedules) {
      // Schedule mode
      const firstSchedule = schedules[0];
      streamData.schedule_time = parseScheduleTime(firstSchedule.schedule_time);
      // Calculate total duration from all schedules
      streamData.duration = schedules.reduce((total, sch) => total + parseInt(sch.duration), 0);
      streamData.status = 'scheduled';
    } else {
      streamData.status = 'offline';
    }
    
    const stream = await Stream.create(streamData);
    
    // Create schedule records for scheduled streams
    if (hasSchedules && !streamNow) {
      const StreamSchedule = require('./models/StreamSchedule');
      for (const schedule of schedules) {
        const scheduleData = {
          stream_id: stream.id,
          schedule_time: parseScheduleTime(schedule.schedule_time),
          duration: parseInt(schedule.duration),
          is_recurring: schedule.is_recurring || false,
          recurring_days: schedule.recurring_days || null
        };
        
        await StreamSchedule.create(scheduleData);
        
        if (schedule.is_recurring) {
          console.log(`[CREATE STREAM] Created recurring schedule for stream ${stream.id}: ${schedule.recurring_days}`);
        }
      }
      console.log(`[CREATE STREAM] Created ${schedules.length} schedule(s) for stream ${stream.id}`);
    }
    
    // Create YouTube broadcast if using YouTube API
    if (useYouTubeAPI && platform === 'YouTube') {
      try {
        const youtubeService = require('./services/youtubeService');
        const { getTokensForUser } = require('./routes/youtube');
        
        // Get user's YouTube tokens
        const tokens = await getTokensForUser(req.session.userId);
        
        if (tokens && tokens.access_token) {
          // Determine scheduled start time
          let scheduledStartTime;
          if (hasSchedules && !streamNow) {
            // Use first schedule time - parseScheduleTime returns string, convert to Date first
            const parsedTime = parseScheduleTime(schedules[0].schedule_time);
            scheduledStartTime = new Date(parsedTime).toISOString();
          } else {
            // Stream now - set to current time
            scheduledStartTime = new Date().toISOString();
          }
          
          // Get YouTube stream ID from request body (sent from frontend)
          // Handle both null and string "null" from frontend
          let youtubeStreamId = req.body.youtubeStreamId;
          if (youtubeStreamId === 'null' || youtubeStreamId === 'undefined' || !youtubeStreamId) {
            youtubeStreamId = null;
          }
          
          console.log(`[CREATE STREAM] Creating YouTube broadcast for stream ${stream.id}`);
          console.log(`[CREATE STREAM] - Title: ${req.body.streamTitle}`);
          console.log(`[CREATE STREAM] - Scheduled: ${scheduledStartTime}`);
          console.log(`[CREATE STREAM] - Privacy: ${streamData.youtube_privacy}`);
          console.log(`[CREATE STREAM] - YouTube Stream ID: ${youtubeStreamId || 'NOT PROVIDED - will create new'}`);
          
          // Create broadcast via YouTube API
          const broadcastResult = await youtubeService.scheduleLive(tokens, {
            title: req.body.streamTitle,
            description: streamData.youtube_description || '',
            privacyStatus: streamData.youtube_privacy || 'unlisted',
            scheduledStartTime: scheduledStartTime,
            streamId: youtubeStreamId, // Use YouTube stream ID if provided, otherwise null to create new
            enableAutoStart: streamData.youtube_auto_start || false,
            enableAutoStop: streamData.youtube_auto_end || false
          });
          
          // Update stream with broadcast ID
          if (broadcastResult && broadcastResult.broadcast && broadcastResult.broadcast.id) {
            await Stream.update(stream.id, {
              youtube_broadcast_id: broadcastResult.broadcast.id
            });
            
            console.log(`[CREATE STREAM] ✓ YouTube broadcast created: ${broadcastResult.broadcast.id}`);
            stream.youtube_broadcast_id = broadcastResult.broadcast.id;
            
            // Set audience settings (Made for Kids, Age Restricted)
            if (typeof streamData.youtube_made_for_kids === 'boolean' || streamData.youtube_age_restricted) {
              try {
                await youtubeService.setAudience(tokens, {
                  videoId: broadcastResult.broadcast.id,
                  selfDeclaredMadeForKids: streamData.youtube_made_for_kids,
                  ageRestricted: streamData.youtube_age_restricted
                });
                console.log(`[CREATE STREAM] ✓ Audience settings applied (Made for Kids: ${streamData.youtube_made_for_kids}, Age Restricted: ${streamData.youtube_age_restricted})`);
              } catch (audienceError) {
                console.error('[CREATE STREAM] Error setting audience:', audienceError);
              }
            }
            
            // Upload thumbnail if provided (multer stores file in req.file)
            if (req.file) {
              try {
                console.log(`[CREATE STREAM] Thumbnail file received:`, req.file.filename);
                
                await youtubeService.setThumbnail(tokens, {
                  broadcastId: broadcastResult.broadcast.id,
                  filePath: req.file.path,
                  mimeType: req.file.mimetype
                });
                
                console.log(`[CREATE STREAM] ✓ Thumbnail uploaded to YouTube`);
                
                // Clean up file after upload
                fs.unlinkSync(req.file.path);
              } catch (thumbnailError) {
                console.error('[CREATE STREAM] Error uploading thumbnail:', thumbnailError);
                // Clean up file even on error
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                  fs.unlinkSync(req.file.path);
                }
              }
            }
          }
        } else {
          console.warn(`[CREATE STREAM] YouTube tokens not found for user ${req.session.userId}, broadcast not created`);
        }
      } catch (broadcastError) {
        console.error('[CREATE STREAM] Error creating YouTube broadcast:', broadcastError);
        // Don't fail the stream creation, just log the error
        // User can still stream manually
      }
    }
    
    res.json({ success: true, stream, streamNow });
  } catch (error) {
    console.error('Error creating stream:', error);
    res.status(500).json({ success: false, error: 'Failed to create stream' });
  }
});
app.get('/api/streams/:id', isAuthenticated, async (req, res) => {
  try {
    const stream = await Stream.getStreamWithVideo(req.params.id);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this stream' });
    }
    
    // Include schedules
    const StreamSchedule = require('./models/StreamSchedule');
    stream.schedules = await StreamSchedule.findByStreamId(stream.id);
    
    res.json({ success: true, stream });
  } catch (error) {
    console.error('Error fetching stream:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ success: false, error: 'Failed to fetch stream: ' + error.message });
  }
});

// Get stream schedules
app.get('/api/streams/:id/schedules', isAuthenticated, async (req, res) => {
  try {
    const StreamSchedule = require('./models/StreamSchedule');
    const schedules = await StreamSchedule.findByStreamId(req.params.id);
    res.json({ success: true, schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' });
  }
});

// Delete a specific schedule
app.delete('/api/streams/:id/schedules/:scheduleId', isAuthenticated, async (req, res) => {
  try {
    const StreamSchedule = require('./models/StreamSchedule');
    const stream = await Stream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    
    // Check if user owns this stream
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Delete the schedule
    await StreamSchedule.delete(req.params.scheduleId);
    
    // Check if there are any remaining schedules
    const remainingSchedules = await StreamSchedule.findByStreamId(req.params.id);
    
    // If no schedules left and stream is scheduled, update status to offline
    if (remainingSchedules.length === 0 && stream.status === 'scheduled') {
      await Stream.updateStatus(req.params.id, 'offline');
    }
    
    console.log(`[Schedule] Deleted schedule ${req.params.scheduleId} for stream ${req.params.id}`);
    res.json({ success: true, message: 'Schedule cancelled successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to delete schedule' });
  }
});

app.put('/api/streams/:id', isAuthenticated, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this stream' });
    }
    
    const isYouTubeAPI = stream.use_youtube_api === 1 || stream.use_youtube_api === true;
    
    const updateData = {};
    if (req.body.streamTitle) updateData.title = req.body.streamTitle;
    if (req.body.videoId) updateData.video_id = req.body.videoId;
    
    // Only update RTMP URL and Stream Key if NOT using YouTube API
    // (YouTube API streams have these managed by broadcast)
    if (!isYouTubeAPI) {
      if (req.body.rtmpUrl) updateData.rtmp_url = req.body.rtmpUrl;
      if (req.body.streamKey) updateData.stream_key = req.body.streamKey;
    } else {
      console.log(`[UPDATE STREAM] Preserving RTMP settings for YouTube API stream ${req.params.id}`);
    }
    
    if (req.body.bitrate) updateData.bitrate = parseInt(req.body.bitrate);
    if (req.body.resolution) updateData.resolution = req.body.resolution;
    if (req.body.fps) updateData.fps = parseInt(req.body.fps);
    if (req.body.orientation) updateData.orientation = req.body.orientation;
    if (req.body.loopVideo !== undefined) {
      updateData.loop_video = req.body.loopVideo === 'true' || req.body.loopVideo === true;
    }
    if (req.body.useAdvancedSettings !== undefined) {
      updateData.use_advanced_settings = req.body.useAdvancedSettings === 'true' || req.body.useAdvancedSettings === true;
    }
    
    // Preserve YouTube API settings (don't allow changing these via edit)
    // These are set during stream creation and managed by YouTube broadcast
    // If needed to change, user should delete and recreate the stream
    // Handle multiple schedules
    const schedules = req.body.schedules;
    const hasSchedules = schedules && Array.isArray(schedules) && schedules.length > 0;
    
    if (hasSchedules) {
      // Set first schedule as main schedule for backward compatibility
      const firstSchedule = schedules[0];
      console.log('[UPDATE STREAM] Processing schedule:', JSON.stringify(firstSchedule));
      
      try {
        updateData.schedule_time = parseScheduleTime(firstSchedule.schedule_time);
        console.log('[UPDATE STREAM] Parsed schedule_time:', firstSchedule.schedule_time, '->', updateData.schedule_time);
      } catch (parseError) {
        console.error('[UPDATE STREAM] Error parsing schedule_time:', parseError);
        return res.status(400).json({ 
          success: false, 
          error: `Invalid schedule time format: ${parseError.message}` 
        });
      }
      
      // Calculate total duration from all schedules
      updateData.duration = schedules.reduce((total, sch) => total + parseInt(sch.duration), 0);
      updateData.status = 'scheduled';
      
      // Delete old schedules and create new ones
      const StreamSchedule = require('./models/StreamSchedule');
      await StreamSchedule.deleteByStreamId(req.params.id);
      
      for (const schedule of schedules) {
        try {
          const scheduleData = {
            stream_id: req.params.id,
            schedule_time: parseScheduleTime(schedule.schedule_time),
            duration: parseInt(schedule.duration),
            is_recurring: schedule.is_recurring || false,
            recurring_days: schedule.recurring_days || null
          };
          
          await StreamSchedule.create(scheduleData);
          
          if (schedule.is_recurring) {
            console.log(`[UPDATE STREAM] Created recurring schedule for stream ${req.params.id}: ${schedule.recurring_days}`);
          }
        } catch (schedError) {
          console.error('[UPDATE STREAM] Error creating schedule:', schedError);
          return res.status(400).json({ 
            success: false, 
            error: `Invalid schedule format: ${schedError.message}` 
          });
        }
      }
      console.log(`[UPDATE STREAM] Updated ${schedules.length} schedule(s) for stream ${req.params.id}`);
    } else if ('schedules' in req.body && (!schedules || schedules.length === 0)) {
      // Clear schedules
      const StreamSchedule = require('./models/StreamSchedule');
      await StreamSchedule.deleteByStreamId(req.params.id);
      updateData.schedule_time = null;
      updateData.status = 'offline';
    }

    const updatedStream = await Stream.update(req.params.id, updateData);
    console.log('[UPDATE STREAM] Stream updated successfully:', req.params.id);
    res.json({ success: true, stream: updatedStream });
  } catch (error) {
    console.error('[UPDATE STREAM] Error updating stream:', error);
    console.error('[UPDATE STREAM] Error stack:', error.stack);
    res.status(500).json({ success: false, error: `Failed to update stream: ${error.message}` });
  }
});
app.delete('/api/streams/:id', isAuthenticated, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this stream' });
    }
    await Stream.delete(req.params.id, req.session.userId);
    res.json({ success: true, message: 'Stream deleted successfully' });
  } catch (error) {
    console.error('Error deleting stream:', error);
    res.status(500).json({ success: false, error: 'Failed to delete stream' });
  }
});
app.post('/api/streams/:id/status', isAuthenticated, [
  body('status').isIn(['live', 'offline', 'scheduled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }
    const streamId = req.params.id;
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const newStatus = req.body.status;
    if (newStatus === 'live') {
      if (stream.status === 'live') {
        return res.json({
          success: false,
          error: 'Stream is already live',
          stream
        });
      }
      if (!stream.video_id) {
        return res.json({
          success: false,
          error: 'No video attached to this stream',
          stream
        });
      }
      
      // Check if stream has schedule (from stream_schedules table)
      const StreamSchedule = require('./models/StreamSchedule');
      const schedules = await StreamSchedule.findByStreamId(streamId);
      const activeSchedule = schedules && schedules.length > 0 ? schedules[0] : null;
      
      if (activeSchedule && activeSchedule.schedule_time) {
        const now = new Date();
        const scheduleTime = new Date(activeSchedule.schedule_time);
        
        console.log(`[API] Start stream validation:`);
        console.log(`[API] - Stream ID: ${streamId}`);
        console.log(`[API] - Is recurring: ${activeSchedule.is_recurring}`);
        console.log(`[API] - Current time: ${now.toISOString()} (${now.toLocaleString()})`);
        console.log(`[API] - Schedule time: ${scheduleTime.toISOString()} (${scheduleTime.toLocaleString()})`);
        
        // For recurring schedules, only compare time (HH:MM), not date
        if (activeSchedule.is_recurring) {
          // Convert both to local timezone for comparison
          const nowHour = now.getHours();
          const nowMinute = now.getMinutes();
          
          // Convert UTC schedule time to local timezone
          const scheduleLocalTime = new Date(scheduleTime.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
          const scheduleHour = scheduleLocalTime.getHours();
          const scheduleMinute = scheduleLocalTime.getMinutes();
          
          console.log(`[API] - Current time (HH:MM): ${nowHour}:${nowMinute}`);
          console.log(`[API] - Schedule time local (HH:MM): ${scheduleHour}:${scheduleMinute}`);
          
          // Check if current time is before schedule time (today)
          const nowTimeInMinutes = nowHour * 60 + nowMinute;
          const scheduleTimeInMinutes = scheduleHour * 60 + scheduleMinute;
          
          if (nowTimeInMinutes < scheduleTimeInMinutes) {
            console.log(`[API] ✓ Schedule time hasn't arrived yet today, setting status to 'scheduled'`);
            await Stream.updateStatus(streamId, 'scheduled', req.session.userId);
            return res.json({
              success: true,
              message: `Stream scheduled for ${scheduleHour.toString().padStart(2, '0')}:${scheduleMinute.toString().padStart(2, '0')} today. It will start automatically.`,
              stream: await Stream.getStreamWithVideo(streamId),
              scheduled: true
            });
          }
          
          // Check if we're past the end time (schedule + duration)
          if (activeSchedule.duration) {
            const endTimeInMinutes = scheduleTimeInMinutes + activeSchedule.duration;
            console.log(`[API] - End time (HH:MM): ${Math.floor(endTimeInMinutes / 60)}:${endTimeInMinutes % 60}`);
            console.log(`[API] - Already ended today? ${nowTimeInMinutes >= endTimeInMinutes}`);
            
            if (nowTimeInMinutes >= endTimeInMinutes) {
              console.log(`[API] ✗ Stream schedule has already ended today`);
              return res.json({
                success: false,
                error: 'Stream schedule has already ended for today. It will run again tomorrow.',
                stream
              });
            }
          }
          
          console.log(`[API] ✓ Starting stream now (within today's schedule window)`);
        } else {
          // One-time schedule - compare full datetime
          console.log(`[API] - Schedule in future? ${scheduleTime > now}`);
          
          if (scheduleTime > now) {
            console.log(`[API] ✓ Schedule is in future, setting status to 'scheduled'`);
            await Stream.updateStatus(streamId, 'scheduled', req.session.userId);
            return res.json({
              success: true,
              message: 'Stream scheduled successfully. It will start automatically at the scheduled time.',
              stream: await Stream.getStreamWithVideo(streamId),
              scheduled: true
            });
          }
          
          console.log(`[API] Schedule time has arrived or passed`);
          
          // Check end time for one-time schedule
          if (activeSchedule.duration) {
            const endTime = new Date(scheduleTime.getTime() + (activeSchedule.duration * 60 * 1000));
            console.log(`[API] - End time: ${endTime.toISOString()} (${endTime.toLocaleString()})`);
            console.log(`[API] - Already ended? ${now >= endTime}`);
            
            if (now >= endTime) {
              console.log(`[API] ✗ Stream schedule has already ended`);
              return res.json({
                success: false,
                error: 'Stream schedule has already ended',
                stream
              });
            }
          }
          
          console.log(`[API] ✓ Starting stream now (within schedule window)`);
        }
      } else {
        console.log(`[API] No schedule found, starting stream immediately`);
      }
      
      const result = await streamingService.startStream(streamId);
      if (result.success) {
        const updatedStream = await Stream.getStreamWithVideo(streamId);
        return res.json({
          success: true,
          stream: updatedStream,
          isAdvancedMode: result.isAdvancedMode
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error || 'Failed to start stream'
        });
      }
    } else if (newStatus === 'offline') {
      if (stream.status === 'live') {
        const result = await streamingService.stopStream(streamId);
        if (!result.success) {
          console.warn('Failed to stop FFmpeg process:', result.error);
        }
        await Stream.update(streamId, {
          schedule_time: null
        });
        console.log(`Reset schedule_time for stopped stream ${streamId}`);
      } else if (stream.status === 'scheduled') {
        await Stream.update(streamId, {
          schedule_time: null,
          status: 'offline'
        });
        console.log(`Scheduled stream ${streamId} was cancelled`);
      }
      const result = await Stream.updateStatus(streamId, 'offline', req.session.userId);
      if (!result.updated) {
        return res.status(404).json({
          success: false,
          error: 'Stream not found or not updated'
        });
      }
      return res.json({ success: true, stream: result });
    } else {
      const result = await Stream.updateStatus(streamId, newStatus, req.session.userId);
      if (!result.updated) {
        return res.status(404).json({
          success: false,
          error: 'Stream not found or not updated'
        });
      }
      return res.json({ success: true, stream: result });
    }
  } catch (error) {
    console.error('Error updating stream status:', error);
    res.status(500).json({ success: false, error: 'Failed to update stream status' });
  }
});
app.get('/api/streams/check-key', isAuthenticated, async (req, res) => {
  try {
    const streamKey = req.query.key;
    const excludeId = req.query.excludeId || null;
    if (!streamKey) {
      return res.status(400).json({
        success: false,
        error: 'Stream key is required'
      });
    }
    const isInUse = await Stream.isStreamKeyInUse(streamKey, req.session.userId, excludeId);
    res.json({
      success: true,
      isInUse: isInUse,
      message: isInUse ? 'Stream key is already in use' : 'Stream key is available'
    });
  } catch (error) {
    console.error('Error checking stream key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check stream key'
    });
  }
});
app.get('/api/streams/:id/logs', isAuthenticated, async (req, res) => {
  try {
    const streamId = req.params.id;
    const stream = await Stream.findById(streamId);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    const logs = streamingService.getStreamLogs(streamId);
    const isActive = streamingService.isStreamActive(streamId);
    res.json({
      success: true,
      logs,
      isActive,
      stream
    });
  } catch (error) {
    console.error('Error fetching stream logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stream logs' });
  }
});
app.get('/playlist', isAuthenticated, async (req, res) => {
  try {
    const playlists = await Playlist.findAll(req.session.userId);
    const videos = await Video.findAll(req.session.userId);
    res.render('playlist', {
      title: 'Playlist',
      active: 'playlist',
      user: await User.findById(req.session.userId),
      playlists: playlists,
      videos: videos
    });
  } catch (error) {
    console.error('Playlist error:', error);
    res.redirect('/dashboard');
  }
});

app.get('/api/playlists', isAuthenticated, async (req, res) => {
  try {
    const playlists = await Playlist.findAll(req.session.userId);

    playlists.forEach(playlist => {
      playlist.shuffle = playlist.is_shuffle;
    });

    res.json({ success: true, playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
  }
});

app.post('/api/playlists', isAuthenticated, [
  body('name').trim().isLength({ min: 1 }).withMessage('Playlist name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const playlistData = {
      name: req.body.name,
      description: req.body.description || null,
      is_shuffle: req.body.shuffle === 'true' || req.body.shuffle === true,
      user_id: req.session.userId
    };

    const playlist = await Playlist.create(playlistData);

    if (req.body.videos && Array.isArray(req.body.videos) && req.body.videos.length > 0) {
      for (let i = 0; i < req.body.videos.length; i++) {
        await Playlist.addVideo(playlist.id, req.body.videos[i], i + 1);
      }
    }

    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to create playlist' });
  }
});

app.get('/api/playlists/:id', isAuthenticated, async (req, res) => {
  try {
    const playlist = await Playlist.findByIdWithVideos(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    if (playlist.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    playlist.shuffle = playlist.is_shuffle;

    res.json({ success: true, playlist });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch playlist' });
  }
});

app.put('/api/playlists/:id', isAuthenticated, [
  body('name').trim().isLength({ min: 1 }).withMessage('Playlist name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    if (playlist.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description || null,
      is_shuffle: req.body.shuffle === 'true' || req.body.shuffle === true
    };

    const updatedPlaylist = await Playlist.update(req.params.id, updateData);

    if (req.body.videos && Array.isArray(req.body.videos)) {
      const existingVideos = await Playlist.findByIdWithVideos(req.params.id);
      if (existingVideos && existingVideos.videos) {
        for (const video of existingVideos.videos) {
          await Playlist.removeVideo(req.params.id, video.id);
        }
      }

      for (let i = 0; i < req.body.videos.length; i++) {
        await Playlist.addVideo(req.params.id, req.body.videos[i], i + 1);
      }
    }

    res.json({ success: true, playlist: updatedPlaylist });
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to update playlist' });
  }
});

app.delete('/api/playlists/:id', isAuthenticated, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    if (playlist.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Playlist.delete(req.params.id);
    res.json({ success: true, message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to delete playlist' });
  }
});

app.post('/api/playlists/:id/videos', isAuthenticated, [
  body('videoId').notEmpty().withMessage('Video ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    if (playlist.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const video = await Video.findById(req.body.videoId);
    if (!video || video.user_id !== req.session.userId) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    const position = await Playlist.getNextPosition(req.params.id);
    await Playlist.addVideo(req.params.id, req.body.videoId, position);

    res.json({ success: true, message: 'Video added to playlist' });
  } catch (error) {
    console.error('Error adding video to playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to add video to playlist' });
  }
});

app.delete('/api/playlists/:id/videos/:videoId', isAuthenticated, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    if (playlist.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Playlist.removeVideo(req.params.id, req.params.videoId);
    res.json({ success: true, message: 'Video removed from playlist' });
  } catch (error) {
    console.error('Error removing video from playlist:', error);
    res.status(500).json({ success: false, error: 'Failed to remove video from playlist' });
  }
});

app.put('/api/playlists/:id/videos/reorder', isAuthenticated, [
  body('videoPositions').isArray().withMessage('Video positions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }
    if (playlist.user_id !== req.session.userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await Playlist.updateVideoPositions(req.params.id, req.body.videoPositions);
    res.json({ success: true, message: 'Video order updated' });
  } catch (error) {
    console.error('Error reordering videos:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder videos' });
  }
});

app.get('/api/server-time', (req, res) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const formattedTime = `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
  res.json({
    serverTime: now.toISOString(),
    formattedTime: formattedTime
  });
});
const server = app.listen(port, '0.0.0.0', async () => {
  // Set server timeout for large file uploads
  server.timeout = uploadTimeout;
  server.keepAliveTimeout = uploadTimeout;
  server.headersTimeout = uploadTimeout + 1000;
  
  const ipAddresses = getLocalIpAddresses();
  console.log(`StreamBro running at:`);
  if (ipAddresses && ipAddresses.length > 0) {
    ipAddresses.forEach(ip => {
      console.log(`  http://${ip}:${port}`);
    });
  } else {
    console.log(`  http://localhost:${port}`);
  }
  // Store live streams before resetting for recovery
  let liveStreamsBeforeReset = [];
  try {
    const streams = await Stream.findAll(null, 'live');
    if (streams && streams.length > 0) {
      console.log(`Found ${streams.length} live streams before reset`);
      liveStreamsBeforeReset = streams.map(s => ({
        id: s.id,
        title: s.title,
        start_time: s.start_time
      }));
      console.log(`Resetting ${streams.length} live streams to offline state...`);
      for (const stream of streams) {
        await Stream.updateStatus(stream.id, 'offline');
      }
    }
  } catch (error) {
    console.error('Error resetting stream statuses:', error);
  }
  
  // Cleanup orphaned temporary files from previous sessions
  try {
    await streamingService.cleanupOrphanedTempFiles();
  } catch (error) {
    console.error('Failed to cleanup orphaned files:', error);
  }
  
  // Initialize scheduler
  schedulerService.init(streamingService);
  
  // Sync stream statuses
  try {
    await streamingService.syncStreamStatuses();
  } catch (error) {
    console.error('Failed to sync stream statuses:', error);
  }
  
  // Auto-recovery: Restart streams that should still be active
  setTimeout(async () => {
    try {
      console.log('[Startup] Initiating auto-recovery for active streams...');
      
      // Pass the list of streams that were live before reset
      if (liveStreamsBeforeReset.length > 0) {
        console.log(`[Startup] Attempting to recover ${liveStreamsBeforeReset.length} stream(s) that were live before restart`);
        await streamingService.recoverStreamsAfterRestart(liveStreamsBeforeReset);
      } else {
        // Fallback to normal recovery (for scheduled streams)
        await streamingService.recoverActiveStreams();
      }
      
      console.log('[Startup] Auto-recovery completed');
    } catch (error) {
      console.error('[Startup] Failed to recover active streams:', error);
      console.error('[Startup] Error stack:', error.stack);
    }
  }, 3000); // Wait 3 seconds after server start to allow everything to initialize
  
  // Initialize GracefulShutdown after services are ready
  const gracefulShutdown = new GracefulShutdown({
    streamingService,
    schedulerService,
    server,
    db,
    shutdownTimeout: 30000 // 30 seconds timeout
  });
  
  // Register signal handlers
  gracefulShutdown.registerHandlers();
  console.log('[App] GracefulShutdown initialized and signal handlers registered');
});

server.timeout = 30 * 60 * 1000;
server.keepAliveTimeout = 30 * 60 * 1000;
server.headersTimeout = 30 * 60 * 1000;
