# Stream Modal Fixes & Enhancements

## Issues to Fix

### 1. Manual RTMP: Missing "List RTMP" Button ✅
**Problem:** Tombol "List RTMP" hilang di Manual RTMP section
**Solution:** Add "Load from YouTube" button next to stream key input (similar to YouTube API tab)

### 2. Manual RTMP: Save Button Not Working ✅
**Problem:** Tombol Save tidak berfungsi
**Solution:** Investigate form submission and ensure Manual RTMP fields are properly validated and submitted

### 3. Templates: Export Feature ✅
**Problem:** Tidak ada fitur export template
**Solution:** 
- Add checkbox to each template card
- Add "Export Selected" button
- Add "Export All" button
- Create backend endpoint `/api/templates/export` (POST with IDs array)
- Create backend endpoint `/api/templates/export-all` (GET)
- Export as JSON file for download

### 4. YouTube API Stream Keys: Cache & Reuse ✅
**Problem:** Stream keys harus reload setiap kali, tidak bisa diakses ulang
**Solution:** 
- Already implemented cache (5 minutes duration)
- Make cache accessible globally
- Show cache age indicator
- Add refresh button

### 5. Manual RTMP: Hybrid Input/Dropdown for Stream Key ✅
**Problem:** Manual RTMP hanya bisa input manual, tidak bisa pilih dari dropdown
**Solution:**
- Add "Load from YouTube" button in Manual RTMP section
- When clicked, show dropdown with cached YouTube stream keys
- User can either:
  - Type stream key manually (default behavior)
  - Click "Load from YouTube" to see dropdown and select from list
- Dropdown should use the same cache as YouTube API tab

## Implementation Plan

### Phase 1: Manual RTMP Enhancements
1. Add "Load from YouTube" button next to stream key input
2. Add dropdown container (hidden by default)
3. Reuse `loadYouTubeStreamKeys()` function
4. Create `selectStreamKeyForManualRTMP(keyId)` function
5. Test form submission with both manual input and dropdown selection

### Phase 2: Template Export Feature
1. Update `views/partials/stream-templates-ui.ejs`:
   - Add checkbox to each template card
   - Add "Export Selected" and "Export All" buttons in header
2. Update `public/js/stream-templates.js`:
   - Add `selectTemplate(templateId)` function
   - Add `exportSelectedTemplates()` function
   - Add `exportAllTemplates()` function
3. Update `routes/templates.js`:
   - Add POST `/api/templates/export` endpoint
   - Add GET `/api/templates/export-all` endpoint
4. Update `models/Template.js`:
   - Add `findByIds(ids)` method if not exists

### Phase 3: Testing
1. Test Manual RTMP with manual input
2. Test Manual RTMP with dropdown selection
3. Test template export (selected)
4. Test template export (all)
5. Test cache persistence across tab switches
6. Test form submission for both tabs

## Files to Modify

### Frontend
- `views/dashboard.ejs` - Add "Load from YouTube" button and dropdown in Manual RTMP section
- `views/partials/stream-templates-ui.ejs` - Add checkboxes and export buttons
- `public/js/stream-modal.js` - Add Manual RTMP dropdown functions
- `public/js/stream-templates.js` - Add export functions

### Backend
- `routes/templates.js` - Add export endpoints
- `models/Template.js` - Add findByIds method (if needed)

## Expected Behavior

### Manual RTMP Tab
1. User can type stream key manually (default)
2. User can click "Load from YouTube" button
3. Dropdown appears with cached stream keys (or loads fresh if no cache)
4. User can select from dropdown
5. Selected stream key fills the input field
6. User can still edit manually after selection
7. Form submits correctly with either manual or selected stream key

### Template Export
1. User opens "My Templates" modal
2. Each template card has a checkbox
3. User can select multiple templates
4. Click "Export Selected" → Downloads JSON file with selected templates
5. Click "Export All" → Downloads JSON file with all templates
6. JSON file can be imported later (future feature)

### YouTube API Cache
1. Stream keys are cached for 5 minutes
2. Cache is shared between YouTube API tab and Manual RTMP tab
3. Cache age is displayed
4. User can force refresh with refresh button
5. Cache persists when switching between tabs

## Status
- [ ] Manual RTMP: "Load from YouTube" button
- [ ] Manual RTMP: Dropdown for stream key selection
- [ ] Manual RTMP: Form submission fix
- [ ] Templates: Checkbox on each card
- [ ] Templates: "Export Selected" button
- [ ] Templates: "Export All" button
- [ ] Templates: Backend export endpoints
- [ ] Testing: All features

## Notes
- Cache duration: 5 minutes (already implemented)
- Export format: JSON
- Import feature: Future enhancement (not in this task)
