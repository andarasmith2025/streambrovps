# Modal Issues & Fixes

## Issues Found:

### 1. Manual RTMP Tab
- ❌ RTMP URL input hilang/tidak terlihat
- ❌ Stream Key input hilang/tidak terlihat  
- ❌ Icon mata (show/hide password) tidak bekerja
- ❌ Platform selector dropdown tidak bekerja

### 2. YouTube API Tab
- ❌ Platform selector dropdown tidak bekerja
- ✅ Load stream keys bekerja (dengan deduplication)
- ✅ Thumbnail preview bekerja

## Root Causes:

1. **Fields hilang**: Kemungkinan `manualRtmpFields` div ter-hidden saat switch tab
2. **Icon mata tidak bekerja**: Fungsi `toggleStreamKeyVisibility()` mungkin tidak terdefinisi atau salah target
3. **Platform selector tidak bekerja**: Event listener tidak terpasang karena modal di-load dinamis

## Fixes Needed:

1. Pastikan `switchStreamTab()` function menampilkan/menyembunyikan fields dengan benar
2. Tambahkan inline fallback untuk `toggleStreamKeyVisibility()`
3. Pindahkan event listener platform selector ke fungsi yang dipanggil saat modal dibuka
4. Atau gunakan event delegation untuk handle clicks

## Implementation Plan:

1. ✅ Add inline fallback functions for all modal functions
2. ⏳ Fix switchStreamTab to properly show/hide fields
3. ⏳ Add event delegation for platform selectors (both Manual RTMP and YouTube API)
4. ⏳ Test all functionality
