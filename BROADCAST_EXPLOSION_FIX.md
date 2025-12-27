# Fix: Broadcast Explosion Issue

## Masalah
Setiap kali PM2 restart, sistem membuat 3+ broadcast duplikat di YouTube tanpa thumbnail, menghabiskan API quota.

## Root Cause
1. **Race Condition**: Broadcast dibuat di YouTube tapi server crash sebelum save ke database
2. **Recovery Loop**: Saat restart, `streamingService.recoverStreamsAfterRestart()` membuat broadcast baru lagi
3. **Scheduler Retry**: `broadcastScheduler` mencoba buat broadcast untuk schedule yang gagal
4. **Thumbnail Path**: Path relatif gagal saat restart karena working directory berubah

## Solusi Implementasi

### 1. broadcastScheduler.js
**Perubahan:**
- ✅ Cek orphaned broadcast di YouTube SEBELUM buat baru
- ✅ Validasi thumbnail WAJIB ada (skip jika tidak ada untuk save quota)
- ✅ Gunakan absolute path untuk thumbnail
- ✅ Rate limiting 3 detik antar broadcast
- ✅ Query hanya ambil schedule tanpa broadcast_id (tidak retry failed)
- ✅ Cek existing broadcast dari schedule lain (reuse jika ada)

**Fungsi Baru:**
```javascript
// 1. Cek apakah broadcast sudah ada di YouTube (orphaned)
findOrphanedBroadcastInYouTube(schedule)

// 2. Resolve thumbnail path ke absolute path
resolveThumbnailPath(schedule)

// 3. Cek broadcast dari schedule lain untuk stream yang sama
checkExistingBroadcastForStream(streamId)
```

### 2. streamingService.js
**Perubahan:**
- ✅ Saat recovery (`isRecovery=true`), SKIP broadcast creation
- ✅ Hanya buat broadcast baru saat "Start Now" (bukan recovery)

**Logic:**
```javascript
if (scheduleData && scheduleData.youtube_broadcast_id) {
  // Use existing
} else if (!isRecovery) {
  // Create new (only if NOT recovery)
} else {
  // Skip (recovery mode)
}
```

### 3. youtubeService.js
**Sudah ada fix sebelumnya:**
- ✅ Validasi thumbnail exists sebelum buat broadcast
- ✅ Validasi thumbnail size < 2MB
- ✅ Throw error jika thumbnail tidak valid

## Flow Baru

### Saat Schedule Normal (3-5 menit sebelum jam)
1. `broadcastScheduler` cek schedule yang perlu broadcast
2. Cek apakah sudah ada broadcast di YouTube (orphaned) → reuse jika ada
3. Cek apakah stream sudah punya broadcast dari schedule lain → reuse jika ada
4. Validasi thumbnail WAJIB ada → skip jika tidak ada
5. Buat broadcast baru dengan thumbnail
6. Save broadcast_id ke database

### Saat PM2 Restart
1. `recoverStreamsAfterRestart` restart FFmpeg untuk stream yang live
2. Cek apakah schedule punya broadcast_id → gunakan jika ada
3. Jika tidak ada DAN `isRecovery=true` → SKIP broadcast creation
4. Stream tetap jalan tanpa broadcast (user harus manual fix)

### Saat "Start Now"
1. User klik "Start Now"
2. `startStream` dipanggil dengan `isRecovery=false`
3. Cek schedule → jika tidak ada broadcast_id, buat baru
4. Broadcast dibuat dengan thumbnail

## Hasil
- ❌ Tidak ada lagi broadcast duplikat saat restart
- ❌ Tidak ada lagi broadcast tanpa thumbnail
- ✅ Orphaned broadcast di-recover otomatis
- ✅ API quota lebih hemat
- ✅ Thumbnail path reliable dengan absolute path

## Testing
```bash
# 1. Cek broadcast di YouTube vs Database
node check-youtube-api-broadcasts.js

# 2. Cek broadcast explosion
node check-broadcast-explosion.js

# 3. Test restart (seharusnya tidak ada broadcast baru)
pm2 restart streambro
# Tunggu 1 menit, cek lagi
node check-youtube-api-broadcasts.js
```

## Monitoring
```bash
# Cek log broadcast scheduler
pm2 logs streambro | grep BroadcastScheduler

# Cek log recovery
pm2 logs streambro | grep Recovery

# Cek log thumbnail
pm2 logs streambro | grep -i thumbnail
```

## Catatan Penting
1. **Jangan restart PM2 terlalu sering** - Ini penyebab utama masalah
2. **Upload thumbnail sebelum schedule** - Broadcast tidak akan dibuat tanpa thumbnail
3. **Orphaned broadcast akan di-recover otomatis** - Tidak perlu manual delete
4. **Rate limit 3 detik** - Jangan buat banyak schedule bersamaan

## Deployment
```bash
# Upload files
scp services/broadcastScheduler.js root@VPS:/root/streambrovps/services/
scp services/streamingService.js root@VPS:/root/streambrovps/services/

# Restart
ssh root@VPS "cd /root/streambrovps && pm2 restart streambro"
```

## Tanggal Fix
27 Desember 2024 - 21:30 WIB
