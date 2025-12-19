# Edit Modal - YouTube Additional Settings

## Problem
Modal edit stream tidak memiliki YouTube Additional Settings, sehingga user tidak bisa mengedit:
- Description
- Privacy (Public/Unlisted/Private)
- Made for Kids
- Age Restricted
- Synthetic Content
- Auto Start/End Broadcast

Padahal modal create stream sudah memiliki fitur ini di tab YouTube API.

## Solution
Menambahkan YouTube Additional Settings section ke modal edit yang:
1. **Hanya muncul untuk stream YouTube API** - Hidden untuk manual RTMP streams
2. **Collapsible** - Bisa di-expand/collapse untuk menghemat space
3. **Pre-populated** - Data existing stream otomatis ter-load
4. **Editable** - User bisa update semua settings

## Changes Made

### 1. Frontend - Modal Edit (`views/dashboard.ejs`)

#### A. Tambah HTML Section (setelah Stream Configuration, sebelum Schedule Settings):
```html
<!-- YouTube Additional Settings (only shown for YouTube API streams) -->
<div id="editYouTubeAdditionalSettings" class="hidden space-y-3 pt-3 border-t border-gray-700">
  <button type="button" onclick="toggleEditYouTubeAdditionalSettings()">
    <!-- Toggle button -->
  </button>
  
  <div id="editYouTubeAdditionalSettingsContent" class="hidden space-y-3">
    <!-- Description textarea -->
    <!-- Privacy select -->
    <!-- Checkboxes: Made for Kids, Age Restricted, Synthetic Content, Auto Start, Auto End -->
  </div>
</div>
```

#### B. Tambah JavaScript Functions:
```javascript
// Toggle expand/collapse Additional Settings
function toggleEditYouTubeAdditionalSettings() {
  const content = document.getElementById('editYouTubeAdditionalSettingsContent');
  const icon = document.getElementById('editYouTubeAdditionalSettingsIcon');
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    icon.style.transform = 'rotate(0deg)';
  }
}
```

#### C. Update `openEditStreamModal()` Function:
```javascript
// Show/hide YouTube Additional Settings based on mode
const youtubeAdditionalSettings = document.getElementById('editYouTubeAdditionalSettings');
if (youtubeAdditionalSettings) {
  if (isYouTubeAPI) {
    youtubeAdditionalSettings.classList.remove('hidden');
    
    // Populate YouTube Additional Settings
    safeSetValue('editYoutubeDescription', stream.youtube_description || '');
    safeSetValue('editYoutubePrivacy', stream.youtube_privacy || 'unlisted');
    safeSetChecked('editYoutubeMadeForKids', stream.youtube_made_for_kids === 1);
    safeSetChecked('editYoutubeAgeRestricted', stream.youtube_age_restricted === 1);
    safeSetChecked('editYoutubeSyntheticContent', stream.youtube_synthetic_content === 1);
    safeSetChecked('editYoutubeAutoStart', stream.youtube_auto_start === 1);
    safeSetChecked('editYoutubeAutoEnd', stream.youtube_auto_end === 1);
  } else {
    youtubeAdditionalSettings.classList.add('hidden');
  }
}
```

#### D. Update Form Submit Handler:
```javascript
// Add YouTube Additional Settings if stream uses YouTube API
const stream = window.currentEditStream;
const isYouTubeAPI = stream && (stream.use_youtube_api === 1 || stream.use_youtube_api === true);
if (isYouTubeAPI) {
  formData.useYouTubeAPI = true;
  formData.youtubeDescription = document.getElementById('editYoutubeDescription')?.value || '';
  formData.youtubePrivacy = document.getElementById('editYoutubePrivacy')?.value || 'unlisted';
  formData.youtubeMadeForKids = document.getElementById('editYoutubeMadeForKids')?.checked || false;
  formData.youtubeAgeRestricted = document.getElementById('editYoutubeAgeRestricted')?.checked || false;
  formData.youtubeSyntheticContent = document.getElementById('editYoutubeSyntheticContent')?.checked || false;
  formData.youtubeAutoStart = document.getElementById('editYoutubeAutoStart')?.checked || false;
  formData.youtubeAutoEnd = document.getElementById('editYoutubeAutoEnd')?.checked || false;
}
```

### 2. Backend - Update Endpoint (`app.js`)

#### Update PUT `/api/streams/:id`:
```javascript
// Update YouTube Additional Settings if stream uses YouTube API
if (isYouTubeAPI && req.body.useYouTubeAPI) {
  if (req.body.youtubeDescription !== undefined) updateData.youtube_description = req.body.youtubeDescription;
  if (req.body.youtubePrivacy !== undefined) updateData.youtube_privacy = req.body.youtubePrivacy;
  if (req.body.youtubeMadeForKids !== undefined) updateData.youtube_made_for_kids = req.body.youtubeMadeForKids === 'true' || req.body.youtubeMadeForKids === true;
  if (req.body.youtubeAgeRestricted !== undefined) updateData.youtube_age_restricted = req.body.youtubeAgeRestricted === 'true' || req.body.youtubeAgeRestricted === true;
  if (req.body.youtubeSyntheticContent !== undefined) updateData.youtube_synthetic_content = req.body.youtubeSyntheticContent === 'true' || req.body.youtubeSyntheticContent === true;
  if (req.body.youtubeAutoStart !== undefined) updateData.youtube_auto_start = req.body.youtubeAutoStart === 'true' || req.body.youtubeAutoStart === true;
  if (req.body.youtubeAutoEnd !== undefined) updateData.youtube_auto_end = req.body.youtubeAutoEnd === 'true' || req.body.youtubeAutoEnd === true;
  
  console.log(`[UPDATE STREAM] Updating YouTube Additional Settings for stream ${req.params.id}`);
}
```

## Features

### 1. Smart Visibility
- **YouTube API streams**: Section muncul dan bisa di-edit
- **Manual RTMP streams**: Section hidden (tidak relevan)

### 2. RTMP Fields Protection
- RTMP URL dan Stream Key **disabled** untuk YouTube API streams
- Info badge muncul: "This stream uses YouTube API. RTMP settings are managed automatically."
- Mencegah user mengubah settings yang di-manage oleh YouTube broadcast

### 3. Collapsible Design
- Default: collapsed (hemat space)
- Click header untuk expand/collapse
- Icon chevron rotate 180° saat expanded

### 4. Data Persistence
- Semua settings existing stream ter-load otomatis
- Update tersimpan ke database
- Tidak mengubah settings yang tidak di-edit

## Testing

### Test Case 1: Edit Manual RTMP Stream
1. Buat stream dengan Manual RTMP
2. Klik Edit
3. ✅ YouTube Additional Settings section **tidak muncul**
4. ✅ RTMP URL dan Stream Key **bisa di-edit**

### Test Case 2: Edit YouTube API Stream
1. Buat stream dengan YouTube API
2. Klik Edit
3. ✅ YouTube Additional Settings section **muncul**
4. ✅ RTMP URL dan Stream Key **disabled** dengan info badge
5. ✅ Semua YouTube settings ter-load dengan benar
6. Edit Description, Privacy, checkboxes
7. Save
8. ✅ Changes tersimpan ke database

### Test Case 3: Toggle Additional Settings
1. Edit YouTube API stream
2. Klik "YouTube Additional Settings" header
3. ✅ Content expand dengan smooth transition
4. ✅ Icon chevron rotate 180°
5. Klik lagi
6. ✅ Content collapse
7. ✅ Icon chevron kembali normal

## Database Fields Used
Semua field sudah ada di tabel `streams`:
- `use_youtube_api` (BOOLEAN)
- `youtube_description` (TEXT)
- `youtube_privacy` (TEXT)
- `youtube_made_for_kids` (BOOLEAN)
- `youtube_age_restricted` (BOOLEAN)
- `youtube_synthetic_content` (BOOLEAN)
- `youtube_auto_start` (BOOLEAN)
- `youtube_auto_end` (BOOLEAN)

## Benefits
1. ✅ **Consistency**: Edit modal sekarang punya fitur yang sama dengan create modal
2. ✅ **User Experience**: User bisa edit semua settings tanpa harus delete & recreate stream
3. ✅ **Safety**: RTMP settings protected untuk YouTube API streams
4. ✅ **Clean UI**: Collapsible design menghemat space
5. ✅ **Smart**: Hanya muncul untuk stream yang relevan

## Commit
```
git commit -m "Feature: Add YouTube Additional Settings to Edit Modal"
```

## Date
December 20, 2025
