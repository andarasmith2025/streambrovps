# ANALISIS SISTEM STREAMING - LAPORAN IDENTIFIKASI

**Tanggal Analisis:** 13 Desember 2025  
**Sistem:** StreamBro - Live Streaming Platform

---

## 1. PENGGUNAAN STREAMCOPY UNTUK STREAM BIASA (MANUAL DAN API)

### ✅ STATUS: **SUDAH DIIMPLEMENTASI DENGAN BENAR**

#### Bukti Implementasi:

**File:** `services/streamingService.js` (Baris 169-186)

```javascript
if (!stream.use_advanced_settings) {
    // Stream copy mode - video must be pre-encoded with proper bitrate
    // Recommended: 2500-4000 kbps for 720p, 4000-6000 kbps for 1080p
    return [
      '-hwaccel', 'auto',
      '-loglevel', 'error',
      '-re',
      '-stream_loop', loopValue,
      '-fflags', '+genpts+igndts',
      '-avoid_negative_ts', 'make_zero',
      '-i', videoPath,
      '-c:v', 'copy',        // ✅ VIDEO STREAMCOPY
      '-c:a', 'copy',        // ✅ AUDIO STREAMCOPY
      '-flags', '+global_header',
      '-bsf:v', 'h264_mp4toannexb',
      '-bufsize', '6M',
      '-max_muxing_queue_size', '9999',
      '-f', 'flv',
      rtmpUrl
    ];
}
```

#### Untuk Playlist (Baris 96-115):

```javascript
if (!stream.use_advanced_settings) {
    // Stream copy mode for playlist
    return [
      '-hwaccel', 'auto',
      '-loglevel', 'error',
      '-re',
      '-fflags', '+genpts+igndts',
      '-avoid_negative_ts', 'make_zero',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-c:v', 'copy',        // ✅ VIDEO STREAMCOPY
      '-c:a', 'copy',        // ✅ AUDIO STREAMCOPY
      '-flags', '+global_header',
      '-bsf:v', 'h264_mp4toannexb',
      '-bufsize', '6M',
      '-max_muxing_queue_size', '9999',
      '-f', 'flv',
      rtmpUrl
    ];
}
```

### Kesimpulan Poin 1:
- ✅ **Streamcopy sudah digunakan** untuk mode non-advanced (stream biasa)
- ✅ Berlaku untuk **video tunggal** dan **playlist**
- ✅ Berlaku untuk **manual stream** dan **API stream**
- ✅ Hanya menggunakan encoding (libx264) jika `use_advanced_settings = true`

---

## 2. THREAD/PROCESS MANAGEMENT SAAT EKSEKUSI STREAM

### ⚠️ STATUS: **PERLU PERBAIKAN - ADA POTENSI MASALAH**

#### Analisis Thread Management:

**File:** `services/streamingService.js`

##### ✅ Yang Sudah Benar:

1. **Menggunakan Map untuk tracking** (Baris 16):
```javascript
const activeStreams = new Map();
```

2. **Process spawning dengan detached mode** (Baris 234-237):
```javascript
const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});
```

3. **Unref untuk background execution** (Baris 240-242):
```javascript
// Unref the process so Node.js doesn't wait for it
// This allows FFmpeg to continue running even if Node.js exits
ffmpegProcess.unref();
```

##### ❌ MASALAH YANG DITEMUKAN:

### **MASALAH #1: DOUBLE UNREF**
**Lokasi:** Baris 240 dan 298
```javascript
ffmpegProcess.unref();  // Baris 240
// ... kode lain ...
ffmpegProcess.unref();  // Baris 298 (DUPLIKAT!)
```
**Dampak:** Tidak berbahaya tapi redundant dan tidak efisien.

### **MASALAH #2: TIDAK ADA CLEANUP UNTUK CONCURRENT STREAMS**
**Lokasi:** `services/streamingService.js`

**Masalah:**
- Tidak ada batasan jumlah stream concurrent per user
- Tidak ada cleanup untuk zombie processes
- Tidak ada monitoring resource usage per stream

**Contoh Skenario Bermasalah:**
```
User A memulai 10 stream sekaligus
→ 10 FFmpeg processes berjalan
→ Tidak ada limit checking
→ Bisa overload CPU/RAM
```

### **MASALAH #3: RACE CONDITION PADA STOP STREAM**
**Lokasi:** Baris 327-334
```javascript
manuallyStoppingStreams.add(streamId);
try {
  ffmpegProcess.kill('SIGTERM');
} catch (killError) {
  console.error(`[StreamingService] Error killing FFmpeg process: ${killError.message}`);
  manuallyStoppingStreams.delete(streamId);  // ❌ Hanya dihapus jika error
}
```

**Masalah:** Jika kill berhasil tapi process belum exit, `manuallyStoppingStreams` tidak dibersihkan sampai event 'exit' dipanggil. Ini bisa menyebabkan memory leak jika process hang.

### **MASALAH #4: TIDAK ADA TIMEOUT UNTUK STREAM TERMINATION**
Ketika `stopStream()` dipanggil, tidak ada timeout untuk memastikan process benar-benar berhenti.

**Rekomendasi:**
```javascript
// Tambahkan timeout setelah SIGTERM
setTimeout(() => {
  if (activeStreams.has(streamId)) {
    console.log(`[StreamingService] Force killing stream ${streamId} with SIGKILL`);
    try {
      ffmpegProcess.kill('SIGKILL');
    } catch (e) {
      console.error(`Failed to force kill: ${e.message}`);
    }
  }
}, 5000); // 5 detik timeout
```

### Kesimpulan Poin 2:
- ⚠️ **Thread management ada tapi TIDAK OPTIMAL**
- ❌ Tidak ada limit concurrent streams
- ❌ Tidak ada cleanup untuk zombie processes
- ❌ Potensi race condition pada stop
- ❌ Tidak ada force kill mechanism

---

## 3. EKSEKUSI END TIME DAN ISOLASI ANTAR STREAM

### ✅ STATUS: **SUDAH DIIMPLEMENTASI DENGAN BAIK**

#### Analisis End Time Execution:

**File:** `services/schedulerService.js`

##### ✅ Mekanisme End Time:

1. **Scheduled Termination dengan Map** (Baris 7):
```javascript
const scheduledTerminations = new Map();
```

2. **Schedule Termination Function** (Baris 115-141):
```javascript
function scheduleStreamTermination(streamId, durationMinutes) {
  // Clear existing timeout jika ada
  if (scheduledTerminations.has(streamId)) {
    clearTimeout(scheduledTerminations.get(streamId));
  }
  
  const clampedMinutes = Math.max(0, durationMinutes);
  const durationMs = clampedMinutes * 60 * 1000;
  
  const timeoutId = setTimeout(async () => {
    try {
      console.log(`Terminating stream ${streamId} after ${clampedMinutes} minute duration`);
      await streamingService.stopStream(streamId);
      scheduledTerminations.delete(streamId);  // ✅ Cleanup setelah stop
    } catch (error) {
      console.error(`Error terminating stream ${streamId}:`, error);
    }
  }, durationMs);
  
  scheduledTerminations.set(streamId, timeoutId);  // ✅ Per-stream timeout
}
```

3. **Cancel Mechanism** (Baris 143-152):
```javascript
function cancelStreamTermination(streamId) {
  if (scheduledTerminations.has(streamId)) {
    clearTimeout(scheduledTerminations.get(streamId));
    scheduledTerminations.delete(streamId);
    console.log(`Cancelled scheduled termination for stream ${streamId}`);
    return true;
  }
  return false;
}
```

##### ✅ Isolasi Antar Stream:

**File:** `services/streamingService.js` (Baris 243-245)
```javascript
activeStreams.set(streamId, ffmpegProcess);  // ✅ Setiap stream punya process sendiri
```

**File:** `services/schedulerService.js` (Baris 7)
```javascript
const scheduledTerminations = new Map();  // ✅ Setiap stream punya timeout sendiri
```

#### Pengujian Skenario:

**Skenario 1: Manual Stream + Scheduled Stream**
```
Stream A (Manual, no duration) → Berjalan terus
Stream B (Scheduled, 30 menit) → Auto stop setelah 30 menit
```
✅ **AMAN:** Setiap stream punya entry terpisah di Map

**Skenario 2: User Tekan Stop Saat Stream Berjalan**
```javascript
// File: services/streamingService.js (Baris 327)
manuallyStoppingStreams.add(streamId);  // ✅ Tandai sebagai manual stop
ffmpegProcess.kill('SIGTERM');

// File: services/schedulerService.js
schedulerService.handleStreamStopped(streamId);  // ✅ Cancel timeout
```

**Skenario 3: Multiple Scheduled Streams**
```
Stream A: 10:00 - 10:30 (30 menit)
Stream B: 10:15 - 10:45 (30 menit)
Stream C: 10:20 - 11:00 (40 menit)
```
✅ **AMAN:** Setiap stream punya:
- Process ID terpisah di `activeStreams` Map
- Timeout ID terpisah di `scheduledTerminations` Map

#### ⚠️ POTENSI MASALAH MINOR:

**MASALAH #1: Tidak Ada Validasi Overlap Schedule**
Sistem tidak mencegah user membuat schedule yang overlap untuk stream yang sama.

**MASALAH #2: Cleanup Tidak Sempurna Saat Server Restart**
```javascript
// File: services/schedulerService.js (Baris 154-169)
function clearAll() {
  terminationTimers.forEach((timer, streamId) => {  // ❌ Variable tidak ada!
    clearTimeout(timer);
  });
  terminationTimers.clear();  // ❌ Harusnya scheduledTerminations
  
  scheduleCheckIntervals.forEach((interval, streamId) => {  // ❌ Variable tidak ada!
    clearInterval(interval);
  });
  scheduleCheckIntervals.clear();  // ❌ Variable tidak konsisten
}
```

**BUG DITEMUKAN:** Function `clearAll()` menggunakan variable yang tidak dideklarasikan!

### Kesimpulan Poin 3:
- ✅ **End time AKAN ter-eksekusi dengan benar**
- ✅ **Isolasi antar stream SUDAH BAIK** (menggunakan Map per-stream)
- ✅ Manual stop TIDAK mengganggu stream lain
- ✅ Scheduled stop TIDAK mengganggu stream lain
- ❌ **BUG:** Function `clearAll()` menggunakan variable yang salah
- ⚠️ Tidak ada validasi overlap schedule

---

## 4. OPTIMASI PENGGUNAAN RAM DAN CPU

### ❌ STATUS: **BELUM DIOPTIMASI DENGAN BAIK**

#### Analisis Resource Usage:

##### ✅ Yang Sudah Dioptimasi:

1. **Streamcopy Mode** (Mengurangi CPU usage):
```javascript
'-c:v', 'copy',  // Tidak ada encoding → CPU rendah
'-c:a', 'copy',
```

2. **Hardware Acceleration**:
```javascript
'-hwaccel', 'auto',  // Gunakan GPU jika tersedia
```

3. **Buffer Management**:
```javascript
'-bufsize', '6M',  // Buffer 6MB untuk stabilitas
'-max_muxing_queue_size', '9999',
```

4. **Process Unref** (Mengurangi memory overhead):
```javascript
ffmpegProcess.unref();  // Tidak block Node.js event loop
```

##### ❌ MASALAH OPTIMASI:

### **MASALAH #1: TIDAK ADA LIMIT CONCURRENT STREAMS**

**Dampak:**
- User bisa start 100 stream sekaligus
- Setiap FFmpeg process: ~50-200MB RAM
- 100 streams = 5-20GB RAM!

**Rekomendasi:**
```javascript
// Tambahkan di services/streamingService.js
const MAX_CONCURRENT_STREAMS_PER_USER = 5;
const MAX_CONCURRENT_STREAMS_GLOBAL = 20;

async function startStream(streamId) {
  // Check user limit
  const userStreams = Array.from(activeStreams.keys()).filter(async id => {
    const stream = await Stream.findById(id);
    return stream && stream.user_id === currentUserId;
  });
  
  if (userStreams.length >= MAX_CONCURRENT_STREAMS_PER_USER) {
    return { 
      success: false, 
      error: `Maximum ${MAX_CONCURRENT_STREAMS_PER_USER} concurrent streams per user` 
    };
  }
  
  // Check global limit
  if (activeStreams.size >= MAX_CONCURRENT_STREAMS_GLOBAL) {
    return { 
      success: false, 
      error: 'Server at maximum capacity. Please try again later.' 
    };
  }
  
  // ... rest of code
}
```

### **MASALAH #2: TIDAK ADA MONITORING RESOURCE USAGE**

**File:** `services/systemMonitor.js` (Sudah ada tapi tidak digunakan!)

Sistem sudah punya `systemMonitor` tapi tidak diintegrasikan dengan streaming service.

**Rekomendasi:**
```javascript
// Tambahkan monitoring per stream
const streamResourceUsage = new Map();

// Saat start stream
const monitorInterval = setInterval(async () => {
  const usage = await getProcessResourceUsage(ffmpegProcess.pid);
  streamResourceUsage.set(streamId, usage);
  
  // Alert jika usage terlalu tinggi
  if (usage.cpu > 80 || usage.memory > 500 * 1024 * 1024) {
    console.warn(`[StreamingService] High resource usage for stream ${streamId}:`, usage);
  }
}, 30000); // Check setiap 30 detik
```

### **MASALAH #3: MEMORY LEAK PADA LOG STORAGE**

**File:** `services/streamingService.js` (Baris 18-19)
```javascript
const streamLogs = new Map();
const MAX_LOG_LINES = 100;
```

**Masalah:**
- Log disimpan di memory (Map)
- Tidak ada cleanup saat stream stop
- Jika 100 streams, masing-masing 100 log lines = 10,000 log entries di RAM!

**Bukti:**
```javascript
// Baris 32-42: Log ditambahkan
function addStreamLog(streamId, message) {
  if (!streamLogs.has(streamId)) {
    streamLogs.set(streamId, []);
  }
  const logs = streamLogs.get(streamId);
  logs.push({
    timestamp: new Date().toISOString(),
    message
  });
  if (logs.length > MAX_LOG_LINES) {
    logs.shift();  // ✅ Ada limit per stream
  }
}

// ❌ TIDAK ADA CLEANUP SAAT STREAM STOP!
async function stopStream(streamId) {
  // ... stop logic ...
  // ❌ streamLogs.delete(streamId); // TIDAK ADA!
}
```

**Rekomendasi:**
```javascript
async function stopStream(streamId) {
  // ... existing stop logic ...
  
  // Cleanup logs
  streamLogs.delete(streamId);
  streamRetryCount.delete(streamId);
  
  return { success: true, message: 'Stream stopped successfully' };
}
```

### **MASALAH #4: TIDAK ADA CLEANUP UNTUK TEMPORARY FILES**

**File:** `services/streamingService.js` (Baris 77-78)
```javascript
const concatFile = path.join(projectRoot, 'temp', `playlist_${stream.id}.txt`);
fs.writeFileSync(concatFile, concatContent);
```

**Masalah:**
- File temporary dibuat untuk playlist
- ✅ Ada cleanup saat stop (Baris 345-352)
- ❌ TAPI tidak ada cleanup jika server crash!

**Rekomendasi:**
```javascript
// Tambahkan cleanup saat startup
async function cleanupOrphanedTempFiles() {
  const tempDir = path.join(__dirname, '..', 'temp');
  const files = fs.readdirSync(tempDir);
  
  for (const file of files) {
    if (file.startsWith('playlist_') && file.endsWith('.txt')) {
      const streamId = file.replace('playlist_', '').replace('.txt', '');
      
      // Check if stream is active
      if (!activeStreams.has(streamId)) {
        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
        console.log(`[Cleanup] Removed orphaned temp file: ${file}`);
      }
    }
  }
}

// Call saat startup
cleanupOrphanedTempFiles();
```

### **MASALAH #5: ADVANCED MODE TIDAK OPTIMAL**

**File:** `services/streamingService.js` (Baris 188-217)
```javascript
// Advanced mode dengan encoding
return [
  '-hwaccel', 'auto',
  '-loglevel', 'error',
  '-re',
  '-stream_loop', loopValue,
  '-fflags', '+genpts',
  '-avoid_negative_ts', 'make_zero',
  '-i', videoPath,
  '-c:v', 'libx264',
  '-preset', 'veryfast',  // ⚠️ Bisa lebih cepat dengan 'ultrafast'
  '-tune', 'zerolatency',
  '-b:v', `${bitrate}k`,
  '-maxrate', `${bitrate}k`,
  '-bufsize', `${bitrate * 2}k`,
  '-pix_fmt', 'yuv420p',
  '-g', `${fps * 2}`,
  '-keyint_min', fps.toString(),
  '-sc_threshold', '0',
  '-s', resolution,
  '-r', fps.toString(),
  '-c:a', 'aac',
  '-b:a', '128k',
  '-ar', '44100',
  '-max_muxing_queue_size', '9999',
  '-muxdelay', '0',
  '-muxpreload', '0',
  '-f', 'flv',
  rtmpUrl
];
```

**Masalah:**
- Preset `veryfast` masih cukup berat untuk CPU
- Tidak ada opsi untuk menggunakan hardware encoder (h264_nvenc, h264_qsv, h264_videotoolbox)

**Rekomendasi:**
```javascript
// Deteksi hardware encoder yang tersedia
function getAvailableHardwareEncoder() {
  // Check NVIDIA
  if (hasNvidiaGPU()) return 'h264_nvenc';
  
  // Check Intel Quick Sync
  if (hasIntelQSV()) return 'h264_qsv';
  
  // Check Apple VideoToolbox (macOS)
  if (process.platform === 'darwin') return 'h264_videotoolbox';
  
  // Fallback to software
  return 'libx264';
}

// Gunakan di advanced mode
const encoder = getAvailableHardwareEncoder();
const preset = encoder === 'libx264' ? 'ultrafast' : 'default';

return [
  // ...
  '-c:v', encoder,
  '-preset', preset,
  // ...
];
```

### **MASALAH #6: TIDAK ADA GRACEFUL SHUTDOWN**

**File:** `app.js` - Tidak ada handler untuk SIGTERM/SIGINT

**Masalah:**
- Saat server di-stop (Ctrl+C atau kill), semua FFmpeg process menjadi orphan
- Tidak ada cleanup untuk active streams

**Rekomendasi:**
```javascript
// Tambahkan di app.js
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  
  // Stop all active streams
  const activeStreamIds = streamingService.getActiveStreams();
  for (const streamId of activeStreamIds) {
    console.log(`[Server] Stopping stream ${streamId}...`);
    await streamingService.stopStream(streamId);
  }
  
  // Clear all schedulers
  schedulerService.clearAll();
  
  console.log('[Server] Graceful shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  // Same as SIGTERM
  process.exit(0);
});
```

### Kesimpulan Poin 4:
- ⚠️ **Optimasi RAM dan CPU BELUM MAKSIMAL**
- ✅ Streamcopy mode sudah mengurangi CPU usage
- ✅ Hardware acceleration sudah diaktifkan
- ❌ **TIDAK ADA LIMIT** concurrent streams
- ❌ **MEMORY LEAK** pada log storage
- ❌ **TIDAK ADA MONITORING** resource usage per stream
- ❌ **TIDAK ADA GRACEFUL SHUTDOWN**
- ❌ Advanced mode tidak menggunakan hardware encoder
- ⚠️ Temporary files bisa menumpuk jika server crash

---

## RINGKASAN TEMUAN

### ✅ SUDAH BAIK:
1. ✅ Streamcopy sudah digunakan untuk mode non-advanced
2. ✅ Isolasi antar stream sudah baik (Map-based)
3. ✅ End time execution sudah bekerja dengan benar
4. ✅ Hardware acceleration sudah diaktifkan
5. ✅ Process detached dan unref untuk background execution

### ❌ PERLU PERBAIKAN SEGERA:
1. ❌ **CRITICAL:** Tidak ada limit concurrent streams (bisa overload server)
2. ❌ **CRITICAL:** Memory leak pada log storage
3. ❌ **CRITICAL:** Bug pada function `clearAll()` di schedulerService.js
4. ❌ **HIGH:** Tidak ada graceful shutdown
5. ❌ **HIGH:** Tidak ada monitoring resource usage
6. ❌ **MEDIUM:** Tidak ada force kill mechanism untuk stuck processes
7. ❌ **MEDIUM:** Advanced mode tidak menggunakan hardware encoder
8. ❌ **LOW:** Double unref (redundant)
9. ❌ **LOW:** Tidak ada cleanup untuk orphaned temp files saat startup

---

## REKOMENDASI PRIORITAS

### PRIORITAS 1 (CRITICAL - Harus diperbaiki segera):
1. Tambahkan limit concurrent streams (per user dan global)
2. Fix memory leak pada log storage (tambahkan cleanup di stopStream)
3. Fix bug pada function `clearAll()` di schedulerService.js
4. Implementasi graceful shutdown

### PRIORITAS 2 (HIGH - Perbaiki dalam 1-2 minggu):
5. Tambahkan monitoring resource usage per stream
6. Implementasi force kill mechanism dengan timeout
7. Tambahkan cleanup untuk orphaned temp files saat startup

### PRIORITAS 3 (MEDIUM - Perbaiki dalam 1 bulan):
8. Implementasi hardware encoder untuk advanced mode
9. Tambahkan validasi overlap schedule
10. Hapus double unref yang redundant

---

## ESTIMASI DAMPAK PERBAIKAN

### Sebelum Perbaikan:
- **RAM Usage:** Tidak terbatas (bisa sampai 20GB+ jika banyak stream)
- **CPU Usage:** Tinggi jika menggunakan advanced mode (50-80% per stream)
- **Stability:** Rendah (bisa crash jika terlalu banyak stream)
- **Memory Leak:** Ya (log storage tidak dibersihkan)

### Setelah Perbaikan:
- **RAM Usage:** Terkontrol (~500MB - 2GB untuk 20 streams)
- **CPU Usage:** Rendah dengan streamcopy (5-10% per stream)
- **Stability:** Tinggi (ada limit dan monitoring)
- **Memory Leak:** Tidak ada (cleanup otomatis)

---

**Dibuat oleh:** Kiro AI Assistant  
**Untuk:** Analisis Sistem Streaming StreamBro
