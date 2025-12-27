# Start Now Feature

## Overview
Tombol "Start Now" memungkinkan user untuk start stream secara manual, mengoverride jadwal otomatis.

## Features

### 1. Tombol "Start Now"
- **Lokasi**: Dashboard, kolom Actions
- **Visibility**: Hanya muncul untuk stream dengan status `offline` atau `stopped`
- **Icon**: ▶️ (play icon)
- **Style**: Green button untuk menunjukkan action positif

### 2. Smart Confirmation
- **Jika stream TIDAK punya schedule aktif**: Start langsung tanpa konfirmasi
- **Jika stream PUNYA schedule aktif**: Muncul konfirmasi dialog
  - Warning: "Stream has active schedule. Starting now will override the schedule."
  - User bisa cancel atau continue

### 3. Backend Logic
- **Endpoint**: `POST /api/streams/:id/start` (existing endpoint, tidak ada perubahan)
- **Flag baru**: `has_active_schedule` di response `/api/streams`
  - `true`: Stream punya schedule yang belum expired
  - `false`: Stream tidak punya schedule atau semua schedule sudah lewat

## Use Cases

### Use Case 1: Emergency Start
Stream dijadwalkan jam 10:00, tapi user perlu start sekarang jam 09:30.
- User klik "Start Now"
- System tanya konfirmasi
- User confirm
- Stream start sekarang, override schedule

### Use Case 2: Missed Schedule
Scheduler gagal start stream karena server restart/error.
- User lihat stream masih offline padahal sudah lewat jadwal
- User klik "Start Now"
- Stream start manual

### Use Case 3: Test Stream
User mau test stream sebelum jadwal sebenarnya.
- User klik "Start Now"
- Stream start untuk testing
- User bisa stop dan schedule tetap aktif untuk nanti

## Files Modified

1. **views/dashboard.ejs**
   - Tambah tombol "Start Now" di action buttons
   - Tambah fungsi `startStreamNow()` dan `executeStartStream()`
   - Kondisi show/hide berdasarkan stream status

2. **app.js**
   - Modifikasi `GET /api/streams` untuk tambah flag `has_active_schedule`
   - Check semua schedules, set flag `true` jika ada schedule yang belum expired

## Safety Features

1. **No Double Start**: Tombol hidden kalau stream sudah live
2. **Confirmation**: User harus confirm kalau ada schedule aktif
3. **Logging**: Semua manual start di-log ke console untuk audit
4. **No Backend Change**: Pakai existing endpoint, tidak ada risk di backend logic

## Testing

### Test 1: Stream tanpa schedule
1. Buat stream baru tanpa schedule
2. Klik "Start Now"
3. ✅ Stream start langsung tanpa konfirmasi

### Test 2: Stream dengan schedule aktif
1. Buat stream dengan schedule
2. Klik "Start Now"
3. ✅ Muncul konfirmasi dialog
4. Klik "Start Now" di dialog
5. ✅ Stream start, override schedule

### Test 3: Stream yang sudah live
1. Start stream
2. ✅ Tombol "Start Now" hidden
3. Hanya ada tombol Edit dan Delete

## Future Enhancements

1. **Role-based access**: Hanya admin yang bisa override schedule
2. **Audit log**: Simpan ke database siapa yang manual start
3. **Schedule pause**: Pause schedule sementara saat manual start
4. **Resume schedule**: Auto-resume schedule setelah manual stop

## Date
26 Desember 2024
