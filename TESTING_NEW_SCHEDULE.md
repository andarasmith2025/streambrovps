# Testing New Schedule - Panduan Lengkap

## ⚠️ PENTING: Test 1 Schedule Dulu!
Jangan buat banyak schedule sekaligus. Test 1 dulu untuk memastikan fix bekerja.

## Persiapan Test

### 1. Pilih Stream untuk Test
- Pilih 1 stream yang sudah punya thumbnail
- Pastikan stream sudah connect ke YouTube API
- Pastikan video/playlist sudah ready

### 2. Setting Schedule
- **Waktu**: 5-10 menit dari sekarang (jangan terlalu dekat)
- **Duration**: 10-15 menit (cukup untuk test)
- **Auto Start**: ENABLE (untuk test broadcast creation)
- **Auto Stop**: ENABLE (untuk test auto stop)

### 3. Sebelum Schedule Jalan

Buka 3 terminal/tab:

**Terminal 1 - Monitor PM2 Logs:**
```bash
ssh root@85.9.195.103
cd /root/streambrovps
pm2 logs streambro --lines 0
```

**Terminal 2 - Monitor Database:**
```bash
ssh root@85.9.195.103
cd /root/streambrovps
# Siap untuk cek database
```

**Terminal 3 - YouTube Studio:**
- Buka: https://studio.youtube.com
- Tab: Live
- Siap untuk monitor broadcast

## Timeline yang Diharapkan

### T-5 menit (5 menit sebelum schedule)
**Yang TIDAK terjadi:**
- ❌ Broadcast TIDAK dibuat (ini yang baru!)
- ❌ Tidak ada log dari broadcastScheduler

**Cek:**
```bash
# Terminal 2
node check-all-users-schedules.js
# Pastikan broadcast_id masih NULL
```

### T-0 (Waktu schedule)
**Yang terjadi:**
1. ✅ Scheduler detect schedule time
2. ✅ FFmpeg starts
3. ✅ Log: "Starting stream..."

**Log yang diharapkan:**
```
[Scheduler] ✓ Recurring schedule matched: [stream_id]
[Scheduler] Starting stream: [stream_id] - [title]
[StreamingService] Starting stream with command: ffmpeg...
```

### T+30s - T+2m (FFmpeg connecting)
**Yang terjadi:**
1. ✅ FFmpeg connecting to YouTube
2. ✅ Background task waiting for stream active
3. ✅ Log: "Waiting for FFmpeg to connect..."

**Log yang diharapkan:**
```
[StreamingService] ========== NEW BROADCAST FLOW ==========
[StreamingService] Will create broadcast AFTER FFmpeg connects
[StreamingService] Waiting for FFmpeg to connect to YouTube...
[StreamingService] ✓ Found YouTube stream ID: [stream_id]
[StreamingService] Waiting for stream to become active...
```

### T+2m - T+3m (Stream active, broadcast created)
**Yang terjadi:**
1. ✅ FFmpeg connected, stream status = "active"
2. ✅ Broadcast created (SEKARANG baru dibuat!)
3. ✅ Transition to live immediately

**Log yang diharapkan:**
```
[StreamingService] ✅ FFmpeg is connected and stream is ACTIVE!
[StreamingService] Now creating broadcast...
[StreamingService] ✅ Broadcast created successfully
[StreamingService] Auto-start enabled, transitioning to live...
[StreamingService] ✅ Broadcast transitioned to LIVE successfully!
[StreamingService] ========== BROADCAST FLOW COMPLETE ==========
```

**Cek YouTube Studio:**
- ✅ Broadcast muncul dengan status "LIVE" (bukan "ready" atau "complete")
- ✅ Viewer count mulai muncul

**Cek Database:**
```bash
# Terminal 2
sqlite3 streambro.db "SELECT id, title, status, youtube_broadcast_id FROM streams WHERE status = 'live';"
```
- ✅ Status = "live"
- ✅ youtube_broadcast_id terisi

### T+10m - T+15m (Auto stop)
**Yang terjadi:**
1. ✅ Duration check detect end time
2. ✅ Stream stopped automatically
3. ✅ Broadcast transitioned to "complete"

**Log yang diharapkan:**
```
[Duration Check] 🛑 Stream [id] exceeded end time by 0 minutes!
[Duration Check] 🛑 Stopping stream now...
[StreamingService] Stopping active stream [id]
[YouTube VOD] 🎬 Starting optimization for broadcast [id]...
[YouTube VOD] ✅ Broadcast transitioned to complete
```

## Tanda-Tanda SUKSES ✅

1. **Broadcast dibuat SETELAH FFmpeg connect** (bukan 5 menit sebelumnya)
2. **Transition to live SUKSES** (tidak ada "Invalid transition" error)
3. **Database sync dengan YouTube** (keduanya "live" bersamaan)
4. **Auto stop bekerja** (stream stop sesuai duration)
5. **Tidak ada broadcast spam** (hanya 1 broadcast dibuat)

## Tanda-Tanda GAGAL ❌

### Jika FFmpeg tidak connect:
```
[StreamingService] ❌ Stream did not become active after 3 minutes
[StreamingService] ❌ FFmpeg may have failed to connect
[StreamingService] ❌ Broadcast creation aborted to save API quota
```
**Solusi:** Cek FFmpeg logs, mungkin masalah network atau stream key

### Jika broadcast creation gagal:
```
[StreamingService] ❌ Error in broadcast creation flow: [error]
[StreamingService] Stream will continue without YouTube broadcast
```
**Solusi:** Cek error message, mungkin masalah token atau thumbnail

### Jika transition gagal:
```
[StreamingService] ⚠️ Failed to transition: [error]
[StreamingService] Broadcast created but may need manual activation
```
**Solusi:** Cek YouTube Studio, mungkin perlu manual start

## Monitoring Commands

### Cek stream status:
```bash
sqlite3 streambro.db "SELECT id, title, status, youtube_broadcast_id, scheduled_end_time FROM streams WHERE status = 'live';"
```

### Cek schedule status:
```bash
node check-all-users-schedules.js
```

### Cek PM2 restart count:
```bash
pm2 list
# Lihat kolom "restart" - harusnya masih 187
```

### Cek FFmpeg process:
```bash
ps aux | grep ffmpeg
```

## Jika Test GAGAL

### 1. Stop stream immediately:
```bash
# Via dashboard atau:
sqlite3 streambro.db "UPDATE streams SET status = 'offline', manual_stop = 1 WHERE status = 'live';"
pm2 restart streambro
```

### 2. Cek logs untuk error:
```bash
pm2 logs streambro --lines 200 --nostream > test-error.log
cat test-error.log
```

### 3. Report error ke saya dengan:
- Error message dari logs
- Timeline kapan error terjadi
- Screenshot YouTube Studio (jika ada broadcast)

## Jika Test SUKSES

### 1. Verify hasil:
- ✅ Broadcast created AFTER FFmpeg active
- ✅ Transition to live successful
- ✅ Auto stop worked
- ✅ No spam, no errors

### 2. Baru boleh:
- Enable auto-start untuk stream lain
- Buat schedule untuk stream lain
- Tapi tetap bertahap (jangan langsung banyak)

### 3. Monitor terus:
- Cek PM2 restart count (jangan sampai naik)
- Cek YouTube Studio (jangan ada broadcast spam)
- Cek logs (jangan ada error berulang)

## Tips Keamanan

1. **Jangan test saat jam sibuk** - Test saat traffic rendah
2. **Siapkan backup plan** - Siap stop manual jika gagal
3. **Monitor ketat** - Jangan tinggal saat test
4. **Catat semua** - Screenshot logs dan YouTube Studio
5. **Bertahap** - Sukses 1 test, baru tambah 1 lagi

## Contact

Jika ada masalah saat test, segera:
1. Stop stream
2. Screenshot error
3. Save logs
4. Report ke saya

**INGAT: Better safe than banned!** 🛡️
