# Stream & Storage Limit Validation Fix

## Masalah yang Ditemukan

1. **Stream Limit Tidak Tervalidasi Saat Create Stream**
   - User bisa membuat stream sebanyak-banyaknya meskipun melebihi `max_concurrent_streams`
   - Validasi hanya dilakukan saat **start stream**, bukan saat **create stream**
   - Contoh: Admin dengan limit 15 stream bisa membuat 17+ stream

2. **Storage Limit Tidak Konsisten**
   - Validasi storage sudah ada tapi tidak konsisten di semua endpoint
   - Tidak ada logging yang jelas untuk debugging

## Solusi yang Diterapkan

### 1. Validasi Stream Limit di Create Stream (`POST /api/streams`)

**Lokasi:** `app.js` line ~2410

```javascript
// ⭐ VALIDATE STREAM LIMIT BEFORE CREATING STREAM
const user = await User.findById(req.session.userId);
if (!user) {
  return res.status(404).json({ success: false, error: 'User not found' });
}

// Count total streams (not just active ones) for this user
const userStreams = await Stream.findAll(req.session.userId);
const totalStreamCount = userStreams ? userStreams.length : 0;
const maxStreams = user.max_concurrent_streams || 1;

console.log(`[CREATE STREAM] Stream limit check: ${totalStreamCount}/${maxStreams} streams`);

if (totalStreamCount >= maxStreams) {
  // Clean up uploaded thumbnail if validation fails
  if (req.file && req.file.path && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path);
    console.log(`[CREATE STREAM] Cleaned up uploaded thumbnail due to stream limit`);
  }
  
  return res.status(403).json({ 
    success: false, 
    error: `Stream limit exceeded. You have ${totalStreamCount}/${maxStreams} streams. Please delete some streams before creating new ones.` 
  });
}
```

**Fitur:**
- ✅ Validasi dilakukan **sebelum** stream dibuat di database
- ✅ Menghitung **total stream** (bukan hanya yang active)
- ✅ Membersihkan file thumbnail yang sudah diupload jika validasi gagal
- ✅ Pesan error yang jelas untuk user
- ✅ Logging untuk debugging

### 2. Perbaikan Validasi Storage Limit

**Lokasi:** `app.js` line ~1790 dan ~1915

**Perbaikan:**
- ✅ Menambahkan logging detail untuk debugging
- ✅ Konsisten di semua endpoint upload (video dan thumbnail)
- ✅ Menghapus file yang sudah diupload jika validasi gagal
- ✅ Pesan error yang konsisten dengan format `success: false`

```javascript
console.log(`[UPLOAD VIDEO] Storage check: Current=${currentGB}GB, New=${newFileGB}GB, Total=${totalGB}GB, Limit=${maxGB}GB`);

if (totalAfterUpload > maxStorageBytes) {
  // Delete the uploaded file since we're rejecting it
  const uploadedFilePath = req.file.path;
  if (fs.existsSync(uploadedFilePath)) {
    fs.unlinkSync(uploadedFilePath);
    console.log(`[UPLOAD VIDEO] Deleted rejected file: ${uploadedFilePath}`);
  }
  
  console.log(`[UPLOAD VIDEO] ❌ Storage limit exceeded: ${currentGB}GB + ${newFileGB}GB > ${maxGB}GB`);
  
  return res.status(413).json({
    success: false,
    error: `Storage limit exceeded. You have used ${currentGB}/${maxGB} GB. This file (${newFileGB} GB) would exceed your limit. Please delete some videos to free up space.`
  });
}

console.log(`[UPLOAD VIDEO] ✅ Storage check passed`);
```

## Cara Kerja

### Stream Limit
1. User mencoba create stream baru
2. System mengambil data user dari database
3. System menghitung **total stream** yang dimiliki user (tidak peduli status)
4. Jika `totalStreamCount >= max_concurrent_streams`, reject dengan error 403
5. Jika ada thumbnail yang sudah diupload, hapus file tersebut
6. Return error message yang jelas ke frontend

### Storage Limit
1. User upload video/thumbnail
2. System menghitung total storage yang sudah digunakan
3. System menghitung total setelah upload: `current + new file size`
4. Jika melebihi limit, hapus file yang baru diupload
5. Return error 413 dengan detail penggunaan storage

## Testing

### Test Stream Limit
1. Login sebagai user dengan `max_concurrent_streams = 2`
2. Buat 2 stream (harus berhasil)
3. Coba buat stream ke-3 (harus ditolak dengan error)
4. Hapus 1 stream
5. Coba buat stream baru (harus berhasil)

### Test Storage Limit
1. Login sebagai user dengan `max_storage_gb = 3`
2. Upload video hingga mendekati 3GB
3. Coba upload video yang akan melebihi 3GB (harus ditolak)
4. Hapus beberapa video
5. Coba upload lagi (harus berhasil)

## Catatan Penting

1. **Stream Limit** menghitung **total stream** (bukan concurrent/active)
   - Ini berbeda dengan `StreamLimiter` yang menghitung concurrent streams saat **start**
   - Alasan: Mencegah user membuat terlalu banyak stream configuration

2. **Storage Limit** dihitung dari **total file size** semua video
   - Thumbnail tidak dihitung dalam storage limit
   - File yang gagal upload akan otomatis dihapus

3. **Cleanup File**
   - Jika validasi gagal, file yang sudah diupload akan dihapus
   - Mencegah file orphan yang memenuhi storage

## Log untuk Debugging

Semua validasi sekarang memiliki logging yang jelas:
- `[CREATE STREAM]` - untuk create stream
- `[UPLOAD VIDEO]` - untuk upload video
- `[UPLOAD THUMBNAIL]` - untuk upload thumbnail

Format log:
```
[CREATE STREAM] Stream limit check: 2/15 streams
[UPLOAD VIDEO] Storage check: Current=5.23GB, New=2.10GB, Total=7.33GB, Limit=10.00GB
[UPLOAD VIDEO] ✅ Storage check passed
```

## Tanggal Perbaikan
26 Desember 2024
