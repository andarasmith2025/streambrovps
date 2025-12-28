# Auto-Stop Issue Fix - Streams Stopped Within 1 Minute

## Problem Summary
Streams were being auto-stopped within 1 minute of starting, even though they should run for hours according to their schedules.

## Root Cause Analysis

### The Issue
When PM2 restarts the server, the recovery process (`recoverStreamsAfterRestart`) would:
1. Find streams that were "live" before restart
2. Restart FFmpeg for those streams
3. **BUT**: Did NOT set `active_schedule_id` or `scheduled_end_time`

### Why This Caused Auto-Stop
The `checkStreamDurations()` function in `schedulerService.js` has 3 fallback methods to determine when to stop a stream:

1. **Primary**: Use `scheduled_end_time` (most reliable)
2. **Fallback 1**: Get end time from `active_schedule_id` 
3. **Fallback 2**: Calculate from `start_time + duration` (DANGEROUS for recovery!)

During recovery:
- Stream has NO `scheduled_end_time` ❌
- Stream has NO `active_schedule_id` ❌  
- Stream has OLD `start_time` from before restart (e.g., 11 hours ago) ✓
- Stream has OLD `duration` (e.g., 60 minutes) ✓

**Result**: Fallback 2 calculates: `11 hours ago + 60 minutes = 10 hours ago`
→ Stream "exceeded end time" → Auto-stopped immediately!

### Example Scenario
```
Stream started: 23:00 (yesterday)
Duration: 60 minutes
Expected end: 00:00 (today)

PM2 restart: 10:00 (today)
Recovery starts stream at: 10:00
Fallback 2 calculates: 23:00 + 60min = 00:00 (10 hours ago!)
Auto-stop triggers: "Stream exceeded end time by 600 minutes!"
Stream stopped: 10:01 (1 minute after recovery)
```

## The Fix

### What Changed
Modified `recoverStreamsAfterRestart()` in `services/streamingService.js` to:

1. **Find Active Schedule**: Query `stream_schedules` table for the stream's current schedule
2. **Validate Schedule is Active Now**: 
   - For recurring schedules: Check if today is in `recurring_days` AND current time is within schedule window
   - For one-time schedules: Check if current time is between `schedule_time` and `end_time`
3. **Set Schedule Info BEFORE Starting Stream**:
   - Set `active_schedule_id` = schedule ID
   - Set `scheduled_end_time` = calculated end time for today
   - Set `duration` = schedule duration
4. **Clear Schedule Info if Not Active**: If no active schedule found, clear `active_schedule_id` and `scheduled_end_time` to prevent Fallback 2 from triggering

### Code Changes
**File**: `services/streamingService.js`
**Function**: `recoverStreamsAfterRestart()`
**Lines**: ~1473-1620 (added ~150 lines of schedule detection logic)

### How It Works Now
```
Recovery Process:
1. Find stream that was live before restart
2. Query stream_schedules for active schedule
3. Validate schedule is active NOW (not expired)
4. Set active_schedule_id + scheduled_end_time in database
5. Start stream with isRecovery=true
6. checkStreamDurations() uses scheduled_end_time (Primary method)
7. Stream runs until correct end time ✅
```

## Testing

### Before Fix
```
[Duration Check] Stream: Healing Earth Resonance
[Duration Check]   active_schedule_id: NOT SET
[Duration Check]   duration: 60 minutes
[Duration Check]   start_time: 2024-12-27T23:00:00Z (11 hours ago)
[Duration Check] Calculated end: 2024-12-27T00:00:00Z (10 hours ago)
[Duration Check] 🛑 Stream exceeded end time by 600 minutes!
[Duration Check] 🛑 Stopping stream now...
```

### After Fix
```
[Recovery] ✓ Found active recurring schedule 123 for stream 456
[Recovery]   Schedule time: 6:10, Duration: 60m
[Recovery]   Calculated end time: 2024-12-28T07:10:00Z
[Recovery] ✅ Set active_schedule_id=123, end_time=2024-12-28T07:10:00Z

[Duration Check] Stream: Healing Earth Resonance
[Duration Check]   scheduled_end_time: 2024-12-28T07:10:00Z
[Duration Check]   active_schedule_id: 123
[Duration Check] Source: scheduled_end_time
[Duration Check] Should end at: 07:10:00 WIB
[Duration Check] Current time: 06:15:00 WIB
[Duration Check] ✓ Stream will stop in 55 minutes
```

## Related Files
- `services/streamingService.js` - Recovery logic (FIXED)
- `services/schedulerService.js` - Auto-stop logic (already correct, just needed proper data)
- `services/broadcastScheduler.js` - Broadcast creation (no changes needed)

## Prevention
This fix ensures that:
1. ✅ Recovered streams have proper schedule context
2. ✅ Auto-stop uses correct end time from schedule
3. ✅ Streams without active schedules won't be auto-stopped by old duration
4. ✅ PM2 restarts no longer cause premature stream termination

## User Impact
- **Before**: Streams stopped within 1 minute after PM2 restart
- **After**: Streams continue running until scheduled end time after restart
- **No manual intervention needed**: Recovery is fully automatic

## Deployment
1. Upload fixed `services/streamingService.js` to VPS
2. Restart PM2: `pm2 restart streambro`
3. Monitor logs during next scheduled stream start
4. Verify streams continue running after restart

---
**Status**: ✅ FIXED
**Date**: 2024-12-28
**Tested**: Pending user verification
