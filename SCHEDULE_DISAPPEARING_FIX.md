# Fix: Schedule Disappearing Issue

## Problem
Jadwal hilang dari tampilan dashboard ketika user klik tombol Stop atau Delete stream.

## Root Cause
Fungsi `stopStream()`, `cancelSchedule()`, dan `deleteStream()` menggunakan `window.location.reload()` untuk refresh halaman setelah operasi berhasil. Ini menyebabkan:

1. **Race Condition**: Reload terjadi sebelum database selesai update
2. **Cache Issue**: Browser cache masih menyimpan data lama
3. **Timing Issue**: Auto-refresh interval bertabrakan dengan reload

## Solution
Mengganti `window.location.reload()` dengan `loadStreams(true)` yang:
- Langsung fetch data terbaru dari API tanpa reload halaman
- Menghindari cache browser
- Lebih cepat dan smooth (no page flicker)
- Tidak mengganggu auto-refresh interval

## Changes Made

### File: `views/dashboard.ejs`

**Before:**
```javascript
.then(data => {
  if (data.success) {
    showNotification('Success!', 'Stream stopped successfully!', 'success');
    setTimeout(() => window.location.reload(), 1000);
  }
})
```

**After:**
```javascript
.then(data => {
  if (data.success) {
    showNotification('Success!', 'Stream stopped successfully!', 'success');
    setTimeout(() => {
      console.log('[Stop Stream] Reloading streams data...');
      loadStreams(true);
    }, 500);
  }
})
```

## Functions Updated
1. `stopStream(streamId)` - Stop live stream
2. `cancelSchedule(streamId)` - Cancel scheduled stream
3. `deleteStream(streamId)` - Delete stream

## Testing
1. Buat stream dengan jadwal
2. Klik tombol Stop atau Delete
3. Verifikasi jadwal tetap muncul di list (tidak hilang)
4. Verifikasi data ter-update dengan benar

## Commit
```
git commit -m "Fix: Replace window.location.reload() with loadStreams() to prevent schedule disappearing issue"
```

## Date
December 20, 2025
