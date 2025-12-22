# How to Fix Auto Start & Auto Stop for Existing Broadcasts

## Problem
Old broadcasts created before the fix have Auto Start & Auto Stop = OFF.  
This causes broadcasts to stuck in "ready" state and need manual "Go Live".

## Solution: Use Bulk Edit

### Steps:

1. **Go to YouTube Manage Tab**
   - Navigate to: https://streambro2.nivarastudio.site/youtube/manage

2. **Filter Upcoming Broadcasts**
   - Status dropdown → Select "Upcoming"

3. **Select All Broadcasts**
   - Click "Select all" checkbox

4. **Open Bulk Edit**
   - Click "Bulk Edit" button (blue)

5. **Enable Auto Start & Auto Stop**
   - Auto Start → Select "Enable"
   - Auto Stop → Select "Enable"
   - Leave other fields empty (to keep existing values)

6. **Apply Changes**
   - Click "Apply Changes"
   - Wait for progress indicator to complete
   - Check success/failure count

### Result:
- ✅ All upcoming broadcasts now have Auto Start & Auto Stop enabled
- ✅ Broadcasts will automatically go live when stream starts
- ✅ Broadcasts will automatically complete when stream ends
- ✅ VOD processing starts faster

## Default Behavior (Already in Code)

**New broadcasts created via API:**
- Auto Start = TRUE (default)
- Auto Stop = TRUE (default)

**User can disable if needed:**
- Via individual Edit modal
- Via Bulk Edit (select "Disable")

## Why This Happens

Broadcasts created before the fix (commit a253ba5) have these settings OFF by default.  
The fix only applies to NEW broadcasts created after deployment.

## Alternative: Manual Fix per Broadcast

If you only want to fix specific broadcasts:

1. Go to YouTube Manage
2. Click Edit button on broadcast
3. Check "Auto Start" checkbox
4. Check "Auto End" checkbox
5. Click "Save"

## Verification

After bulk edit, check YouTube Studio:
1. Go to YouTube Studio → Content → Live
2. Click on a broadcast
3. Check "Stream settings"
4. Should see:
   - ✅ Auto-start: On
   - ✅ Auto-stop: On
