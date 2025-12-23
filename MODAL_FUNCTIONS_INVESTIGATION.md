# Modal Functions Investigation Report
**Date**: 2025-12-23
**Status**: ⚠️ INCOMPLETE - Missing Edit Modal Functions

## Summary
After refactoring dashboard.ejs to use component-based modals, we need to verify all functions are working correctly for both New Stream Modal and Edit Stream Modal.

## Investigation Results

### ✅ New Stream Modal - COMPLETE
All functions exist and working:

#### Core Functions
- ✅ `openNewStreamModal()` - Opens modal
- ✅ `closeNewStreamModal()` - Closes modal
- ✅ `resetModalForm()` - Resets form

#### Video Selector Functions
- ✅ `toggleVideoSelector()` - Toggle video dropdown
- ✅ `selectVideo(video)` - Select video
- ✅ `loadGalleryVideos()` - Load videos from API
- ✅ `handleVideoSearch(e)` - Search videos
- ✅ `displayFilteredVideos(videos)` - Display filtered results

#### Manual RTMP Functions
- ✅ `toggleStreamKeyVisibility()` - Toggle stream key visibility
- ✅ `toggleManualRTMPStreamKeysDropdown()` - Toggle stream keys dropdown
- ✅ `loadManualRTMPStreamKeys(forceRefresh)` - Load YouTube stream keys
- ✅ `refreshManualRTMPStreamKeys()` - Refresh stream keys
- ✅ `selectManualStreamKey(streamKey, rtmpUrl)` - Select stream key from dropdown

#### YouTube API Functions
- ✅ `loadYouTubeStreamKeys()` - Load YouTube stream keys
- ✅ `selectYouTubeStreamKey(streamKey, rtmpUrl, streamId)` - Select YouTube stream key
- ✅ `toggleYouTubeStreamKeyVisibility()` - Toggle YouTube stream key visibility

#### Schedule Functions
- ✅ `addScheduleSlot()` - Add schedule slot
- ✅ `removeScheduleSlot(button)` - Remove schedule slot
- ✅ `calculateDurationFromEndTime(input)` - Calculate duration from end time
- ✅ `calculateFromDuration(input)` - Calculate end time from duration
- ✅ `selectAllDays(button)` - Select all recurring days
- ✅ `selectAllDaysInSlot(button)` - Select all days in specific slot

#### Template Functions
- ✅ `saveAsTemplate()` - Save as template
- ✅ `importTemplate()` - Import template

#### Tab Switching
- ✅ `switchStreamTab(tab)` - Switch between Manual RTMP and YouTube API

---

### ❌ Edit Stream Modal - INCOMPLETE
Missing several critical functions:

#### Core Functions (Exist in dashboard.ejs)
- ✅ `openEditStreamModal(stream)` - Opens edit modal (line 2108)
- ✅ `closeEditStreamModal()` - Closes edit modal (line 2265)
- ✅ `resetEditModalForm()` - Resets edit form

#### Video Selector Functions (Exist in dashboard.ejs)
- ✅ `toggleEditVideoSelector()` - Toggle video dropdown (line 2320)
- ✅ `selectEditVideo(video)` - Select video (line 2408)
- ✅ `loadEditGalleryVideos()` - Load videos (line 2332)

#### Manual RTMP Functions (MISSING!)
- ❌ `toggleEditStreamKeyVisibility()` - EXISTS (line 2457) but needs verification
- ❌ `toggleEditManualRTMPStreamKeysDropdown()` - **MISSING**
- ❌ `loadEditManualRTMPStreamKeys(forceRefresh)` - **MISSING**
- ❌ `refreshEditManualRTMPStreamKeys()` - **MISSING**
- ❌ `selectEditManualStreamKey(streamKey, rtmpUrl)` - **MISSING**

#### YouTube API Functions (MISSING!)
- ❌ `loadEditYouTubeStreamKeys()` - **MISSING**
- ❌ `selectEditYouTubeStreamKey(streamKey, rtmpUrl, streamId)` - **MISSING**
- ❌ `toggleEditYouTubeStreamKeyVisibility()` - **MISSING** (called in edit-stream-modal.ejs line 103)

#### Schedule Functions (Exist in dashboard.ejs)
- ✅ `addEditScheduleSlot()` - Add schedule slot (line 2878)
- ✅ `removeEditScheduleSlot(button)` - Remove schedule slot
- ✅ Edit modal uses same duration calculation functions

#### Template Functions (MISSING!)
- ❌ `saveEditAsTemplate()` - **MISSING** (called in edit-stream-modal.ejs line 9)

#### Tab Switching (MISSING!)
- ❌ Edit modal needs tab switching support for `editTab` prefix

---

## Issues Found

### 1. Missing Edit Modal Functions
The following functions are called by edit-stream-modal.ejs but don't exist:

**File**: `views/partials/modals/edit-stream-modal.ejs`
- Line 9: `saveTemplateFunction: 'saveEditAsTemplate'` - **FUNCTION MISSING**
- Line 103: `onclick="toggleEditYouTubeStreamKeyVisibility()"` - **FUNCTION MISSING**

**File**: `views/partials/modals/stream-modal-manual-rtmp.ejs` (when used by edit modal)
- `toggleManualRTMPStreamKeysDropdown()` - Needs edit version
- `refreshManualRTMPStreamKeys()` - Needs edit version
- `toggleStreamKeyVisibility()` - Needs to work with edit IDs

### 2. Component Parameter Issues
The Manual RTMP component uses hardcoded function names that don't support edit modal:
- `onclick="toggleStreamKeyVisibility()"` - Should be dynamic based on modal type
- `onclick="toggleManualRTMPStreamKeysDropdown()"` - Should be dynamic
- `onclick="refreshManualRTMPStreamKeys()"` - Should be dynamic

### 3. Tab Switching Not Implemented for Edit Modal
Edit modal uses `tabPrefix: 'editTab'` but there's no implementation for:
- Switching between Manual RTMP and YouTube API tabs in edit modal
- Showing/hiding correct fields based on tab

---

## Required Actions

### Priority 1: Create Missing Edit Modal Functions

#### 1. Manual RTMP Functions
Create in `public/js/stream-modal.js`:
```javascript
// Edit Modal - Manual RTMP Stream Keys
function toggleEditManualRTMPStreamKeysDropdown() {
  const dropdown = document.getElementById('editManualRTMPStreamKeysDropdown');
  // ... implementation
}

function loadEditManualRTMPStreamKeys(forceRefresh = false) {
  // ... implementation
}

function refreshEditManualRTMPStreamKeys() {
  loadEditManualRTMPStreamKeys(true);
}

function selectEditManualStreamKey(streamKey, rtmpUrl) {
  // ... implementation
}
```

#### 2. YouTube API Functions
Create in `public/js/stream-modal.js`:
```javascript
// Edit Modal - YouTube API Functions
function loadEditYouTubeStreamKeys() {
  // ... implementation
}

function selectEditYouTubeStreamKey(streamKey, rtmpUrl, streamId) {
  // ... implementation
}

function toggleEditYouTubeStreamKeyVisibility() {
  const streamKeyInput = document.getElementById('editYoutubeStreamKey');
  const streamKeyToggle = document.getElementById('editYoutubeStreamKeyToggle');
  // ... implementation
}
```

#### 3. Template Function
Create in `public/js/stream-templates.js`:
```javascript
async function saveEditAsTemplate() {
  // Similar to saveAsTemplate() but for edit modal
}
```

#### 4. Tab Switching for Edit Modal
Update `switchStreamTab()` function to support edit modal tabs.

### Priority 2: Fix Component Parameters
Update `stream-modal-manual-rtmp.ejs` to accept function names as parameters:
```ejs
<!-- Parameters should include: -->
toggleStreamKeyFunction
toggleDropdownFunction
refreshKeysFunction
selectKeyFunction
```

### Priority 3: Test All Functions
After creating missing functions, test:
1. Open Edit Stream Modal
2. Switch between Manual RTMP and YouTube API tabs
3. Load stream keys in both tabs
4. Select stream keys from dropdown
5. Toggle stream key visibility
6. Save as template
7. Update stream

---

## Recommendations

### Short Term (Immediate Fix)
1. Create all missing edit modal functions
2. Test edit modal functionality
3. Deploy to server 2

### Long Term (Refactoring)
1. Create a unified modal function system that works for both new and edit modals
2. Use function name parameters in components instead of hardcoded names
3. Consider creating a modal state manager to handle both modals

---

## Files to Update

### 1. `public/js/stream-modal.js`
Add missing edit modal functions:
- Manual RTMP functions (4 functions)
- YouTube API functions (3 functions)
- Tab switching support for edit modal

### 2. `public/js/stream-templates.js`
Add:
- `saveEditAsTemplate()` function

### 3. `views/partials/modals/stream-modal-manual-rtmp.ejs` (Optional)
Make function names configurable via parameters

---

## Testing Checklist

### New Stream Modal (Already Working)
- [x] Open modal
- [x] Select video
- [x] Switch tabs (Manual RTMP ↔ YouTube API)
- [x] Load stream keys (Manual RTMP)
- [x] Load stream keys (YouTube API)
- [x] Select stream key from dropdown
- [x] Toggle stream key visibility
- [x] Add/remove schedule slots
- [x] Save as template
- [x] Import template
- [x] Submit form

### Edit Stream Modal (Needs Testing After Fix)
- [ ] Open modal
- [ ] Select video
- [ ] Switch tabs (Manual RTMP ↔ YouTube API)
- [ ] Load stream keys (Manual RTMP)
- [ ] Load stream keys (YouTube API)
- [ ] Select stream key from dropdown
- [ ] Toggle stream key visibility
- [ ] Add/remove schedule slots
- [ ] Save as template
- [ ] Update stream

---

**Next Steps**: Create missing functions and test edit modal functionality.
