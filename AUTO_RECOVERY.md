# Auto-Recovery System

## Overview

StreamBro memiliki sistem auto-recovery yang otomatis me-restart stream yang masih aktif setelah server restart/crash.

## Kapan Auto-Recovery Berjalan?

Auto-recovery berjalan **3 detik** setelah server start, untuk memberi waktu sistem initialize.

## Apa yang Di-Recovery?

### 1. **Manual Streams (Stream Now)** ✅

**Kondisi:**
- Stream dengan status `live`
- Memiliki `start_time`
- Dimulai kurang dari 24 jam yang lalu

**Proses:**
```javascript
1. Cek semua stream dengan status 'live'
2. Hitung elapsed time sejak start
3. Jika < 24 jam → Restart stream
4. Jika > 24 jam → Mark as offline (stream terlalu lama)
```

**Contoh:**
```
Stream A: Started 19:00, Server restart 19:30
→ Elapsed: 30 minutes
→ ✅ Auto-recover

Stream B: Started yesterday 10:00, Server restart today 11:00
→ Elapsed: 25 hours
→ ❌ Too old, mark as offline
```

### 2. **Scheduled Streams** ✅

**Kondisi:**
- Schedule dengan status `pending` atau `active`
- Masih dalam time window (start_time - end_time)
- Recurring atau one-time schedule

**Proses:**
```javascript
1. Cek semua schedule yang pending/active
2. Cek apakah sekarang masih dalam jadwal
3. Hitung sisa durasi
4. Restart stream dengan sisa durasi
```

**Contoh:**
```
Schedule: 18:00-20:00 (duration: 120 minutes)
Server restart: 19:00
→ Elapsed: 60 minutes
→ Remaining: 60 minutes
→ ✅ Auto-recover dengan durasi 60 menit
```

## Logs

### Successful Recovery

```
[Recovery] Starting auto-recovery for active streams...
[Recovery] Checking for manual streams to recover...
[Recovery] Recovering manual stream abc123 (My Stream), elapsed: 30 minutes
[Recovery] ✓ Successfully recovered manual stream abc123
[Recovery] ✓ Recovered 1 manual stream(s)

[Recovery] Checking for scheduled streams to recover...
[Recovery] Found 2 schedule(s) to check
[Recovery] Recurring schedule xyz789 should be active now (18:00 - 20:00)
[Recovery] Recovering stream xyz789 (Scheduled Stream)
[Recovery] ✓ Successfully recovered stream xyz789, remaining: 60 minutes
[Recovery] ✓ Successfully recovered 1 stream(s)
```

### No Recovery Needed

```
[Recovery] Starting auto-recovery for active streams...
[Recovery] Checking for manual streams to recover...
[Recovery] Checking for scheduled streams to recover...
[Recovery] No active schedules found to recover
```

### Recovery Failed

```
[Recovery] Failed to recover manual stream abc123: Stream not found
[Recovery] Failed to recover schedule xyz789: FFmpeg error
```

## Limitasi

### ❌ **Tidak Di-Recovery:**

1. **Stream yang sudah selesai**
   - Schedule yang sudah lewat end_time
   - Manual stream > 24 jam

2. **Stream dengan error**
   - Video file tidak ditemukan
   - RTMP URL invalid
   - FFmpeg error

3. **Stream yang di-stop manual**
   - User klik "Stop" sebelum restart
   - Status sudah 'offline'

### ✅ **Di-Recovery:**

1. **Manual streams** (< 24 jam)
2. **Scheduled streams** (masih dalam jadwal)
3. **Recurring streams** (hari dan jam sesuai)

## Configuration

### Timeout Recovery

```javascript
// app.js
setTimeout(async () => {
  await streamingService.recoverActiveStreams();
}, 3000); // 3 seconds delay
```

### Max Age untuk Manual Stream

```javascript
// services/streamingService.js
if (elapsedMinutes < 1440) { // 24 hours = 1440 minutes
  // Recover stream
}
```

## Testing Auto-Recovery

### Test 1: Manual Stream Recovery

```bash
# 1. Start manual stream di dashboard
# 2. Di SSH, restart server
pm2 restart streambro

# 3. Lihat logs
pm2 logs streambro | grep Recovery

# Expected:
# [Recovery] Recovering manual stream...
# [Recovery] ✓ Successfully recovered manual stream
```

### Test 2: Scheduled Stream Recovery

```bash
# 1. Buat schedule: 18:00-20:00
# 2. Start stream (jam 18:00)
# 3. Restart server (jam 19:00)
pm2 restart streambro

# 4. Lihat logs
pm2 logs streambro | grep Recovery

# Expected:
# [Recovery] Recovering stream..., remaining: 60 minutes
# [Recovery] ✓ Successfully recovered stream
```

### Test 3: No Recovery (Stream Selesai)

```bash
# 1. Buat schedule: 18:00-19:00
# 2. Start stream
# 3. Restart server (jam 19:30) - sudah lewat jadwal
pm2 restart streambro

# 4. Lihat logs
pm2 logs streambro | grep Recovery

# Expected:
# [Recovery] No active schedules found to recover
```

## Benefits

✅ **Zero manual intervention** - Stream otomatis restart
✅ **Preserve duration** - Scheduled stream lanjut dengan sisa waktu
✅ **Robust** - Handle server crash/restart
✅ **Smart** - Tidak restart stream yang sudah selesai

## Monitoring

### Check Recovery Status

```bash
# Lihat logs recovery
pm2 logs streambro --lines 100 | grep Recovery

# Lihat stream aktif
pm2 logs streambro | grep "Active streams"

# Monitor real-time
pm2 logs streambro
```

### Dashboard

Setelah recovery, cek dashboard:
- Stream status harus `live`
- Timer harus jalan
- Stats harus update

## Troubleshooting

### Stream Tidak Auto-Recover

**Kemungkinan penyebab:**
1. Stream sudah lewat jadwal
2. Video file tidak ditemukan
3. RTMP URL/key invalid
4. Resource limit tercapai

**Solusi:**
```bash
# Cek logs error
pm2 logs streambro --err

# Cek database
sqlite3 db/streambro.db "SELECT id, title, status, start_time FROM streams WHERE status='live';"

# Manual restart stream di dashboard
```

### Recovery Terlalu Lama

Jika recovery > 10 detik:
1. Terlalu banyak stream aktif
2. Video file besar
3. Server resource terbatas

**Solusi:**
- Batasi jumlah concurrent streams
- Optimize video files
- Upgrade server resources

## Future Enhancements

- [ ] Configurable recovery timeout
- [ ] Recovery retry mechanism
- [ ] Recovery notification (email/webhook)
- [ ] Recovery statistics dashboard
- [ ] Selective recovery (by user/priority)
