# Edit Modal - Dual Mode Support

## Overview
The Edit Stream Modal now fully supports editing both **Manual RTMP** and **YouTube API** streams with intelligent field management based on stream type.

## Features

### 1. Automatic Stream Type Detection
When opening the edit modal, the system automatically detects the stream type:
- Checks `use_youtube_api` field (1 = YouTube API, 0 = Manual RTMP)
- Adjusts UI and field availability accordingly

### 2. YouTube API Stream Mode

#### Visual Indicators
- **Blue Banner**: Displays at top of modal indicating "YouTube API Stream"
- **Info Message**: "RTMP settings are managed by YouTube API"

#### Field Behavior
**Disabled Fields** (managed by YouTube broadcast):
- RTMP URL (grayed out, cursor-not-allowed)
- Stream Key (grayed out, cursor-not-allowed)
- Platform Selector button (grayed out, cursor-not-allowed)

**Enabled Fields**:
- Stream Title
- Video Selection
- Loop Video toggle
- Schedule Settings

**YouTube Additional Settings Section** (visible):
- Description (textarea)
- Privacy (public/unlisted/private)
- Made for Kids (checkbox)
- Age Restricted 18+ (checkbox)
- Altered or Synthetic Content (checkbox)
- Auto-start Broadcast (checkbox)
- Auto-end Broadcast (checkbox)

#### Info Badge
A blue info badge appears below RTMP fields explaining:
> "This stream uses YouTube API. RTMP settings are managed automatically."

### 3. Manual RTMP Stream Mode

#### Field Behavior
**All Fields Enabled**:
- RTMP URL (editable)
- Stream Key (editable with show/hide toggle)
- Platform Selector (clickable dropdown)
- Stream Title
- Video Selection
- Loop Video toggle
- Schedule Settings

**YouTube Additional Settings Section**: Hidden (not applicable)

### 4. Form Submission

#### YouTube API Streams
When submitting, the form:
1. Detects stream is YouTube API via `window.currentEditStream`
2. Collects YouTube Additional Settings:
   - `youtubeDescription`
   - `youtubePrivacy`
   - `youtubeMadeForKids`
   - `youtubeAgeRestricted`
   - `youtubeSyntheticContent`
   - `youtubeAutoStart`
   - `youtubeAutoEnd`
3. Sends `useYouTubeAPI: true` flag to backend
4. Backend preserves RTMP URL and Stream Key (managed by broadcast)

#### Manual RTMP Streams
When submitting, the form:
1. Collects all standard fields including RTMP URL and Stream Key
2. Does NOT send YouTube Additional Settings
3. Backend updates RTMP URL and Stream Key normally

## Backend Handling

### PUT /api/streams/:id Endpoint

```javascript
// Detect stream type
const isYouTubeAPI = stream.use_youtube_api === 1 || stream.use_youtube_api === true;

// Only update RTMP fields for Manual RTMP streams
if (!isYouTubeAPI) {
  if (req.body.rtmpUrl) updateData.rtmp_url = req.body.rtmpUrl;
  if (req.body.streamKey) updateData.stream_key = req.body.streamKey;
}

// Update YouTube settings only for YouTube API streams
if (isYouTubeAPI && req.body.useYouTubeAPI) {
  // Update all YouTube Additional Settings
  updateData.youtube_description = req.body.youtubeDescription;
  updateData.youtube_privacy = req.body.youtubePrivacy;
  // ... etc
}
```

## Database Fields

### YouTube API Streams
Required fields in `streams` table:
- `use_youtube_api` = 1
- `youtube_broadcast_id` (from YouTube API)
- `rtmp_url` (from broadcast ingestion info)
- `stream_key` (from broadcast ingestion info)
- `youtube_description`
- `youtube_privacy`
- `youtube_made_for_kids`
- `youtube_age_restricted`
- `youtube_synthetic_content`
- `youtube_auto_start`
- `youtube_auto_end`

### Manual RTMP Streams
Required fields in `streams` table:
- `use_youtube_api` = 0
- `rtmp_url` (user-provided)
- `stream_key` (user-provided)
- `platform` (youtube/facebook/tiktok/etc)

## User Experience

### Editing YouTube API Stream
1. User clicks "Edit" on a YouTube API stream
2. Modal opens with blue banner indicating YouTube API mode
3. RTMP fields are grayed out with info badge
4. User can edit: Title, Video, YouTube Settings, Schedules
5. User clicks "Save Changes"
6. YouTube settings are updated in database
7. RTMP settings remain unchanged (managed by broadcast)

### Editing Manual RTMP Stream
1. User clicks "Edit" on a Manual RTMP stream
2. Modal opens in standard mode (no banner)
3. All fields are editable
4. User can change RTMP URL, Stream Key, Platform
5. User clicks "Save Changes"
6. All fields including RTMP settings are updated

## Testing

### Test YouTube API Stream Edit
```bash
# Check stream types
ssh root@94.237.3.164 "cd /root/streambrovps && node check-stream-types.js"

# Look for streams with:
# - Use YouTube API: YES
# - Broadcast ID present
# - YouTube settings populated
```

### Test Manual RTMP Stream Edit
```bash
# Look for streams with:
# - Use YouTube API: NO
# - RTMP URL present
# - Stream Key present
```

## Implementation Files

### Frontend
- `views/dashboard.ejs`
  - Lines 698-950: Edit Modal HTML structure
  - Lines 2804-2950: `openEditStreamModal()` function
  - Lines 3186-3250: Form submission handler
  - Lines 3167-3180: `toggleEditYouTubeAdditionalSettings()` function

### Backend
- `app.js`
  - Lines 2648-2750: PUT `/api/streams/:id` endpoint

## Benefits

1. **Prevents User Errors**: Users cannot accidentally modify RTMP settings for YouTube API streams
2. **Clear Visual Feedback**: Blue banner and disabled fields make stream type obvious
3. **Seamless Experience**: Same modal handles both stream types intelligently
4. **Data Integrity**: Backend enforces rules to preserve broadcast-managed settings
5. **Flexibility**: Users can still edit all relevant settings for each stream type

## Future Enhancements

Potential improvements:
- Add "Convert to YouTube API" button for Manual RTMP streams
- Show broadcast status in edit modal for YouTube API streams
- Add "Refresh Broadcast Info" button to sync latest RTMP settings from YouTube
- Display broadcast viewer count in edit modal

## Deployment

Feature deployed to VPS on: December 20, 2024
- Commit: 9ec88af
- Status: ✅ Live and tested
- URL: https://streambro.nivarastudio.site
