# Bandwidth & Stream Limits - Implementation Status

**Date:** December 30, 2024  
**Status:** PARTIALLY COMPLETE

## ✅ COMPLETED

### 1. Database & Models
- `users` table has `max_concurrent_streams` (default: 1) and `max_storage_gb` (default: 3.0)
- User model has `updateStreamLimit()` and `updateStorageLimit()` methods
- StreamLimiter utility fetches user-specific limits from database

### 2. Stream Limiting
- `utils/StreamLimiter.js` enforces per-user and global limits
- Integrated in `streamingService.js`
- Automatically checks limits before starting stream

### 3. User Management UI
- `views/users.ejs` displays quota limits with edit buttons
- Frontend functions exist: `editStreamLimit()` and `editStorageLimit()`

### 4. Template System
- Fully functional save/load with all YouTube metadata
- `routes/templates.js` complete

## ❌ MISSING (TO IMPLEMENT)

### 1. Backend Routes for Quota Management
**Priority:** HIGH  
**Files:** `app.js` or `routes/users.js`

Need endpoints:
- `POST /api/users/:userId/update-stream-limit`
- `POST /api/users/:userId/update-storage-limit`

### 2. Video Upload Validation
**Priority:** HIGH  
**Files:** `middleware/uploadMiddleware.js`

Current: 10GB limit, no bitrate check  
Required:
- File size: 2GB max (change from 10GB)
- Bitrate: 4000-6500 Kbps validation using ffprobe
- Reject videos outside range

### 3. Storage Quota Enforcement
**Priority:** MEDIUM  
**Files:** `middleware/uploadMiddleware.js`, `routes/videos.js`

Check user storage before upload:
- Get current usage (sum of video file_size)
- Compare with user's max_storage_gb
- Reject if exceeded

## 🔧 QUICK IMPLEMENTATION

### Step 1: Add Backend Routes (30 min)
```javascript
// In app.js or routes/users.js
app.post('/api/users/:userId/update-stream-limit', requireAuth, requireAdmin, async (req, res) => {
  const { max_concurrent_streams } = req.body;
  await User.updateStreamLimit(req.params.userId, max_concurrent_streams);
  res.json({ success: true });
});

app.post('/api/users/:userId/update-storage-limit', requireAuth, requireAdmin, async (req, res) => {
  const { max_storage_gb } = req.body;
  await User.updateStorageLimit(req.params.userId, max_storage_gb);
  res.json({ success: true });
});
```

### Step 2: Add Bitrate Validation (45 min)
```javascript
// utils/videoValidator.js
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function validateVideo(filePath) {
  const { stdout } = await execPromise(
    `ffprobe -v error -select_streams v:0 -show_entries stream=bit_rate -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  const bitrate = Math.round(parseInt(stdout.trim()) / 1000);
  
  if (bitrate < 4000 || bitrate > 6500) {
    return { valid: false, error: `Bitrate ${bitrate} Kbps out of range (4000-6500)` };
  }
  return { valid: true, bitrate };
}
```

### Step 3: Update File Size Limit (5 min)
```javascript
// middleware/uploadMiddleware.js
const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB (changed from 10GB)
  }
});
```

## 📊 CURRENT LIMITS

| Limit | Default | Enforced |
|-------|---------|----------|
| Concurrent Streams | 1/user | ✅ Yes |
| Video Bitrate | 4000-6500 Kbps | ❌ No |
| Video File Size | 2 GB | ❌ No (still 10GB) |
| Storage Quota | 3 GB/user | ❌ No |

## 🚨 BANDWIDTH INCIDENT

**Issue:** 15 streams @ 5 Mbps = 75 Mbps upload → 1.49 TB → FUP exhausted  
**Fix:** Stopped 14 streams, kept only HSN  
**Prevention:** Implement bitrate limits + file size limits

## 📞 NEXT STEPS

1. Add backend routes for quota management (30 min)
2. Add bitrate validation (45 min)
3. Reduce file size limit to 2GB (5 min)
4. Add storage quota enforcement (30 min)

**Total:** ~2 hours
