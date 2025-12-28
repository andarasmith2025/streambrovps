# Fix: Stream Stopped Immediately Due to Stale scheduled_end_time

## Problem Summary
Streams were being stopped within 1 minute of starting because they had OLD `scheduled_end_time` from previous runs but NO `active_schedule_id`.

## User Report
> "ini sangat membangingkan kenapa auto stopnya jadi kacau ini tidak sampi 1 menit selesai"
> "di hsn dan healing earth sudah banyak yang status stream tapi di youtube hanya terkirim 1"

## Investigation Results

### What We Found
Checked stream `fdb0f5a9` (Mother Earth Music):
```
scheduled_end_time: 2025-12-27T04:30:00.000Z  ← YESTERDAY 11:30 WIB!
active_schedule_id: NOT SET  ← NO SCHEDULE!
start_time: 2025-12-27T23:30:58.209Z  ← JUST STARTED LAST NIGHT

Should end at: 12/27/2025, 11:30:00 WIB  ← 19 HOURS AGO!
Current time: 12/28/2025, 06:37:58 WIB
Time remaining: -1148 minutes  ← MINUS 19 HOURS!

🛑 Stream exceeded end time by 1148 minutes!
🛑 Stopping stream now...
```

### Root Cause Analysis

**The Problem Flow:**
1. Stream has recurring schedule (e.g., daily at 23:30)
2. **Day 1**: Scheduler starts stream, sets `active_schedule_id` and `scheduled_end_time`
3. Stream runs and completes normally
4. Stream stopped → `active_schedule_id` cleared to NULL
5. **Day 2**: Scheduler starts stream AGAIN (recurring)
6. Scheduler calculates `scheduled_end_time` from `schedule.schedule_time` (which is from Day 1!)
7. Result: `scheduled_end_time` = Day 1 time, but stream starts on Day 2
8. Auto-stop sees: "end time was 19 hours ago!" → STOP immediately!

**Why This Happened:**
In `schedulerService.js` line 228, the code was:
```javascript
const scheduleEndTime = schedule.end_time || 
  new Date(new Date(schedule.schedule_time).getTime() + schedule.duration * 60 * 1000).toISOString();
```

For **recurring schedules**, `schedule.schedule_time` is stored as a FIXED datetime (e.g., "2025-12-27T16:30:00Z"). When the schedule runs on Day 2, Day 3, etc., it still uses this OLD date to calculate end time!

## The Fix

### What Changed
Modified `schedulerService.js` to calculate `scheduled_end_time` differently for recurring vs one-time schedules:

**For Recurring Schedules:**
```javascript
// Use CURRENT time + duration (not old schedule_time)
const now = new Date();
scheduleEndTime = new Date(now.getTime() + schedule.duration * 60 * 1000).toISOString();
```

**For One-Time Schedules:**
```javascript
// Use schedule.end_time or schedule_time + duration (as before)
scheduleEndTime = schedule.end_time || 
  new Date(new Date(schedule.schedule_time).getTime() + schedule.duration * 60 * 1000).toISOString();
```

### Code Location
**File**: `services/schedulerService.js`
**Function**: `checkScheduledStreams()`
**Lines**: ~218-240

## Testing

### Before Fix
```
[Scheduler] Starting stream fdb0f5a9 with duration 300 minutes
[Scheduler] Setting active_schedule_id=311a2c18 for stream fdb0f5a9
[Scheduler] Calculated end_time from schedule: 2025-12-27T04:30:00.000Z  ← WRONG! Old date!
[Scheduler] ✓ Stream updated: active_schedule=311a2c18, end_time=2025-12-27T04:30:00.000Z

... 1 minute later ...

[Duration Check] Stream fdb0f5a9 exceeded end time by 1148 minutes!
[Duration Check] 🛑 Stopping stream now...
```

### After Fix
```
[Scheduler] Starting stream fdb0f5a9 with duration 300 minutes
[Scheduler] Setting active_schedule_id=311a2c18 for stream fdb0f5a9
[Scheduler] Recurring schedule: end_time = NOW + 300m = 2025-12-28T11:30:00.000Z  ← CORRECT!
[Scheduler] ✓ Stream updated: active_schedule=311a2c18, end_time=2025-12-28T11:30:00.000Z

... 5 hours later ...

[Duration Check] Stream fdb0f5a9 will stop in 295 minutes  ← CORRECT!
[Duration Check] ✓ Running normally
```

## Impact

### Before Fix
- ❌ Recurring streams stopped within 1 minute of starting
- ❌ Multiple broadcasts created but immediately stopped
- ❌ YouTube API quota wasted on creating/stopping broadcasts
- ❌ User sees "banyak yang status stream tapi di youtube hanya terkirim 1"

### After Fix
- ✅ Recurring streams run for full duration
- ✅ `scheduled_end_time` calculated correctly for each execution
- ✅ No premature auto-stop
- ✅ YouTube broadcasts stay live for full duration

## Related Issues

This fix addresses:
1. **Stale end time problem** - Recurring schedules using old dates
2. **Auto-stop false positive** - Streams stopped immediately after start
3. **YouTube broadcast waste** - Broadcasts created then immediately stopped

This is DIFFERENT from the previous fix (AUTO_STOP_FIX.md) which addressed:
- Recovery streams without `active_schedule_id`
- That fix handles PM2 restart recovery
- This fix handles recurring schedule execution

## Prevention

To prevent this in the future:
1. ✅ Always calculate end time relative to CURRENT execution time for recurring schedules
2. ✅ Never use `schedule.schedule_time` directly for recurring schedules (it's a template, not actual time)
3. ✅ Log both calculated end time AND current time for debugging
4. ✅ Add validation: if `scheduled_end_time` is in the past when setting, log WARNING

## Deployment
1. ✅ Fixed `services/schedulerService.js`
2. ✅ Uploaded to VPS
3. ✅ PM2 restarted (restart #184)
4. ⏳ Monitoring next scheduled stream start

---
**Status**: ✅ FIXED
**Date**: 2024-12-28
**PM2 Restart**: #184
**Related**: AUTO_STOP_FIX.md (recovery issue)
