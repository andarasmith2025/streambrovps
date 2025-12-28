# Broadcast Duplication Fix - December 28, 2024

## Problem
User reported 2 broadcasts created for 1 schedule:
- ZgXgBRbDe70
- bdrS7v5QcrAada

Both broadcasts were for the same schedule at 12:45, but with different thumbnails.

## Root Cause
`streamingService.js` line ~356 function `createNewBroadcast()` was creating a NEW broadcast even when `broadcastScheduler.js` had already created one 3-5 minutes before schedule time.

The flow was:
1. **12:40** - `broadcastScheduler` creates broadcast (e.g., ZgXgBRbDe70)
2. **12:45** - Scheduler starts FFmpeg
3. **12:45** - `streamingService` creates ANOTHER broadcast (e.g., bdrS7v5QcrAada) because it didn't check if one already exists

## Fix Applied
Added duplicate check in `services/streamingService.js` line ~356:

```javascript
async function createNewBroadcast(stream, streamId, tokens, youtubeService) {
  console.log(`[StreamingService] Creating NEW YouTube broadcast for stream ${streamId}...`);
  
  // ⭐ CRITICAL FIX: Check if broadcast already exists (prevent duplication)
  const currentStream = await Stream.findById(streamId);
  if (currentStream && currentStream.youtube_broadcast_id) {
    console.log(`[StreamingService] ⚠️ Broadcast already exists: ${currentStream.youtube_broadcast_id}`);
    console.log(`[StreamingService] Skipping broadcast creation to prevent duplication`);
    return; // Exit early - broadcast already created by scheduler
  }
  
  // ... rest of function
}
```

## Expected Behavior After Fix
1. **12:40** - `broadcastScheduler` creates broadcast and saves to `streams.youtube_broadcast_id`
2. **12:45** - Scheduler starts FFmpeg
3. **12:45** - `streamingService` checks database, finds existing broadcast, SKIPS creation
4. **Result**: Only 1 broadcast per schedule ✅

## Deployment
File modified: `services/streamingService.js`

**IMPORTANT**: This file needs to be uploaded to VPS and server restarted:
```bash
# Upload file
scp services/streamingService.js root@85.9.195.103:/root/streambrovps/services/

# Restart server
ssh root@85.9.195.103 "cd /root/streambrovps && pm2 restart streambro"
```

## Testing
After deployment, create a new schedule and monitor:
1. Check logs at T-3 minutes for broadcast creation by scheduler
2. Check logs at T-0 minutes for FFmpeg start
3. Verify only 1 broadcast appears in YouTube Studio
4. Verify stream goes live automatically (enableAutoStart: true)

## Related Issues
- Edit modal not populating schedules (separate issue - API endpoint exists, needs frontend debugging)
- Transition still failing at 12:49 (likely due to restart #209 during test)
