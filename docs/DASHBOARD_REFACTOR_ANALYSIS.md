# Dashboard.ejs Refactoring Analysis

## Current State
- **Total Lines**: 4,325
- **Total Functions**: 87
- **File Type**: Monolithic EJS template with embedded JavaScript

## Problems
1. **Maintainability**: Sulit untuk maintain dan debug
2. **Performance**: Browser harus parse 4000+ baris setiap page load
3. **Code Duplication**: Banyak fungsi yang mirip (mobile vs desktop)
4. **Testing**: Tidak bisa di-test karena embedded dalam EJS
5. **Collaboration**: Sulit untuk multiple developer bekerja bersamaan

## Refactoring Strategy

### Phase 1: Extract JavaScript to Separate Files (PRIORITY)
**Target**: Pindahkan semua JavaScript ke file terpisah

#### 1.1 Create `public/js/dashboard-streams.js`
**Functions to move** (~1500 lines):
- `loadStreams()`
- `displayStreams()`
- `displayMobileStreams()`
- `displayDesktopStreams()`
- `_createMobileStreamCard()`
- `_createStreamTableRow()`
- `updateStreamCounters()`
- `showEmptyState()`
- `setupSmartRefresh()`

#### 1.2 Create `public/js/dashboard-actions.js`
**Functions to move** (~800 lines):
- `startStream()`
- `stopStream()`
- `cancelSchedule()`
- `deleteStream()`
- `stopSchedule()`
- `toggleSelectAll()`
- `updateBulkActionsUI()`
- `deleteSelectedStreams()`

#### 1.3 Create `public/js/dashboard-edit.js`
**Functions to move** (~1000 lines):
- `editStream()`
- `openEditStreamModal()`
- `closeEditStreamModal()`
- `resetEditModalForm()`
- `toggleEditVideoSelector()`
- `loadEditGalleryVideos()`
- `handleEditVideoSearch()`
- `displayEditFilteredVideos()`
- `selectEditVideo()`
- All edit schedule functions

#### 1.4 Create `public/js/dashboard-utils.js`
**Functions to move** (~300 lines):
- `formatMemory()`
- `formatTimeDisplay()`
- `toggleTimeFormat()`
- `formatDate()`
- `formatTime()`
- `parseScheduleTime()`
- `formatRecurringDays()`
- `getScheduleStatus()`
- `getScheduleStatusBadge()`
- `getPlatformIcon()`
- `getPlatformColor()`
- `getStatusBadgeHTML()`
- `getActionButtonHTML()`

#### 1.5 Keep in dashboard.ejs (~700 lines)
- HTML structure
- EJS template variables
- Initialization code
- Script imports

### Phase 2: Component Modularization
**Target**: Pisahkan HTML components

#### 2.1 Create Partials
- `views/partials/dashboard/stream-card-mobile.ejs`
- `views/partials/dashboard/stream-row-desktop.ejs`
- `views/partials/dashboard/stats-cards.ejs`
- `views/partials/dashboard/bulk-actions.ejs`

### Phase 3: Optimize Performance
**Target**: Reduce initial load time

#### 3.1 Lazy Loading
- Load edit modal scripts only when needed
- Defer non-critical JavaScript

#### 3.2 Code Splitting
- Separate vendor libraries
- Use dynamic imports for heavy features

## Implementation Plan

### Step 1: Backup (DONE)
```bash
tar -czf backups/dashboard-before-refactor-$(date +%Y%m%d).tar.gz views/dashboard.ejs
```

### Step 2: Create New JS Files
1. Create `public/js/dashboard-utils.js` - Start with utilities (low risk)
2. Create `public/js/dashboard-streams.js` - Core display logic
3. Create `public/js/dashboard-actions.js` - User actions
4. Create `public/js/dashboard-edit.js` - Edit functionality

### Step 3: Update dashboard.ejs
1. Remove extracted functions
2. Add script imports
3. Test each extraction incrementally

### Step 4: Test Thoroughly
- Test all stream actions (start, stop, delete)
- Test edit modal
- Test bulk actions
- Test mobile view
- Test desktop view

## Expected Results

### Before Refactoring
- dashboard.ejs: 4,325 lines
- Total files: 1

### After Refactoring
- dashboard.ejs: ~700 lines (HTML + init)
- dashboard-utils.js: ~300 lines
- dashboard-streams.js: ~1,500 lines
- dashboard-actions.js: ~800 lines
- dashboard-edit.js: ~1,000 lines
- Total files: 5
- **Total lines**: Same, but organized and maintainable

## Benefits
1. ✅ **Maintainability**: Mudah cari dan fix bugs
2. ✅ **Performance**: Browser cache JS files
3. ✅ **Testing**: Bisa unit test setiap module
4. ✅ **Collaboration**: Multiple devs bisa kerja parallel
5. ✅ **Reusability**: Functions bisa dipakai di page lain
6. ✅ **Debugging**: Easier to debug dengan source maps

## Risks & Mitigation
1. **Risk**: Breaking existing functionality
   - **Mitigation**: Incremental refactoring, test after each step
   
2. **Risk**: Global scope conflicts
   - **Mitigation**: Use IIFE or modules, namespace functions
   
3. **Risk**: Load order dependencies
   - **Mitigation**: Document dependencies, use proper script order

## Recommendation
**START WITH PHASE 1** - Extract JavaScript to separate files.

Ini akan memberikan improvement terbesar dengan risk paling kecil.

**Timeline**: 
- Phase 1: 2-3 hours (incremental, test each file)
- Phase 2: 1-2 hours (optional, for further optimization)
- Phase 3: 1 hour (optional, for performance tuning)

**Priority**: HIGH - File ini sudah terlalu besar dan sulit maintain.
