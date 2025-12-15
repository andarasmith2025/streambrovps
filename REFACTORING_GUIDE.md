# Dashboard Refactoring Guide

## Problem
Dashboard.ejs file terlalu panjang (~3300+ lines) dan sulit di-maintain.

## Solution
Memisahkan komponen-komponen besar ke dalam partial files dan external JavaScript.

## Struktur Baru

```
views/
├── dashboard.ejs (main file - 3190 lines)
└── partials/
    ├── quota-card.ejs (✅ Updated - unified design)
    └── stats-cards.ejs (✅ Updated - single row design)

public/js/
└── dashboard-stats.js (✅ Created - quota & notification functions)
```

## Completed Refactoring

### 1. Quota Card Component
**File**: `views/partials/quota-card.ejs`
**Purpose**: Displays unified resources card (Streams, Storage, Disk)
**Features**:
- Mobile: 2-3 column grid layout
- Desktop: Horizontal centered layout with dividers
- No progress bars, only numbers in "X / Y" format
- Disk storage visible to admin only
**Usage**: `<%- include('partials/quota-card') %>`

### 2. Stats Cards Component  
**File**: `views/partials/stats-cards.ejs`
**Purpose**: Displays system statistics (Active Streams, CPU, Memory, Network/Disk)
**Features**:
- Admin-only visibility
- Mobile: 4-column compact grid
- Desktop: Single horizontal row with dividers
- No progress bars, only numbers
- Network/Disk toggle functionality maintained
**Usage**: `<%- include('partials/stats-cards') %>`

### 3. Dashboard Stats JavaScript
**File**: `public/js/dashboard-stats.js`
**Purpose**: Handles quota loading, notifications, and tips modal
**Functions**:
- `loadQuota()` - Fetches and updates quota data
- `refreshQuota()` - Manual quota refresh
- `showNotification()` - Custom notification system
- `closeNotification()` - Close notification modal
- `openTipsStreaming()` - Open streaming tips
- `closeTipsStreaming()` - Close streaming tips
- `backFromTipsStreaming()` - Navigate back from tips
**Usage**: `<script src="/js/dashboard-stats.js"></script>`

## File Size Reduction
- **Before**: 3313 lines
- **After**: 3190 lines
- **Reduction**: 123 lines (3.7%)

## Benefits
- ✅ Easier to maintain and update individual components
- ✅ Reduced code duplication
- ✅ Better code organization
- ✅ Cleaner dashboard.ejs file
- ✅ Separated concerns (HTML partials vs JavaScript)
- ✅ External JavaScript can be cached by browser

## Implementation in Dashboard.ejs

```ejs
<% layout('layout') -%>

<!-- Flash messages -->
<% if (flash) { %>
  <!-- flash message HTML -->
<% } %>

<!-- Include partials -->
<%- include('partials/quota-card') %>
<%- include('partials/stats-cards') %>

<!-- Rest of dashboard content -->
<!-- ... -->

<!-- External JavaScript -->
<script src="/js/dashboard-stats.js"></script>
```

## Future Refactoring Opportunities

The main dashboard script (lines 1005-3190) still contains ~2200 lines of JavaScript for:
- Stream management (create, edit, delete, start, stop)
- Modal handling (new stream, edit stream, templates)
- Video selection and playlist handling
- Schedule management
- Form validation
- Real-time updates

These could be further extracted into separate modules:
- `dashboard-streams.js` - Stream CRUD operations (~500 lines)
- `dashboard-modals.js` - Modal management (~400 lines)
- `dashboard-schedules.js` - Schedule handling (~300 lines)
- `dashboard-videos.js` - Video/playlist selection (~300 lines)
- `dashboard-templates.js` - Template management (~200 lines)

**Potential reduction**: ~1700 lines → Dashboard could be reduced to ~1500 lines

## Testing Checklist

After refactoring, verify:
- ✅ Quota card displays correctly (mobile & desktop)
- ✅ Stats cards display correctly (admin only)
- ✅ JavaScript functions work (loadQuota, refreshQuota)
- ✅ Notifications display correctly
- ✅ Tips modal opens/closes properly
- ✅ Responsive design works on all screen sizes
- ✅ Network/Disk toggle functions correctly

## Notes

- All partial files use current CSS/Tailwind styling
- No functionality changes, only code reorganization
- JavaScript in dashboard.ejs still contains main stream management logic
- External JS file can be cached by browser for better performance
