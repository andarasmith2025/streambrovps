# Dashboard Refactoring Plan

## Masalah Saat Ini
- `views/dashboard.ejs` memiliki **3000+ baris kode**
- Sulit untuk maintenance dan review
- Modal, JavaScript, dan CSS tercampur dalam satu file
- Perubahan kecil berisiko merusak struktur HTML

## Struktur File Saat Ini
```
views/dashboard.ejs (3000+ lines)
├── HTML Layout (200 lines)
├── New Stream Modal (400 lines)
├── Edit Stream Modal (400 lines)
├── Tips Modal (50 lines)
├── Notification Modal (50 lines)
├── CSS Styles (300 lines)
└── JavaScript (1600+ lines)
```

## Struktur File yang Diusulkan

### 1. Views (EJS Partials)
```
views/
├── dashboard.ejs (MAIN - 200 lines)
├── partials/
│   ├── dashboard/
│   │   ├── header.ejs (stats indicators)
│   │   ├── stream-table.ejs (desktop table)
│   │   ├── stream-cards.ejs (mobile cards)
│   │   └── search-filters.ejs
│   ├── modals/
│   │   ├── new-stream-modal.ejs ✅ (sudah ada)
│   │   ├── edit-stream-modal.ejs (NEW)
│   │   ├── notification-modal.ejs (NEW)
│   │   └── tips-modal.ejs (NEW)
│   └── stream-templates-ui.ejs ✅ (sudah ada)
```

### 2. JavaScript (Modular)
```
public/js/
├── dashboard/
│   ├── stream-list.js (load, display, search streams)
│   ├── stream-actions.js (start, stop, delete)
│   ├── system-stats.js (CPU, RAM, disk monitoring)
│   └── time-format.js (24h/12h toggle)
├── modals/
│   ├── stream-modal.js ✅ (sudah ada)
│   ├── edit-modal.js (NEW)
│   └── notification.js (NEW)
└── stream-templates.js ✅ (sudah ada)
```

### 3. CSS (Separated)
```
public/css/
├── dashboard.css (NEW - dashboard specific styles)
├── modals.css (NEW - modal styles)
└── video-player.css (NEW - video.js styles)
```

## Prioritas Refactoring

### Phase 1: Extract Modals ✅ DONE
- [x] `views/partials/stream-modal.ejs` (New Stream Modal)
- [ ] `views/partials/modals/edit-stream-modal.ejs`
- [ ] `views/partials/modals/notification-modal.ejs`
- [ ] `views/partials/modals/tips-modal.ejs`

### Phase 2: Extract JavaScript
- [ ] Extract stream list functions → `public/js/dashboard/stream-list.js`
- [ ] Extract stream actions → `public/js/dashboard/stream-actions.js`
- [ ] Extract system stats → `public/js/dashboard/system-stats.js`
- [ ] Extract edit modal JS → `public/js/modals/edit-modal.js`

### Phase 3: Extract CSS
- [ ] Extract dashboard styles → `public/css/dashboard.css`
- [ ] Extract modal styles → `public/css/modals.css`
- [ ] Extract video player styles → `public/css/video-player.css`

### Phase 4: Extract Dashboard Components
- [ ] Extract header stats → `views/partials/dashboard/header.ejs`
- [ ] Extract stream table → `views/partials/dashboard/stream-table.ejs`
- [ ] Extract stream cards → `views/partials/dashboard/stream-cards.ejs`

## Benefits Setelah Refactoring

### Maintainability
- ✅ File lebih kecil dan fokus (< 300 lines per file)
- ✅ Mudah menemukan dan memperbaiki bug
- ✅ Perubahan di satu komponen tidak mempengaruhi yang lain

### Reusability
- ✅ Modal bisa digunakan di halaman lain
- ✅ JavaScript functions bisa di-import sesuai kebutuhan
- ✅ CSS bisa di-share antar halaman

### Performance
- ✅ Browser bisa cache file CSS/JS terpisah
- ✅ Hanya load JavaScript yang diperlukan
- ✅ Parallel loading untuk file-file kecil

### Developer Experience
- ✅ Lebih mudah untuk code review
- ✅ Lebih mudah untuk testing
- ✅ Lebih mudah untuk onboarding developer baru

## Catatan Penting untuk Revisi

### HTML Structure Rules
1. **Modal Structure** (SUDAH FIX):
   ```html
   <div id="modal" class="fixed inset-0 ... flex items-center justify-center p-2 md:p-4">
     <div class="bg-dark-800 ... w-full max-w-2xl ... flex flex-col">
       <div class="flex-shrink-0">Header</div>
       <div class="flex-1 overflow-y-auto">Content</div>
       <div class="flex-shrink-0">Footer</div>
     </div>
   </div>
   ```

2. **Closing Tags**:
   - Selalu tutup tag dengan benar: `</label>` bukan `</div>label>`
   - Gunakan comment untuk closing div: `</div><!-- Close modal-container -->`
   - Hindari wrapper div yang tidak perlu

3. **Flexbox Layout**:
   - Parent: `flex items-center justify-center`
   - Container: `flex flex-col` dengan `max-h-[95vh]`
   - Content: `flex-1 overflow-y-auto`
   - Footer: `flex-shrink-0`

### JavaScript Best Practices
1. **Modular Functions**:
   - Satu file = satu tanggung jawab
   - Export/import functions yang diperlukan
   - Hindari global variables

2. **Event Listeners**:
   - Attach di DOMContentLoaded
   - Remove listener saat tidak diperlukan
   - Gunakan event delegation untuk dynamic elements

3. **API Calls**:
   - Centralize di satu file (e.g., `api-client.js`)
   - Handle errors dengan konsisten
   - Show loading states

### CSS Organization
1. **Naming Convention**:
   - Use BEM: `.modal__header`, `.modal__content`, `.modal__footer`
   - Prefix component: `.stream-modal`, `.edit-modal`
   - Utility classes: Tailwind CSS

2. **File Structure**:
   - Base styles first
   - Component styles
   - Utility/helper classes
   - Media queries at the end

## Implementation Steps

### Step 1: Create Directory Structure
```bash
mkdir -p views/partials/dashboard
mkdir -p views/partials/modals
mkdir -p public/js/dashboard
mkdir -p public/js/modals
mkdir -p public/css
```

### Step 2: Extract Edit Stream Modal
1. Copy HTML dari dashboard.ejs
2. Buat `views/partials/modals/edit-stream-modal.ejs`
3. Include di dashboard: `<%- include('partials/modals/edit-stream-modal') %>`
4. Test functionality

### Step 3: Extract JavaScript
1. Identify function groups
2. Create separate files
3. Add script tags in correct order
4. Test all functionality

### Step 4: Extract CSS
1. Copy styles dari `<style>` tag
2. Create CSS files
3. Link in layout.ejs
4. Remove inline styles

### Step 5: Testing
- [ ] Test New Stream Modal
- [ ] Test Edit Stream Modal
- [ ] Test Stream Actions (start, stop, delete)
- [ ] Test Search & Filters
- [ ] Test Mobile View
- [ ] Test Desktop View
- [ ] Test Browser Compatibility

## Timeline Estimate
- Phase 1 (Modals): 2-3 hours
- Phase 2 (JavaScript): 3-4 hours
- Phase 3 (CSS): 1-2 hours
- Phase 4 (Components): 2-3 hours
- Testing: 2 hours

**Total: 10-14 hours**

## Next Steps
1. ✅ Fix modal structure issues (DONE)
2. Extract Edit Stream Modal
3. Extract JavaScript functions
4. Extract CSS styles
5. Test thoroughly
6. Document changes

---

**Last Updated**: 2025-12-18
**Status**: Phase 1 in progress
