# YouTube API vs Manual RTMP Separation

## Overview
Clean separation between Manual RTMP tab and YouTube API tab to prevent confusion and duplicate broadcast creation.

## Problem Statement
Previously, both Manual RTMP and YouTube API tabs had "Load" button to fetch stream keys from YouTube channel. This caused:
1. **Confusion**: Users didn't understand the difference between the two tabs
2. **Redundancy**: Manual RTMP "Load" feature was redundant - just copying stream key without creating broadcast
3. **Risk**: Potential for duplicate broadcast creation if users misunderstood the tabs

## User Stories

### US-1: Manual RTMP Tab - Pure Manual Input
**As a** streamer  
**I want** Manual RTMP tab to be pure manual input only  
**So that** I can enter stream keys from any platform without YouTube API integration

**Acceptance Criteria:**
- ✅ Manual RTMP tab has NO "Load" button
- ✅ Stream key input is manual text entry only
- ✅ Helper text explains where to get stream key
- ✅ No YouTube API calls are made from Manual RTMP tab
- ✅ No broadcast creation happens with Manual RTMP

### US-2: YouTube API Tab - Full Integration
**As a** streamer with YouTube channel connected  
**I want** YouTube API tab to load stream keys from my channel  
**So that** I can create broadcasts automatically via API

**Acceptance Criteria:**
- ✅ YouTube API tab has "Load" button to fetch stream keys
- ✅ Selecting from list creates broadcast with YouTube Stream ID
- ✅ Manual input in YouTube API tab is also allowed (no broadcast creation)
- ✅ Clear distinction between "load from list" vs "manual input"

### US-3: Clear Tab Distinction
**As a** user  
**I want** clear understanding of the difference between tabs  
**So that** I know when broadcasts are created and when they're not

**Acceptance Criteria:**
- ✅ Manual RTMP: No YouTube API integration, no broadcast creation
- ✅ YouTube API: Full integration, optional broadcast creation
- ✅ Helper text explains the difference
- ✅ No confusion about which tab to use

## Technical Implementation

### Changes Made

#### 1. Manual RTMP Component (`views/partials/modals/stream-modal-manual-rtmp.ejs`)
**REMOVED:**
- "Load" button next to stream key input
- Dropdown for stream keys list
- All related functions: `toggleManualRTMPStreamKeysDropdown()`, `loadManualRTMPStreamKeys()`, etc.

**ADDED:**
- Helper text: "Get your stream key from your platform's dashboard (YouTube Studio, Facebook Live, etc.)"
- Clean, simple manual input field

#### 2. YouTube API Component (`views/partials/modals/stream-modal-youtube-api.ejs`)
**KEPT:**
- "Load" button to fetch stream keys from YouTube channel
- Dropdown with stream keys list
- All related functions for loading and selecting streams

**BEHAVIOR:**
- If user selects from list → YouTube Stream ID is set → broadcast created
- If user inputs manually → No YouTube Stream ID → no broadcast created

### Backend Logic (`app.js`)

```javascript
// Stream creation endpoint
if (useYouTubeAPI === true && platform === 'YouTube') {
  if (youtubeStreamId) {
    // User selected from list → create broadcast
    const broadcast = await youtubeService.createBroadcast(...);
  } else {
    // User input manually → no broadcast creation
    // Just use the RTMP URL and stream key provided
  }
}
```

### Frontend Validation (`views/dashboard.ejs`)

```javascript
// Detect which tab is active
const youtubeRtmpUrl = document.getElementById('youtubeRtmpUrl');
const isYouTubeMode = youtubeRtmpUrl && youtubeRtmpUrl.value && youtubeRtmpUrl.value.trim() !== '';

if (isYouTubeMode) {
  // YouTube API mode
  formData.useYouTubeAPI = true;
  formData.youtubeStreamId = document.getElementById('youtubeStreamId')?.value || null;
} else {
  // Manual RTMP mode
  formData.useYouTubeAPI = false;
  // No youtubeStreamId needed
}
```

## Testing Checklist

### Manual RTMP Tab
- [ ] No "Load" button visible
- [ ] Stream key input is manual only
- [ ] Helper text is displayed
- [ ] Can create stream successfully
- [ ] No YouTube API calls in network tab
- [ ] No broadcast created on YouTube

### YouTube API Tab
- [ ] "Load" button is visible
- [ ] Can load stream keys from channel
- [ ] Can select from list → broadcast created
- [ ] Can input manually → no broadcast created
- [ ] Cache works (5 minutes)
- [ ] Refresh button works

### Edit Modal
- [ ] Same behavior as New Stream Modal
- [ ] Manual RTMP: no Load button
- [ ] YouTube API: has Load button

## Benefits

1. **Clarity**: Clear separation between manual and API modes
2. **No Redundancy**: Each tab has distinct purpose
3. **No Confusion**: Users understand when broadcasts are created
4. **Cleaner Code**: Removed unnecessary functions from Manual RTMP
5. **Better UX**: Simpler interface, less cognitive load

## Migration Notes

**For existing users:**
- Manual RTMP tab now requires manual stream key entry
- YouTube API tab still has Load feature
- No breaking changes to existing streams
- All existing streams continue to work

## Related Files

- `views/partials/modals/stream-modal-manual-rtmp.ejs` - Manual RTMP component (Load button removed)
- `views/partials/modals/stream-modal-youtube-api.ejs` - YouTube API component (Load button kept)
- `views/partials/modals/new-stream-modal.ejs` - New stream modal (uses both components)
- `views/partials/modals/edit-stream-modal.ejs` - Edit stream modal (uses both components)
- `public/js/stream-modal.js` - Modal functions (Manual RTMP functions can be removed)
- `app.js` - Backend stream creation logic
- `views/dashboard.ejs` - Form submission and validation

## Next Steps

1. ✅ Remove Load button from Manual RTMP component
2. [ ] Clean up unused JavaScript functions for Manual RTMP Load
3. [ ] Test both tabs thoroughly
4. [ ] Deploy to server 2
5. [ ] Update user documentation
6. [ ] Monitor for any issues

## Status: In Progress

**Last Updated:** December 23, 2025
