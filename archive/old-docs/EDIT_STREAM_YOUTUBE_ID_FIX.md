# EDIT STREAM - YouTube Stream ID Bug Fix

## Problem Summary
When editing a stream and selecting a YouTube stream from the dropdown, the `youtube_stream_id` was NOT being saved to the database. This caused:
- Broadcast scheduler to use old/invalid stream IDs
- "Stream not found" errors when binding broadcasts to streams
- Duplicate broadcasts created due to retry loop
- Streams not appearing live in YouTube Studio

## Root Cause
**JavaScript Element ID Mismatch**

In `public/js/stream-modal.js`, the function `selectEditYouTubeStreamKey()` was using WRONG element IDs:

```javascript
// ❌ WRONG - These IDs don't exist in edit form
const rtmpUrlInput = document.getElementById('youtubeRtmpUrl');
const streamKeyInput = document.getElementById('youtubeStreamKey');
const streamIdInput = document.getElementById('youtubeStreamId');
```

The edit form HTML uses IDs with 'edit' prefix:
- `editYoutubeRtmpUrl`
- `editYoutubeStreamKey`
- `editYoutubeStreamId`

So the JavaScript was trying to set values on elements that don't exist!

## The Fix

### 1. Fixed Element IDs in stream-modal.js (Line ~2604)
```javascript
// ✅ CORRECT - Use edit form IDs
const rtmpUrlInput = document.getElementById('editYoutubeRtmpUrl');
const streamKeyInput = document.getElementById('editYoutubeStreamKey');
const streamIdInput = document.getElementById('editYoutubeStreamId');
```

### 2. Added Logging to Verify Fix
- **Frontend (stream-modal.js)**: Logs when dropdown selection sets the hidden field
- **Frontend (dashboard.ejs)**: Logs when form submission reads the hidden field
- **Backend (app.js)**: Logs when PUT endpoint receives youtubeStreamId parameter

## How to Test

### Test Edit Stream with Dropdown Selection:
1. Open edit modal for existing stream
2. Switch to "YouTube API" tab
3. Click "Load from Channel" button
4. Select a stream from dropdown
5. Click Save

### Expected Console Logs:
```
[selectEditYouTubeStreamKey] Setting form fields:
  - RTMP URL input found: true
  - Stream Key input found: true
  - Stream ID input found: true
  - Selected stream ID: DM_CmM0o5WN6tkF7bbEeRQ1766531315731955
[selectEditYouTubeStreamKey] ✓ Set editYoutubeStreamId to: DM_CmM0o5WN6tkF7bbEeRQ1766531315731955

[Edit Stream] YouTube API fields:
  - RTMP URL: rtmps://...
  - Stream Key: ***k20t
  - YouTube Stream ID: DM_CmM0o5WN6tkF7bbEeRQ1766531315731955

[PUT /api/streams/:id] EDIT STREAM REQUEST
Stream ID: 9e5a0a53-f545-42f1-bc11-861aae325707
YouTube Stream ID: DM_CmM0o5WN6tkF7bbEeRQ1766531315731955
[UPDATE STREAM] Updated youtube_stream_id for YouTube API stream: DM_CmM0o5WN6tkF7bbEeRQ1766531315731955
```

### Verify Database Update:
```powershell
ssh -i "$env:USERPROFILE\.ssh\id_rsa_upcloud_nyc" root@85.9.195.103 "sqlite3 /root/streambrovps/db/streambro.db \"SELECT id, title, stream_key, youtube_stream_id FROM streams WHERE id='9e5a0a53-f545-42f1-bc11-861aae325707'\""
```

Should show the NEW youtube_stream_id, not the old one.

## Impact

### Before Fix:
- ❌ Edit stream dropdown selection did nothing
- ❌ youtube_stream_id stayed as old/invalid value
- ❌ Broadcast creation failed with "Stream not found"
- ❌ Infinite retry loop creating duplicate broadcasts
- ❌ Stream never went live in YouTube Studio

### After Fix:
- ✅ Edit stream dropdown selection updates youtube_stream_id
- ✅ Database stores correct stream ID from dropdown
- ✅ Broadcast scheduler uses correct stream ID
- ✅ Broadcast binds successfully to stream
- ✅ Stream appears live in YouTube Studio

## Related Files
- `public/js/stream-modal.js` - Fixed element IDs in selectEditYouTubeStreamKey()
- `views/dashboard.ejs` - Added logging to form submission
- `views/partials/modals/edit-stream-modal.ejs` - Contains hidden field definition
- `app.js` - Added logging to PUT endpoint, already had update logic

## Notes
- NEW stream form was already working correctly (uses `youtubeStreamId` without 'edit' prefix)
- Backend was already correctly handling youtubeStreamId parameter
- Only the frontend JavaScript had the wrong element IDs
- This was a simple typo but caused major functionality issues
