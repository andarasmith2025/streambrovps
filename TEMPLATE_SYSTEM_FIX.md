# Template System - Complete Save & Load Fix

**Date:** December 30, 2024  
**Priority:** HIGH  
**Status:** PENDING

---

## 📋 OBJECTIVE

Fix "My Template" feature agar bisa save dan load **SEMUA metadata** termasuk thumbnail, video, schedule settings, dan YouTube settings. User bisa reuse jadwal dengan mudah tanpa manual re-entry.

---

## 🎯 USE CASE

**Scenario:**
1. User punya jadwal recurring setiap Senin-Jumat jam 10:00
2. Metadata sama: title, description, tags, thumbnail, video
3. User save as template: "Daily Morning Stream"
4. Minggu depan, user buat stream baru → Load template → Semua terisi otomatis → Save

**Benefit:**
- ⏱️ Hemat waktu setup (dari 5 menit jadi 30 detik)
- ✅ Konsistensi metadata
- 🔄 Reuse schedule pattern
- 📝 No manual re-entry

---

## 🔍 CURRENT ISSUES TO CHECK

### 1. Save Template - Data Yang Harus Disimpan

**Basic Info:**
- [ ] Title
- [ ] Description
- [ ] Video ID & Type (video/playlist)
- [ ] Video thumbnail path
- [ ] Loop video setting

**YouTube API Settings:**
- [ ] Channel ID
- [ ] Privacy (public/unlisted/private)
- [ ] Tags (array)
- [ ] Category ID
- [ ] Language
- [ ] Made for Kids (yes/no)
- [ ] Age Restricted (yes/no)
- [ ] Synthetic Content (yes/no)
- [ ] Auto Start (yes/no)
- [ ] Auto End (yes/no)
- [ ] Thumbnail path (custom YouTube thumbnail)

**Schedule Settings:**
- [ ] Schedule time (HH:MM format)
- [ ] Is recurring (true/false)
- [ ] Recurring days (0,1,2,3,4,5,6)
- [ ] Duration (minutes)

**RTMP Settings (if manual):**
- [ ] RTMP URL
- [ ] Stream Key (encrypted?)

---

### 2. Load Template - Data Yang Harus Di-restore

**Form Fields:**
- [ ] Title input
- [ ] Description textarea
- [ ] Video selection (with preview)
- [ ] Loop video checkbox
- [ ] YouTube channel dropdown
- [ ] Privacy dropdown
- [ ] Tags input (with display)
- [ ] Category dropdown
- [ ] Language input
- [ ] Made for Kids radio buttons
- [ ] Age Restricted checkbox
- [ ] Synthetic Content checkbox
- [ ] Auto Start checkbox
- [ ] Auto End checkbox
- [ ] Thumbnail preview (if exists)

**Schedule Fields:**
- [ ] Schedule time input
- [ ] Recurring checkbox
- [ ] Recurring days checkboxes
- [ ] Duration input

**Visual Feedback:**
- [ ] Video thumbnail preview
- [ ] YouTube thumbnail preview
- [ ] Selected video name display
- [ ] Tags display with remove buttons

---

## 📂 FILES TO CHECK

### Backend (Database & API):
1. **`models/Template.js`** (or similar)
   - Check table schema
   - Ensure all fields exist
   - Check JSON fields for tags/settings

2. **`routes/templates.js`**
   - Save template endpoint
   - Load template endpoint
   - List templates endpoint
   - Delete template endpoint

3. **`db/database.js`**
   - Check `stream_templates` table schema
   - Verify column types (TEXT, JSON, INTEGER, etc.)

### Frontend (UI & Logic):
1. **`views/partials/modals/stream-modal-youtube-api.ejs`**
   - Save template button
   - Load template dropdown/button
   - Template name input

2. **`public/js/stream-modal.js`**
   - `saveAsTemplate()` function
   - `loadTemplate()` function
   - `populateFormFromTemplate()` function
   - Video selection restoration
   - Thumbnail restoration
   - Tags restoration

---

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Database Schema Verification
- [ ] Check if `stream_templates` table exists
- [ ] Verify all required columns exist
- [ ] Add missing columns if needed
- [ ] Test INSERT and SELECT queries

### Phase 2: Save Template Function
- [ ] Collect all form data (basic + YouTube + schedule)
- [ ] Validate required fields
- [ ] Save to database with user_id
- [ ] Return success/error response
- [ ] Show success notification

### Phase 3: Load Template Function
- [ ] Fetch template by ID
- [ ] Populate all form fields
- [ ] Restore video selection with preview
- [ ] Restore thumbnail preview
- [ ] Restore tags display
- [ ] Restore schedule settings
- [ ] Show success notification

### Phase 4: Template Management
- [ ] List user's templates
- [ ] Delete template
- [ ] Update template (optional)
- [ ] Template search/filter (optional)

### Phase 5: Testing
- [ ] Test save with all fields filled
- [ ] Test save with minimal fields
- [ ] Test load and verify all fields restored
- [ ] Test with different video types (video/playlist)
- [ ] Test with custom thumbnail
- [ ] Test with recurring schedule
- [ ] Test with multiple templates
- [ ] Test delete template

---

## 🐛 COMMON ISSUES TO FIX

### Issue 1: Thumbnail Not Restored
**Symptom:** Thumbnail preview tidak muncul saat load template  
**Fix:** 
- Check thumbnail path format (absolute vs relative)
- Ensure thumbnail file exists
- Update preview element with correct path

### Issue 2: Video Not Selected
**Symptom:** Video selection kosong saat load template  
**Fix:**
- Call `selectVideo()` or equivalent function
- Pass video data object with id, name, thumbnail, type
- Update hidden input and display element

### Issue 3: Tags Not Displayed
**Symptom:** Tags tersimpan tapi tidak muncul di UI  
**Fix:**
- Parse tags from JSON/string
- Call `updateTagsDisplay()` or equivalent
- Ensure tags array populated before display

### Issue 4: Schedule Time Format
**Symptom:** Schedule time tidak terisi atau format salah  
**Fix:**
- Convert stored time to HH:MM format
- Handle timezone if needed
- Set input value correctly

### Issue 5: Recurring Days Not Checked
**Symptom:** Recurring days checkboxes tidak ter-check  
**Fix:**
- Parse recurring_days string (e.g., "0,1,2,3,4,5,6")
- Loop through days and check corresponding checkboxes
- Ensure checkbox IDs match

---

## 📊 DATABASE SCHEMA (Expected)

```sql
CREATE TABLE IF NOT EXISTS stream_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  
  -- Basic Info
  title TEXT,
  description TEXT,
  video_id TEXT,
  video_type TEXT, -- 'video' or 'playlist'
  video_thumbnail TEXT,
  loop_video INTEGER DEFAULT 0,
  
  -- YouTube Settings
  youtube_channel_id TEXT,
  youtube_description TEXT,
  youtube_privacy TEXT DEFAULT 'unlisted',
  youtube_tags TEXT, -- JSON array
  youtube_category_id TEXT,
  youtube_language TEXT,
  youtube_made_for_kids INTEGER DEFAULT 0,
  youtube_age_restricted INTEGER DEFAULT 0,
  youtube_synthetic_content INTEGER DEFAULT 0,
  youtube_auto_start INTEGER DEFAULT 1,
  youtube_auto_end INTEGER DEFAULT 0,
  youtube_thumbnail_path TEXT,
  
  -- Schedule Settings
  schedule_time TEXT, -- HH:MM format
  is_recurring INTEGER DEFAULT 0,
  recurring_days TEXT, -- "0,1,2,3,4,5,6"
  duration INTEGER, -- minutes
  
  -- RTMP Settings (if manual)
  rtmp_url TEXT,
  stream_key TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🧪 TESTING SCRIPT

```javascript
// Test save template
const testSaveTemplate = async () => {
  const templateData = {
    template_name: "Test Template",
    title: "Test Stream",
    description: "Test description",
    video_id: "test-video-id",
    video_type: "video",
    youtube_channel_id: "UC...",
    youtube_privacy: "unlisted",
    youtube_tags: ["tag1", "tag2", "tag3"],
    schedule_time: "10:00",
    is_recurring: true,
    recurring_days: "1,2,3,4,5", // Mon-Fri
    duration: 60
  };
  
  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(templateData)
  });
  
  const result = await response.json();
  console.log('Save result:', result);
  return result.template_id;
};

// Test load template
const testLoadTemplate = async (templateId) => {
  const response = await fetch(`/api/templates/${templateId}`);
  const result = await response.json();
  console.log('Load result:', result);
  
  // Verify all fields
  console.assert(result.template.title === "Test Stream", "Title mismatch");
  console.assert(result.template.schedule_time === "10:00", "Time mismatch");
  console.assert(result.template.youtube_tags.length === 3, "Tags mismatch");
};

// Run tests
(async () => {
  const templateId = await testSaveTemplate();
  await testLoadTemplate(templateId);
})();
```

---

## 📝 IMPLEMENTATION NOTES

### Priority Order:
1. **HIGH:** Basic info (title, description, video)
2. **HIGH:** Schedule settings (time, recurring, days)
3. **MEDIUM:** YouTube settings (channel, privacy, tags)
4. **MEDIUM:** Thumbnail restoration
5. **LOW:** RTMP settings (if needed)

### Edge Cases:
- Template with no video selected
- Template with deleted video
- Template with invalid channel ID
- Template with expired thumbnail
- Template with old format (migration needed)

### User Experience:
- Show loading indicator during save/load
- Show success/error notifications
- Validate template name (required, unique?)
- Confirm before overwriting existing template
- Preview template before loading (optional)

---

## ✅ SUCCESS CRITERIA

Template system dianggap sukses jika:
1. ✅ User bisa save template dengan semua metadata
2. ✅ User bisa load template dan semua field terisi otomatis
3. ✅ Video preview muncul saat load template
4. ✅ Thumbnail preview muncul saat load template
5. ✅ Tags ter-display dengan benar
6. ✅ Schedule settings (time, recurring, days) ter-restore
7. ✅ YouTube settings (channel, privacy, dll) ter-restore
8. ✅ User bisa create stream dari template dalam < 1 menit

---

## 🚀 EXECUTION PLAN (Tomorrow)

### Step 1: Investigation (30 min)
- Check database schema
- Check existing save/load functions
- Identify missing fields
- List bugs/issues

### Step 2: Database Fix (15 min)
- Add missing columns if needed
- Test INSERT/SELECT queries
- Backup database before changes

### Step 3: Backend Fix (45 min)
- Fix save template endpoint
- Fix load template endpoint
- Add validation
- Test with Postman/curl

### Step 4: Frontend Fix (60 min)
- Fix form data collection
- Fix form population
- Fix video restoration
- Fix thumbnail restoration
- Fix tags restoration
- Fix schedule restoration

### Step 5: Testing (30 min)
- Test save with full data
- Test load and verify
- Test edge cases
- Test on VPS

### Step 6: Commit & Deploy (15 min)
- Commit changes
- Push to GitHub
- Upload to VPS
- Test on production

**Total Time:** ~3 hours

---

## 📞 CONTACT

If issues found during implementation:
- Check this document for common issues
- Review database schema
- Check browser console for errors
- Check server logs for API errors
- Test with simple data first, then complex

---

**END OF DOCUMENT**
