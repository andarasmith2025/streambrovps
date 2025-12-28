# YouTube Broadcast Timing Fix

## Problem
Broadcasts were being created 3-5 minutes BEFORE FFmpeg connected to YouTube, causing:
- **"Invalid transition" errors** - YouTube rejects transition to "live" when stream is not active
- **Broadcast spam** - Many broadcasts created but immediately completed
- **Database/YouTube desync** - Database shows "live" but YouTube shows "complete"
- **Risk of YouTube ban** - Too many failed broadcasts looks like spam

## Root Cause
**OLD FLOW (BROKEN):**
1. `broadcastScheduler` creates broadcast 3-5 min before schedule time
2. Broadcast status: "ready" (waiting for stream)
3. `schedulerService` starts FFmpeg at schedule time
4. FFmpeg takes 30-120 seconds to connect
5. Code tries to transition broadcast to "live" after 5-30 seconds
6. **FAIL**: FFmpeg not connected yet → YouTube rejects: "Invalid transition"
7. Broadcast auto-completes or stays "ready"
8. Database still shows "live" but YouTube shows "complete"

**Timeline Example:**
```
14:00:00 - broadcastScheduler creates broadcast (status: ready)
14:05:00 - schedulerService starts FFmpeg
14:05:05 - Code tries to transition to live (FAIL - FFmpeg not connected)
14:05:30 - FFmpeg finally connects (too late, broadcast already failed)
14:06:00 - Broadcast auto-completes
         - Database: "live" ❌
         - YouTube: "complete" ✅
```

## Solution
**NEW FLOW (FIXED):**
1. `broadcastScheduler` → **DISABLED** (no longer creates broadcasts early)
2. `schedulerService` starts FFmpeg at schedule time
3. FFmpeg connects to YouTube
4. `streamingService` waits for stream to be "active" in YouTube API
5. **ONLY THEN** create broadcast (stream is already active)
6. Transition to "live" immediately (works because stream is active)

**Timeline Example:**
```
14:05:00 - schedulerService starts FFmpeg
14:05:30 - FFmpeg connects to YouTube
14:05:45 - streamingService detects stream is "active"
14:05:46 - Create broadcast (status: ready)
14:05:47 - Transition to live (SUCCESS - stream is active)
         - Database: "live" ✅
         - YouTube: "live" ✅
```

## Changes Made

### 1. `services/broadcastScheduler.js`
**DISABLED** automatic broadcast creation:
```javascript
start() {
  console.log('[BroadcastScheduler] ⚠️ DISABLED - Broadcast creation now happens AFTER FFmpeg connects');
  // Commented out: checkUpcomingSchedules() and setInterval()
}
```

### 2. `services/streamingService.js`
**NEW** broadcast creation flow in `startStream()`:
```javascript
// After FFmpeg starts, run background task:
1. Wait for FFmpeg to connect (check YouTube stream status)
2. Wait for stream to be "active" (max 3 minutes)
3. Create broadcast (stream is already active)
4. Transition to "live" immediately (works because stream is active)
```

**Key improvements:**
- Uses `youtubeService.waitForStreamActive()` - waits up to 3 minutes for FFmpeg
- Only creates broadcast AFTER stream is confirmed active
- Transition happens immediately (no more "Invalid transition" errors)
- Recovery mode still skips broadcast creation (prevents explosion)

## Benefits
✅ **No more "Invalid transition" errors** - Broadcast created when stream is ready  
✅ **No more broadcast spam** - Only creates broadcast when FFmpeg is connected  
✅ **Perfect database/YouTube sync** - Both show "live" at the same time  
✅ **No risk of YouTube ban** - No more failed broadcasts  
✅ **Faster transition** - Immediate transition because stream is already active  

## Testing
1. Schedule a stream for 5 minutes from now
2. Wait for schedule time
3. Check logs:
   - FFmpeg starts
   - "Waiting for stream to become active..."
   - "Stream is ACTIVE!"
   - "Creating broadcast..."
   - "Broadcast created successfully"
   - "Transitioning to live..."
   - "Broadcast transitioned to LIVE successfully!"
4. Check YouTube Studio - broadcast should be "live" immediately
5. Check database - status should be "live"

## Rollback
If issues occur, re-enable `broadcastScheduler`:
```javascript
// In services/broadcastScheduler.js start()
this.checkUpcomingSchedules();
this.checkInterval = setInterval(() => {
  this.checkUpcomingSchedules();
}, 60 * 1000);
```

## Notes
- **Recovery mode** still skips broadcast creation to prevent explosion during PM2 restart
- **"Stream Now"** mode also uses new flow (waits for FFmpeg before creating broadcast)
- **Manual streams** (non-API) are not affected by this change
- Old broadcasts from scheduler are still reused if they exist

## Date
December 28, 2025

## Related Issues
- BROADCAST_EXPLOSION_FIX.md - Fixed duplicate broadcast creation
- AUTO_STOP_FIX.md - Fixed incorrect end time calculation
- STALE_END_TIME_FIX.md - Fixed stale end times from old schedules
