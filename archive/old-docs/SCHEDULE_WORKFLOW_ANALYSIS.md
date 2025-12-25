# Schedule Workflow Analysis & Issues

## Expected Workflow

### Scenario: 2 Schedules in One Day
- **Schedule A**: 06:00 AM - 11:00 AM (5 hours)
- **Schedule B**: 18:00 PM - 23:00 PM (5 hours)

### Expected Behavior:

#### 1. Before Schedule A Starts (05:50 AM)
- Stream status: `scheduled`
- Active schedule: `null`
- YouTube broadcast: Not created yet
- Checklist: Shows Schedule A (upcoming in 10 minutes)

#### 2. Schedule A Starts (06:00 AM)
- Stream status: `live` or `streaming`
- Active schedule: Schedule A ID
- YouTube broadcast: Created and transitioned to `live`
- FFmpeg: Started streaming
- Checklist: Shows Schedule A (currently active)

#### 3. Schedule A Running (06:00 AM - 11:00 AM)
- Stream status: `live` or `streaming`
- Active schedule: Schedule A ID
- YouTube broadcast: Live
- FFmpeg: Running
- Checklist: Shows Schedule A with countdown

#### 4. Schedule A Ends (11:00 AM) - CRITICAL POINT
**This is where the problem occurs!**

Expected:
- FFmpeg: Stopped (SIGTERM sent)
- YouTube broadcast: Transitioned to `complete` via API
- YouTube Studio: Broadcast should show as "Ended" and VOD created
- Active schedule: Cleared to `null`
- Stream status: Changed to `scheduled` (because Schedule B exists today)
- Checklist: Should disappear (no active schedule)
- Schedule A: Status changed to `completed`

#### 5. Between Schedules (11:00 AM - 18:00 PM)
- Stream status: `scheduled` (waiting for Schedule B)
- Active schedule: `null`
- YouTube broadcast: `null` (previous one completed)
- FFmpeg: Not running
- Checklist: Should be empty OR show Schedule B as "upcoming"

#### 6. Schedule B Starts (18:00 PM)
- Stream status: `live` or `streaming`
- Active schedule: Schedule B ID
- YouTube broadcast: NEW broadcast created and transitioned to `live`
- FFmpeg: Started streaming
- Checklist: Shows Schedule B (currently active)

## Current Issues

### Issue 1: YouTube Broadcast Not Stopped
**Problem**: When Schedule A ends, YouTube broadcast is NOT transitioned to `complete`

**Evidence**:
- User reports: "di youtube studio streaming A tidak benar2 stop masih ada dan jalan"
- This means FFmpeg stopped but YouTube API transition failed

**Possible Causes**:
1. YouTube API transition throws error (not caught properly)
2. Token expired during transition
3. Broadcast ID is invalid or already completed
4. Network error during API call

**Impact**:
- YouTube Studio shows stream as "Live" even though FFmpeg stopped
- No VOD created automatically
- Viewers see "Stream offline" but broadcast still listed as live
- Next schedule cannot create new broadcast (conflict)

### Issue 2: Stream Status Not Updated Correctly
**Problem**: Stream status remains `streaming` instead of changing to `scheduled`

**Evidence**:
- User reports: "status masih streaming"
- Should be `scheduled` when waiting for Schedule B

**Possible Causes**:
1. `stopStream()` function not called when schedule ends
2. Status update logic fails
3. `hasUpcomingScheduleToday` check not working correctly

**Impact**:
- UI shows incorrect status
- User confused about stream state
- Auto-start for Schedule B might not work

### Issue 3: Checklist Shows Wrong Schedule
**Problem**: Checklist shows Schedule B while Schedule A is still running

**Evidence**:
- User reports: "chedklist di jadwal B" (while Schedule A should be active)

**Possible Causes**:
1. Frontend checklist logic shows next schedule instead of active
2. `active_schedule_id` not set correctly
3. Time calculation error

**Impact**:
- User sees wrong information
- Cannot monitor correct schedule progress

## Code Analysis

### stopStream() Function (services/streamingService.js)

The code LOOKS correct:

```javascript
// 1. Transition YouTube broadcast BEFORE clearing active_schedule_id
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

// 2. Clear active_schedule_id
await Stream.update(streamId, { active_schedule_id: null });

// 3. Check for upcoming schedules today
const hasUpcomingScheduleToday = // ... logic to check

// 4. Set status based on upcoming schedules
const newStatus = hasUpcomingScheduleToday ? 'scheduled' : 'offline';
await Stream.updateStatus(streamId, newStatus, stream.user_id);
```

**But the issue is**: This code is in `stopStream()` which is called when:
- User manually stops stream
- FFmpeg process exits

**The question is**: Is `stopStream()` being called when schedule ends automatically?

## Root Cause Investigation Needed

### 1. Check if stopStream() is Called on Schedule End

Need to check:
- `schedulerService.js` - Does it call `stopStream()` when schedule duration ends?
- Or does it just kill FFmpeg and expect exit handler to do cleanup?

### 2. Check YouTube API Transition Errors

Need to add more logging:
- Log every step of YouTube transition
- Catch and log specific error types
- Check if tokens are valid before transition

### 3. Check Schedule End Detection

Need to verify:
- How does system detect schedule has ended?
- Is it based on duration calculation?
- Is there a cron job checking schedule end times?

## Recommended Fixes

### Fix 1: Add Comprehensive Logging

Add detailed logs to track:
```javascript
console.log('[StreamingService] ========== STOPPING STREAM ==========');
console.log('[StreamingService] Stream ID:', streamId);
console.log('[StreamingService] Use YouTube API:', stream.use_youtube_api);
console.log('[StreamingService] Broadcast ID:', stream.youtube_broadcast_id);
console.log('[StreamingService] Active Schedule:', stream.active_schedule_id);

// Before YouTube transition
console.log('[StreamingService] Starting YouTube broadcast transition...');

// After YouTube transition
console.log('[StreamingService] YouTube transition result:', result);

// After status update
console.log('[StreamingService] New status:', newStatus);
console.log('[StreamingService] ========== STOP COMPLETE ==========');
```

### Fix 2: Add Error Recovery

If YouTube transition fails:
```javascript
try {
  await youtubeService.transition(tokens, {
    broadcastId: stream.youtube_broadcast_id,
    status: 'complete'
  });
} catch (ytError) {
  console.error('[StreamingService] YouTube transition failed:', ytError);
  
  // Try alternative: Delete broadcast instead of completing
  try {
    await youtubeService.deleteBroadcast(tokens, stream.youtube_broadcast_id);
    console.log('[StreamingService] Broadcast deleted as fallback');
  } catch (deleteError) {
    console.error('[StreamingService] Fallback delete also failed:', deleteError);
  }
  
  // Still clear broadcast_id from database
  await Stream.update(streamId, { 
    youtube_broadcast_id: null,
    youtube_stream_id: null 
  });
}
```

### Fix 3: Verify Schedule End Detection

Ensure scheduler properly detects schedule end:
```javascript
// In schedulerService.js or wherever schedule end is detected
const now = new Date();
const scheduleEndTime = new Date(schedule.schedule_time);
scheduleEndTime.setMinutes(scheduleEndTime.getMinutes() + schedule.duration_minutes);

if (now >= scheduleEndTime) {
  console.log(`[Scheduler] Schedule ${schedule.id} has ended, stopping stream...`);
  await streamingService.stopStream(schedule.stream_id);
}
```

### Fix 4: Add Manual Broadcast Cleanup Endpoint

Create endpoint to manually clean up stuck broadcasts:
```javascript
// POST /api/streams/:id/cleanup-broadcast
router.post('/:id/cleanup-broadcast', async (req, res) => {
  const stream = await Stream.findById(req.params.id);
  
  if (stream.youtube_broadcast_id) {
    try {
      await youtubeService.transition(tokens, {
        broadcastId: stream.youtube_broadcast_id,
        status: 'complete'
      });
      
      await Stream.update(stream.id, {
        youtube_broadcast_id: null,
        youtube_stream_id: null
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
});
```

## Testing Plan

### Test Case 1: Normal Schedule Completion
1. Create stream with 2 schedules (5 minutes apart for testing)
2. Let Schedule A start automatically
3. Wait for Schedule A to end
4. Verify:
   - FFmpeg stopped
   - YouTube broadcast transitioned to complete
   - YouTube Studio shows "Ended"
   - Stream status = `scheduled`
   - Active schedule = `null`
   - Checklist empty or shows Schedule B as upcoming

### Test Case 2: YouTube API Failure
1. Create stream with YouTube API
2. Start schedule
3. Invalidate YouTube token (or simulate API error)
4. Let schedule end
5. Verify:
   - Error logged properly
   - Fallback cleanup executed
   - Stream status still updated correctly
   - Database cleaned up

### Test Case 3: Multiple Schedules Same Day
1. Create stream with 3 schedules in one day
2. Let all schedules run
3. Verify each transition:
   - Schedule 1 ends → status = `scheduled`
   - Schedule 2 starts → status = `live`
   - Schedule 2 ends → status = `scheduled`
   - Schedule 3 starts → status = `live`
   - Schedule 3 ends → status = `offline`

## Next Steps

1. **Add comprehensive logging** to track exact failure point
2. **Monitor logs** during next schedule execution
3. **Identify specific error** causing YouTube transition failure
4. **Implement fix** based on error type
5. **Test thoroughly** with multiple schedules
6. **Add monitoring** to alert when broadcasts stuck in live state

## Questions for User

1. When Schedule A ended, did you see any error in the logs?
2. Did you check YouTube Studio immediately after Schedule A ended?
3. Was the broadcast showing as "Live" with no viewers?
4. Did you have to manually end the broadcast in YouTube Studio?
5. What was the stream status in StreamBro dashboard when Schedule A ended?
