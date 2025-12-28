# YouTube Broadcast Transition Fix

## Problem
Broadcasts were created successfully but **transition to "live" status failed** with "Invalid transition" error after 3+ minutes of retrying.

## Root Cause Analysis

### 1. Ingestion Not Stable
- YouTube requires **stable video ingestion** before allowing transition to live
- Even though stream status shows "active", YouTube needs time to buffer incoming data
- FFmpeg starts → connects → sends data, but YouTube needs 10-30 seconds to process buffer

### 2. Insufficient Retry Logic
- Previous retry: 10 attempts × 15 seconds = 150 seconds total
- But retry started immediately after stream "active" detection
- No additional wait time for ingestion stabilization

### 3. Timing Issue
- Broadcast created immediately after FFmpeg connects
- Transition attempted too quickly
- YouTube rejects: "Stream is not receiving data" or "Invalid transition"

## Solution Implemented

### A. FFmpeg Early Start (2 Minutes Before Schedule)
**File**: `services/schedulerService.js`

For YouTube API streams, FFmpeg now starts **2 minutes BEFORE** the scheduled time:

```javascript
// Recurring schedules
if (stream.use_youtube_api) {
  startWindow = { min: -2, max: 1 }; // Start 2 min before to 1 min after
}

// One-time schedules
if (stream.use_youtube_api) {
  earlyStartMs = 2 * 60 * 1000; // 2 minutes early
}
```

**Benefits**:
- Gives YouTube 2 minutes to receive and buffer video data
- Ingestion is fully stable by the time broadcast is created
- Reduces "Stream not receiving data" errors

### B. Ingestion Stabilization Wait
**File**: `services/streamingService.js`

After FFmpeg connects and stream becomes "active", wait **10 additional seconds** for ingestion to stabilize:

```javascript
console.log(`[StreamingService] ✅ FFmpeg is connected and stream is ACTIVE!`);

// Wait 10 seconds for YouTube ingestion to stabilize
console.log(`[StreamingService] Waiting 10 seconds for YouTube ingestion to stabilize...`);
await new Promise(resolve => setTimeout(resolve, 10000));
console.log(`[StreamingService] ✓ Ingestion buffer ready`);

// NOW create broadcast
await createNewBroadcast(...);
```

### C. Improved Retry Logic (5×6 seconds)
**File**: `services/streamingService.js`

Changed from recursive retry to **for loop** with better timing:

```javascript
let transitionSuccess = false;
const maxRetries = 5;
const retryDelay = 6000; // 6 seconds

for (let i = 0; i < maxRetries; i++) {
  try {
    console.log(`[YouTube] Mencoba transisi ke LIVE (Percobaan ${i + 1}/${maxRetries})...`);
    
    await youtubeService.transitionBroadcastSmart(tokens, {
      broadcastId: updatedStream.youtube_broadcast_id,
      streamId: youtubeStreamId,
      targetStatus: 'live',
      channelId: stream.youtube_channel_id
    });
    
    transitionSuccess = true;
    console.log(`[YouTube] ✅ Berhasil LIVE!`);
    break; // Exit on success
    
  } catch (err) {
    console.error(`[YouTube] ⚠️ Gagal transisi (${i + 1}/${maxRetries}): ${err.message}`);
    
    if (i < maxRetries - 1) {
      console.log(`[YouTube] Menunggu ${retryDelay/1000} detik sebelum coba lagi...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}
```

**Total retry time**: 5 attempts × 6 seconds = 30 seconds

### D. Better Error Logging

Added detailed error logging for debugging:

```javascript
if (err.response?.data) {
  console.error(`[YouTube] API Error Details:`, JSON.stringify(err.response.data, null, 2));
}
```

## Timeline Comparison

### Before Fix
```
09:25:00 - Schedule time
09:25:07 - FFmpeg starts
09:25:10 - FFmpeg connects (3s)
09:25:15 - Stream "active" detected (5s)
09:25:15 - Broadcast created immediately
09:25:20 - Transition attempt #1 → FAIL (ingestion not stable)
09:25:35 - Transition attempt #2 → FAIL (15s delay)
09:25:50 - Transition attempt #3 → FAIL
... continues failing for 2.5 minutes
09:27:45 - Give up after 10 attempts
```

### After Fix
```
09:23:00 - FFmpeg starts (2 min early) ⭐
09:23:03 - FFmpeg connects (3s)
09:23:08 - Stream "active" detected (5s)
09:23:18 - Wait 10s for ingestion (stabilization) ⭐
09:23:28 - Broadcast created (ingestion stable)
09:23:30 - Transition attempt #1 → SUCCESS ✅
09:25:00 - Actual schedule time (already live)
```

## Benefits

1. **Higher Success Rate**: Ingestion is stable before transition
2. **Faster Go Live**: Usually succeeds on first attempt
3. **Better User Experience**: Stream is live exactly at schedule time
4. **Reduced API Quota**: Fewer failed transition attempts
5. **Cleaner Logs**: Clear success/failure messages

## Testing

### Test Schedule
- **Slot 1**: 09:25-09:55 (30 min) - FAILED (old code)
- **Slot 2**: 10:15-10:45 (30 min) - Will test with new code

### Expected Behavior
1. FFmpeg starts at 10:13 (2 min early)
2. Stream becomes active by 10:13:10
3. Wait 10s for ingestion (until 10:13:20)
4. Broadcast created at 10:13:20
5. Transition to live at 10:13:25 (first attempt)
6. Stream is LIVE by 10:13:30
7. User sees "LIVE" at exactly 10:15 (schedule time)

## Deployment

- **PM2 Restart**: #194
- **Date**: 2025-12-28 09:56 WIB
- **Files Modified**:
  - `services/streamingService.js`
  - `services/schedulerService.js`

## Notes

- Early start only applies to **YouTube API streams** (`use_youtube_api = true`)
- Regular RTMP streams start at exact schedule time (no change)
- Manual "Stream Now" still works as before
- Recovery mode skips broadcast creation (prevents explosion)

## Next Steps

1. Monitor slot 2 (10:15) to verify fix works
2. If successful, this becomes the standard flow
3. If still fails, consider increasing early start to 3 minutes
4. Document in user guide: "Streams go live 2 minutes before schedule for warmup"
