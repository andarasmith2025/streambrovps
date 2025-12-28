# Edit Modal Schedule Not Populating - Debug Guide

## Problem
When opening edit modal for a stream with schedules, the schedule slots are not appearing.

## Expected Behavior
1. User clicks "Edit" button on a stream
2. Edit modal opens
3. Modal switches to correct tab (YouTube API or Manual RTMP)
4. Schedule slots are populated with existing schedules from database
5. Thumbnail preview shows if custom thumbnail was uploaded

## Current Code Flow
```javascript
// views/dashboard.ejs line ~2256
function openEditStreamModal(stream) {
  // 1. Open modal
  modal.classList.remove('hidden');
  modal.classList.add('active');
  
  // 2. Switch to correct tab (50ms delay)
  setTimeout(() => {
    switchStreamTab('youtube'); // or 'manual'
    
    // 3. Populate YouTube fields (100ms delay)
    setTimeout(() => {
      populateEditYouTubeAPIFields(stream);
      
      // 4. Load schedules
      loadStreamSchedules(stream.id);
    }, 100);
  }, 50);
}

// views/dashboard.ejs line ~3487
async function loadStreamSchedules(streamId) {
  // Fetch schedules from API
  const response = await fetch(`/api/streams/${streamId}/schedules`);
  const data = await response.json();
  
  // Get container
  const container = document.getElementById('editScheduleSlotsContainer');
  
  if (!container) {
    console.error('[loadStreamSchedules] Container #editScheduleSlotsContainer not found!');
    return;
  }
  
  // Clear and populate
  container.innerHTML = '';
  data.schedules.forEach(schedule => {
    // Create slot HTML and append
  });
}
```

## Possible Issues

### Issue 1: Container Not Found
**Symptom**: Console shows "Container #editScheduleSlotsContainer not found!"

**Cause**: The container might not be rendered yet when `loadStreamSchedules` is called.

**Solution**: Add longer delay or check if container exists before calling:
```javascript
setTimeout(() => {
  populateEditYouTubeAPIFields(stream);
  
  // Wait for DOM to fully render
  setTimeout(() => {
    const container = document.getElementById('editScheduleSlotsContainer');
    if (container) {
      loadStreamSchedules(stream.id);
    } else {
      console.error('[Edit Modal] Schedule container not found, retrying...');
      setTimeout(() => loadStreamSchedules(stream.id), 200);
    }
  }, 200); // Increased from 100ms
}, 50);
```

### Issue 2: Tab Not Switched
**Symptom**: Container exists but is hidden (display: none)

**Cause**: `switchStreamTab()` might not have completed before `loadStreamSchedules` is called.

**Solution**: Ensure tab switch completes before loading schedules:
```javascript
// In switchStreamTab function, add callback
function switchStreamTab(tab, callback) {
  // ... existing code ...
  
  // After tab switch completes
  if (callback && typeof callback === 'function') {
    setTimeout(callback, 50);
  }
}

// Then in openEditStreamModal:
switchStreamTab('youtube', () => {
  populateEditYouTubeAPIFields(stream);
  loadStreamSchedules(stream.id);
});
```

### Issue 3: API Returns Empty
**Symptom**: No error in console, but no slots appear

**Cause**: API might be returning empty array or error.

**Debug**: Check browser console for:
```
[loadStreamSchedules] API response: {...}
[loadStreamSchedules] Found X schedules
```

If you see "No schedules found", the API is returning empty. Check:
1. Stream ID is correct
2. Schedules exist in database for this stream
3. API endpoint `/api/streams/:id/schedules` is working

### Issue 4: Thumbnail Not Showing
**Symptom**: Schedules load but thumbnail doesn't appear

**Cause**: `populateEditYouTubeAPIFields()` might not be finding thumbnail elements.

**Debug**: Check console for:
```
[populateEditYouTubeAPIFields] Loaded existing thumbnail: /uploads/...
```

If not present, check:
1. `stream.youtube_thumbnail_path` or `stream.video_thumbnail` has value
2. Elements exist: `editYoutubeThumbnailPreview`, `editYoutubeThumbnailImg`
3. Image path is correct and accessible

## Testing Steps

### Step 1: Check Console Logs
Open browser DevTools (F12) and look for these logs when opening edit modal:
```
[Edit Modal] Stream data: {...}
[Edit Modal] ✅ Switching to YouTube API tab
[Edit Modal] Calling switchStreamTab("youtube")
[Edit Modal] Calling populateEditYouTubeAPIFields()
[populateEditYouTubeAPIFields] Populating fields with: {...}
[Edit Modal] Loading schedules for stream: <stream_id>
[loadStreamSchedules] Starting to load schedules for stream: <stream_id>
[loadStreamSchedules] API response: {...}
[loadStreamSchedules] Found X schedules
[loadStreamSchedules] Container found, clearing existing slots
[loadStreamSchedules] Processing schedule 1: {...}
[loadStreamSchedules] All schedules rendered, attaching listeners
[loadStreamSchedules] ✅ Successfully loaded schedules
```

### Step 2: Check API Response
In browser DevTools Network tab:
1. Open edit modal
2. Look for request to `/api/streams/<id>/schedules`
3. Check response - should return:
```json
{
  "success": true,
  "schedules": [
    {
      "id": 123,
      "stream_id": "...",
      "schedule_time": "2024-12-28T12:45:00.000Z",
      "duration": 60,
      "is_recurring": 1,
      "recurring_days": "0,1,2,3,4,5,6",
      "status": "pending"
    }
  ]
}
```

### Step 3: Check DOM Elements
In browser DevTools Console:
```javascript
// Check if container exists
document.getElementById('editScheduleSlotsContainer')

// Check if it's visible
const container = document.getElementById('editScheduleSlotsContainer');
console.log('Container:', container);
console.log('Display:', window.getComputedStyle(container).display);
console.log('Visibility:', window.getComputedStyle(container).visibility);

// Check if slots were added
console.log('Slots:', container.querySelectorAll('.schedule-slot').length);
```

### Step 4: Manual Test
1. Create a new stream with YouTube API mode
2. Add 1-2 schedule slots
3. Save stream
4. Immediately click "Edit" on that stream
5. Check if schedules appear in edit modal

## Quick Fix (Temporary)
If schedules still don't load, add this to `views/dashboard.ejs` after line ~2370:

```javascript
// TEMPORARY FIX: Force reload schedules after longer delay
setTimeout(() => {
  console.log('[Edit Modal] Force reloading schedules...');
  loadStreamSchedules(stream.id);
}, 500);
```

## Permanent Fix
The proper fix is to ensure the modal and tab are fully rendered before loading schedules. This requires:
1. Making `switchStreamTab()` return a Promise or accept a callback
2. Waiting for tab switch to complete
3. Then loading schedules

Or use MutationObserver to detect when container becomes visible:
```javascript
function waitForContainer(containerId, callback) {
  const container = document.getElementById(containerId);
  if (container && window.getComputedStyle(container).display !== 'none') {
    callback(container);
    return;
  }
  
  const observer = new MutationObserver(() => {
    const container = document.getElementById(containerId);
    if (container && window.getComputedStyle(container).display !== 'none') {
      observer.disconnect();
      callback(container);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
}

// Usage:
waitForContainer('editScheduleSlotsContainer', (container) => {
  loadStreamSchedules(stream.id);
});
```
