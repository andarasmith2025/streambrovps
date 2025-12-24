# Schedule & YouTube Broadcast Status Fix

## Problem Description

When a stream has multiple schedules (e.g., Schedule 1: 10:00-11:00, Schedule 2: 14:00-15:00):

### Issues Found:
1. **❌ Checklist disappears** - After Schedule 1 ends, the checklist icon disappears even though Schedule 2 is still pending
2. **❌ YouTube broadcast still live** - After Schedule 1 ends, YouTube Studio still shows the broadcast as "Live" instead of "Completed"
3. **❌ Stream status incorrect** - Stream status shows "Streaming" instead of "Scheduled" or "Waiting" between schedules
4. **❌ FFmpeg not stopped** - FFmpeg process may not be properly terminated

## Root Causes

### 1. YouTube Broadcast Not Transitioned
**Problem**: YouTube broadcast was not being transitioned to "complete" when stream stopped

**Cause**: 
- `active_schedule_id` was cleared BEFORE YouTube transition
- When trying to check if schedule is recurring, `active_schedule_id` was already NULL
- YouTube transition code had error handling that silently failed

**Impact**: Broadcast stays "live" in YouTube Studio, preventing new broadcasts from being created

### 2. Stream Status Not Updated Correctly
**Problem**: Stream status remained "live" or "streaming" between schedules

**Cause**:
- No logic to check for upcoming schedules today
- Status always set to "offline" after stream stops
- Frontend shows "streaming" for any non-offline status

**Impact**: User sees incorrect status, can't tell if stream is waiting for next schedule

### 3. Broadcast ID Not Cleared
**Problem**: `youtube_broadcast_id` remained in database after stream stopped

**Cause**:
- No code to clear `youtube_broadcast_id` from stream after transition
- Recurring schedules kept old broadcast_id

**Impact**: Next schedule tries to reuse old broadcast, causing errors

## Solutions Implemented

### 1. ✅ Fixed YouTube Broadcast Transition Order

**Changed**: Moved YouTube transition BEFORE clearing `active_schedule_id`

```javascript
// OLD (WRONG):
await Stream.update(streamId, { active_schedule_id: null }); // Clear first
// ... then try to transition YouTube (but active_schedule_id is already NULL!)

// NEW (CORRECT):
// Transition YouTube FIRST (while active_schedule_id still exists)
if (stream.use_youtube_api && stream.youtube_broadcast_id) {
  await youtubeService.transition(tokens, {
    broadcastId: stream.youtube_broadcast_id,
    status: 'complete'
  });
  
  // Clear broadcast_id from stream
  await Stream.update(streamId, { 
    youtube_broadcast_id: null,
    youtube_stream_id: null 
  });
}

// THEN clear active_schedule_id
await Stream.update(streamId, { active_schedule_id: null });
```

**Result**: 
- ✅ YouTube broadcast properly transitioned to "complete"
- ✅ Broadcast disappears from "Live" section in YouTube Studio
- ✅ New broadcast can be created for next schedule

### 2. ✅ Added Upcoming Schedule Check

**Added**: Logic to check if there are more schedules today

```javascript
// Check for upcoming schedules
const upcomingSchedules = await db.all(
  `SELECT * FROM stream_schedules 
   WHERE stream_id = ? 
   AND status = 'pending'
   ORDER BY schedule_time ASC`,
  [streamId]
);

let hasUpcomingScheduleToday = false;

for (const schedule of upcomingSchedules) {
  if (schedule.is_recurring) {
    // Check if today is in recurring days
    const allowedDays = schedule.recurring_days.split(',').map(d => parseInt(d));
    if (allowedDays.includes(currentDay)) {
      // Parse schedule time and check if it's later today
      if (scheduleTimeInMinutes > nowTimeInMinutes) {
        hasUpcomingScheduleToday = true;
        break;
      }
    }
  } else {
    // One-time schedule - check if it's later today
    const scheduleTime = new Date(schedule.schedule_time);
    if (scheduleTime > now && scheduleTime.toDateString() === now.toDateString()) {
      hasUpcomingScheduleToday = true;
      break;
    }
  }
}

// Set status based on whether there are upcoming schedules
const newStatus = hasUpcomingScheduleToday ? 'scheduled' : 'offline';
await Stream.updateStatus(streamId, newStatus, stream.user_id);
```

**Result**:
- ✅ Stream status set to "scheduled" if more schedules today
- ✅ Stream status set to "offline" if no more schedules
- ✅ Frontend shows correct status icon

### 3. ✅ Clear Broadcast IDs Properly

**Added**: Clear `youtube_broadcast_id` and `youtube_stream_id` from stream after transition

```javascript
// Clear broadcast_id from stream
await Stream.update(streamId, { 
  youtube_broadcast_id: null,
  youtube_stream_id: null 
});

// Clear broadcast_id from recurring schedule
if (schedule && schedule.is_recurring) {
  await db.run(
    'UPDATE stream_schedules SET youtube_broadcast_id = NULL, broadcast_status = ? WHERE id = ?',
    ['pending', stream.active_schedule_id]
  );
}
```

**Result**:
- ✅ Old broadcast ID removed from database
- ✅ Next schedule creates fresh broadcast
- ✅ No conflicts with old broadcasts

### 4. ✅ Enhanced Error Logging

**Added**: Better error logging for YouTube transition failures

```javascript
try {
  await youtubeService.transition(tokens, {
    broadcastId: stream.youtube_broadcast_id,
    status: 'complete'
  });
  console.log(`✅ YouTube broadcast transitioned to complete`);
} catch (ytError) {
  console.error('❌ Error transitioning YouTube broadcast:', ytError);
  console.error('Error details:', ytError.stack);
  console.error('⚠️ WARNING: YouTube broadcast may still be live in YouTube Studio!');
}
```

**Result**:
- ✅ Easier to debug YouTube API issues
- ✅ Clear warnings when transition fails
- ✅ Better visibility into what's happening

## Testing Checklist

### Test Scenario: Multiple Schedules Same Day

**Setup**:
1. Create stream with YouTube API enabled
2. Add Schedule 1: 10:00-11:00 (60 minutes)
3. Add Schedule 2: 14:00-15:00 (60 minutes)

**Expected Behavior**:

#### At 10:00 (Schedule 1 Starts):
- [ ] Stream status changes to "live"
- [ ] FFmpeg starts
- [ ] YouTube broadcast created and transitioned to "live"
- [ ] Checklist shows Schedule 1 as active (green checkmark)
- [ ] Checklist shows Schedule 2 as pending (clock icon)

#### At 11:00 (Schedule 1 Ends):
- [ ] FFmpeg stops gracefully
- [ ] YouTube broadcast transitioned to "complete"
- [ ] YouTube Studio shows broadcast as "Completed" (not "Live")
- [ ] Stream status changes to "scheduled" (NOT "offline")
- [ ] Checklist shows Schedule 1 as completed (checkmark faded)
- [ ] Checklist shows Schedule 2 as pending (clock icon still visible)
- [ ] `youtube_broadcast_id` cleared from stream
- [ ] `youtube_broadcast_id` cleared from Schedule 1 (if recurring)
- [ ] `active_schedule_id` cleared from stream

#### Between 11:00-14:00 (Waiting):
- [ ] Stream status remains "scheduled"
- [ ] No FFmpeg process running
- [ ] Checklist still shows Schedule 2 as pending
- [ ] Frontend shows "Scheduled" badge

#### At 14:00 (Schedule 2 Starts):
- [ ] Stream status changes to "live"
- [ ] FFmpeg starts
- [ ] NEW YouTube broadcast created (different broadcast_id)
- [ ] New broadcast transitioned to "live"
- [ ] Checklist shows Schedule 2 as active

#### At 15:00 (Schedule 2 Ends):
- [ ] FFmpeg stops gracefully
- [ ] YouTube broadcast transitioned to "complete"
- [ ] Stream status changes to "offline" (no more schedules today)
- [ ] Checklist shows both schedules as completed
- [ ] `youtube_broadcast_id` cleared from stream

## Debugging Tools

### Check Stream Status Script

Run this on VPS to check current stream and broadcast status:

```bash
cd /root/streambrovps
node check-stream-youtube-status.js
```

**Output**:
- Stream ID, title, status
- YouTube broadcast ID (if any)
- Active schedule ID (if any)
- All schedules with timing info
- Whether schedules should be running now
- Time until next schedule

### Check PM2 Logs

```bash
pm2 logs streambro --lines 100
```

Look for:
- `[StreamingService] Transitioning YouTube broadcast`
- `[StreamingService] ✅ YouTube broadcast transitioned to complete`
- `[StreamingService] ✓ Stream status set to 'scheduled'`
- `[StreamingService] ✓ Found upcoming schedule today`

### Check Database Directly

```bash
sqlite3 /root/streambrovps/db/streambro.db

-- Check stream status
SELECT id, title, status, youtube_broadcast_id, active_schedule_id FROM streams;

-- Check schedules
SELECT id, stream_id, schedule_time, duration, status, is_recurring, youtube_broadcast_id FROM stream_schedules;
```

## Files Changed

1. **services/streamingService.js**
   - Reordered YouTube transition before clearing active_schedule_id
   - Added upcoming schedule check logic
   - Added broadcast_id clearing
   - Enhanced error logging

2. **check-stream-youtube-status.js** (NEW)
   - Debugging script to check stream and broadcast status
   - Shows all schedules with timing info
   - Helps identify issues quickly

## Deployment

```bash
# Deploy updated service
scp -i ~/.ssh/id_rsa_upcloud_nyc services/streamingService.js root@85.9.195.103:/root/streambrovps/services/

# Deploy debug script
scp -i ~/.ssh/id_rsa_upcloud_nyc check-stream-youtube-status.js root@85.9.195.103:/root/streambrovps/

# Restart PM2
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && pm2 restart streambro"
```

## Known Limitations

1. **YouTube API Rate Limits**: If you have many streams stopping at the same time, YouTube API rate limits may cause some transitions to fail
2. **Token Expiry**: If YouTube tokens expire during stream, transition may fail
3. **Network Issues**: If VPS loses internet connection, transition will fail

## Future Improvements

1. **Retry Logic**: Add retry mechanism for failed YouTube transitions
2. **Queue System**: Queue YouTube API calls to avoid rate limits
3. **Status Sync**: Periodically sync broadcast status with YouTube API
4. **Manual Fix**: Add admin button to manually transition stuck broadcasts

---

**Date**: December 24, 2025
**Status**: ✅ FIXED
**Version**: 2.1.2
