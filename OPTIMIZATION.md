# StreamBro Light v2.1 - RAM Optimization Guide

## 🎯 Goal: Support 10+ Concurrent Streams with 4GB RAM

### Current Status
- **RAM per stream (copy mode):** ~130 MB
- **Max concurrent streams:** ~15-20 streams
- **Total RAM usage:** ~2-2.5 GB

### Target After Optimization
- **RAM per stream (copy mode):** ~80 MB
- **Max concurrent streams:** ~25-30 streams
- **Total RAM usage:** ~2-2.5 GB (same, but more streams!)

---

## 🔧 Optimization Steps

### 1. Reduce FFmpeg Buffer Size

**File:** `services/streamingService.js`

**Change:**
```javascript
// Before:
'-bufsize', '4M',

// After:
'-bufsize', '2M',
```

**Impact:** Save ~2 MB per stream
**Risk:** Low (2M is still sufficient for RTMP)

---

### 2. Reduce Max Muxing Queue Size

**File:** `services/streamingService.js`

**Change:**
```javascript
// Before:
'-max_muxing_queue_size', '7000',

// After:
'-max_muxing_queue_size', '4096',
```

**Impact:** Save ~10-15 MB per stream
**Risk:** Low (4096 is standard for RTMP)

---

### 3. Optimize Logging Level

**File:** `services/streamingService.js`

**Change:**
```javascript
// Before:
'-loglevel', 'error',

// After (optional, for extreme optimization):
'-loglevel', 'fatal',
```

**Impact:** Save ~5 MB per stream
**Risk:** Medium (harder to debug issues)
**Recommendation:** Keep 'error' for now

---

### 4. Limit Stream Logs in Memory

**File:** `services/streamingService.js`

**Already Optimized:**
```javascript
const MAX_LOG_LINES = 100; // ✅ Good!
```

**Impact:** Prevents memory leak from logs
**Status:** ✅ Already implemented

---

### 5. Use RAM Disk for Temp Files (Linux Only)

**File:** `services/streamingService.js`

**Change:**
```javascript
// Before:
const concatFile = path.join(projectRoot, 'temp', `playlist_${stream.id}.txt`);

// After:
const concatFile = process.platform === 'linux' 
  ? `/dev/shm/playlist_${stream.id}.txt`
  : path.join(projectRoot, 'temp', `playlist_${stream.id}.txt`);
```

**Impact:** Faster I/O, less disk wear
**Risk:** Low (fallback to disk on Windows)

---

### 6. Node.js Memory Limit

**File:** `package.json` or startup script

**Add:**
```json
{
  "scripts": {
    "start": "node --max-old-space-size=512 app.js"
  }
}
```

**Impact:** Prevent Node.js from using too much RAM
**Risk:** Low (512MB is enough for Node.js app)

---

## 📊 Expected Results

### Before Optimization:
```
10 streams × 130 MB = 1.3 GB
Node.js: 100 MB
OS: 500 MB
Total: ~1.9 GB
Free: ~2.1 GB
```

### After Optimization:
```
10 streams × 80 MB = 800 MB
Node.js: 100 MB (limited)
OS: 500 MB
Total: ~1.4 GB
Free: ~2.6 GB

Can handle: 25-30 streams!
```

---

## ⚠️ Important Notes

1. **Always use Copy Mode** for multi-streaming
   - Re-encode mode: ~400 MB per stream
   - Copy mode: ~80 MB per stream

2. **Ensure videos are H.264+AAC**
   - Incompatible codecs will force re-encoding
   - Check with: `ffprobe video.mp4`

3. **Monitor RAM usage**
   - Use dashboard metrics
   - Set alerts at 80% RAM usage

4. **Test gradually**
   - Start with 5 streams
   - Increase to 10, then 15, etc.
   - Monitor stability

---

## 🚀 Quick Implementation

Run these commands to apply optimizations:

```bash
# 1. Backup current file
cp services/streamingService.js services/streamingService.js.backup

# 2. Apply changes (manual edit or use sed)
# Edit services/streamingService.js:
# - Change '-bufsize', '4M' to '-bufsize', '2M'
# - Change '-max_muxing_queue_size', '7000' to '-max_muxing_queue_size', '4096'

# 3. Update package.json
# Add: "start": "node --max-old-space-size=512 app.js"

# 4. Restart application
npm restart
```

---

## 📈 Monitoring

After optimization, monitor:
- RAM usage per stream
- Stream stability
- CPU usage
- Network bandwidth

If issues occur:
- Revert to backup
- Increase buffer sizes gradually
- Check FFmpeg logs

---

## ✅ Checklist

- [ ] Reduce buffer size to 2M
- [ ] Reduce muxing queue to 4096
- [ ] Set Node.js memory limit
- [ ] Test with 5 streams
- [ ] Test with 10 streams
- [ ] Test with 15+ streams
- [ ] Monitor for 24 hours
- [ ] Document results

---

**Last Updated:** December 9, 2025
**Version:** 2.1
**Status:** Ready for implementation
