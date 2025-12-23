# Dashboard.ejs Refactoring Plan - Option 2

## Current Status
- **dashboard.ejs**: ~4000+ lines (TOO LARGE)
- Contains: Main dashboard + New Stream Modal + Edit Stream Modal
- Hard to maintain, slow to edit, difficult to debug

## Refactoring Strategy: Component-Based Architecture

### New Structure
```
views/
├── dashboard.ejs (~1500 lines)
│   └── Includes modal partials
│
└── partials/modals/
    ├── stream-modal-new.ejs (Main wrapper for new stream)
    ├── stream-modal-edit.ejs (Main wrapper for edit stream)
    │
    ├── Shared Components:
    ├── stream-modal-header.ejs ✅ CREATED
    ├── stream-modal-tabs.ejs ✅ CREATED
    ├── stream-modal-video-selector.ejs ✅ CREATED
    ├── stream-modal-title.ejs ✅ CREATED
    ├── stream-modal-manual-rtmp.ejs (Manual RTMP fields)
    ├── stream-modal-youtube-api.ejs (YouTube API fields)
    ├── stream-modal-schedule.ejs (Schedule settings)
    └── stream-modal-footer.ejs (Save/Cancel buttons)
```

## Components Breakdown

### 1. stream-modal-header.ejs ✅
**Status**: CREATED
**Parameters**:
- `title` - Modal title
- `showSaveTemplate` - Show save template button
- `saveTemplateFunction` - Function name for save template
- `showImport` - Show import button
- `closeFunction` - Function name for close

**Usage**:
```ejs
<%- include('partials/modals/stream-modal-header', {
  title: 'Create New Stream',
  showSaveTemplate: true,
  saveTemplateFunction: 'saveAsTemplate',
  showImport: true,
  closeFunction: 'closeNewStreamModal'
}) %>
```

### 2. stream-modal-tabs.ejs ✅
**Status**: CREATED
**Parameters**:
- `tabPrefix` - Prefix for tab IDs (e.g., 'tab' or 'editTab')

**Usage**:
```ejs
<%- include('partials/modals/stream-modal-tabs', {
  tabPrefix: 'tab'
}) %>
```

### 3. stream-modal-video-selector.ejs ✅
**Status**: CREATED
**Parameters**:
- `videoIdField` - Hidden input ID for video ID
- `selectedVideoField` - Display field ID
- `dropdownId` - Dropdown container ID
- `searchInputId` - Search input ID
- `listContainerId` - Video list container ID

**Usage**:
```ejs
<%- include('partials/modals/stream-modal-video-selector', {
  videoIdField: 'selectedVideoId',
  selectedVideoField: 'selectedVideo',
  dropdownId: 'videoSelectorDropdown',
  searchInputId: 'videoSearchInput',
  listContainerId: 'videoListContainer'
}) %>
```

### 4. stream-modal-title.ejs ✅
**Status**: CREATED
**Parameters**:
- `titleFieldId` - Input field ID
- `titleFieldName` - Input field name

**Usage**:
```ejs
<%- include('partials/modals/stream-modal-title', {
  titleFieldId: 'streamTitle',
  titleFieldName: 'streamTitle'
}) %>
```

### 5. stream-modal-manual-rtmp.ejs
**Status**: TO CREATE
**Contains**:
- RTMP URL input with platform selector dropdown
- Stream Key input with visibility toggle
- Load button for YouTube stream keys
- Stream keys dropdown (Manual RTMP)

**Parameters**:
- `rtmpUrlId` - RTMP URL input ID
- `rtmpUrlName` - RTMP URL input name
- `streamKeyId` - Stream Key input ID
- `streamKeyName` - Stream Key input name
- `platformSelectorId` - Platform selector button ID
- `platformDropdownId` - Platform dropdown ID
- `streamKeyToggleId` - Stream key visibility toggle ID
- `streamKeysDropdownId` - Stream keys dropdown ID
- `streamKeysListId` - Stream keys list ID
- `streamKeysCountId` - Stream keys count ID
- `streamKeysCacheInfoId` - Cache info ID

### 6. stream-modal-youtube-api.ejs
**Status**: TO CREATE
**Contains**:
- YouTube Description textarea
- YouTube RTMP URL with platform selector
- YouTube Stream Key with Load button
- Stream keys dropdown (YouTube API)
- Additional Settings (collapsible):
  - Privacy select
  - Thumbnail upload
  - Made for Kids radio
  - Age Restriction checkbox
  - Synthetic Content checkbox
  - Auto Start/End checkboxes

**Parameters**:
- `descriptionId` - Description textarea ID
- `rtmpUrlId` - RTMP URL input ID
- `streamKeyId` - Stream Key input ID
- `streamIdId` - Hidden stream ID input
- `privacyId` - Privacy select ID
- `thumbnailId` - Thumbnail input ID
- ... (all other field IDs)

### 7. stream-modal-schedule.ejs
**Status**: TO CREATE
**Contains**:
- Schedule Settings header with Add button
- Server time display
- Schedule slots container
- Loop video checkbox

**Parameters**:
- `scheduleSlotsContainerId` - Container ID for schedule slots
- `loopVideoId` - Loop video checkbox ID
- `loopVideoName` - Loop video checkbox name

### 8. stream-modal-footer.ejs
**Status**: TO CREATE
**Contains**:
- Cancel button
- Save/Update button

**Parameters**:
- `cancelFunction` - Cancel button function
- `submitFunction` - Submit button function (optional, can use form submit)
- `submitButtonText` - Submit button text (e.g., 'Create Stream' or 'Update Stream')
- `submitButtonId` - Submit button ID

## Implementation Steps

### Phase 1: Create Remaining Shared Components ✅ (4/8 done)
- [x] stream-modal-header.ejs
- [x] stream-modal-tabs.ejs
- [x] stream-modal-video-selector.ejs
- [x] stream-modal-title.ejs
- [ ] stream-modal-manual-rtmp.ejs
- [ ] stream-modal-youtube-api.ejs
- [ ] stream-modal-schedule.ejs
- [ ] stream-modal-footer.ejs

### Phase 2: Create Main Modal Wrappers
- [ ] stream-modal-new.ejs (combines all components for new stream)
- [ ] stream-modal-edit.ejs (combines all components for edit stream)

### Phase 3: Update dashboard.ejs
- [ ] Remove New Stream Modal HTML
- [ ] Remove Edit Stream Modal HTML
- [ ] Add includes for new partials
- [ ] Test all functionality

### Phase 4: Testing Checklist
- [ ] New Stream Modal opens correctly
- [ ] Edit Stream Modal opens correctly
- [ ] Video selector works
- [ ] Tab switching works (Manual RTMP ↔ YouTube API)
- [ ] Manual RTMP: Platform selector works
- [ ] Manual RTMP: Stream key visibility toggle works
- [ ] Manual RTMP: Load button works
- [ ] Manual RTMP: Stream keys dropdown works
- [ ] YouTube API: All fields work
- [ ] YouTube API: Load button works
- [ ] YouTube API: Additional Settings collapsible works
- [ ] Schedule: Add slot works
- [ ] Schedule: Remove slot works
- [ ] Schedule: Duration calculation works
- [ ] Schedule: Recurring days selection works
- [ ] Save as Template button works
- [ ] Import Template button works
- [ ] Form submission works (both new and edit)
- [ ] All buttons and functions work

## Benefits After Refactoring

### Maintainability
- ✅ Each component is small and focused
- ✅ Easy to find and edit specific sections
- ✅ No more scrolling through 4000 lines

### Reusability
- ✅ Components can be reused in other modals
- ✅ Consistent UI across all modals
- ✅ DRY principle (Don't Repeat Yourself)

### Scalability
- ✅ Easy to add new fields or sections
- ✅ Easy to add new modal types
- ✅ Easy to modify without breaking other parts

### Performance
- ✅ Faster file loading in editor
- ✅ Easier to debug
- ✅ Better code organization

## Estimated Time
- **Phase 1**: 15 minutes (4 components remaining)
- **Phase 2**: 10 minutes (2 main wrappers)
- **Phase 3**: 10 minutes (update dashboard.ejs)
- **Phase 4**: 10 minutes (testing)
- **Total**: ~45 minutes

## Risk Mitigation
1. ✅ Keep backup of original dashboard.ejs
2. ✅ Test each component individually
3. ✅ Use git for version control
4. ✅ Deploy to test environment first
5. ✅ Have rollback plan ready

## Next Steps
1. Continue creating remaining shared components
2. Create main modal wrappers
3. Update dashboard.ejs
4. Test thoroughly
5. Deploy to server 2

---
**Status**: IN PROGRESS (4/8 components created)
**Last Updated**: 2025-12-23
