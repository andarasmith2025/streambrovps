# YouTube Scheduled Stream Flow - Verified ✅

## Alur Lengkap Stream Jadwal dengan YouTube API

### 1. Pembuatan Stream (Stream Creation)

**Lokasi:** `app.js` POST `/api/streams` (baris 2243-2480)

**Proses:**
1. User mengisi form di dashboard:
   - Pilih tab "YouTube API"
   - Klik "Select Stream Key" dan pilih stream dari streamlist
   - Stream key otomatis terisi
   - Isi title, description, privacy, dll
   - Atur jadwal (schedule)

2. Frontend validation (dashboard.ejs baris 1217-1227):
   ```javascript
   // Validasi YouTube Stream ID wajib ada
   const youtubeStreamId = youtubeStreamIdInput?.value || sessionStorage.getItem('selectedYouTubeStreamId');
   if (!youtubeStreamId || youtubeStreamId === 'null') {
     showNotification('Warning', 'Please select a stream from YouTube streamlist first');
     return;
   }
   ```

3. Backend menerima request dengan data:
   - `streamTitle`: Judul stream
   - `videoId`: ID video yang akan di-stream
   - `rtmpUrl`: RTMP URL dari stream yang dipilih
   - `streamKey`: Stream key dari stream yang dipilih
   - `youtubeStreamId`: **ID stream YouTube yang dipilih user** ✅
   - `schedules`: Array jadwal stream
   - `useYouTubeAPI`: true

4. Backend validation (app.js baris 2397-2420):
   ```javascript
   // ⚠️ CRITICAL: YouTube Stream ID MUST be provided
   if (!youtubeStreamId) {
     console.error(`[CREATE STREAM] ❌ YouTube Stream ID is required`);
     await Stream.delete(stream.id);
     return res.status(400).json({ 
       success: false, 
       error: 'YouTube Stream ID is required. Please select a stream from YouTube streamlist first.' 
     });
   }
   ```

5. Stream disimpan ke database dengan:
   - `rtmp_url`: RTMP URL yang dipilih
   - `stream_key`: Stream key yang dipilih
   - `use_youtube_api`: true
   - `youtube_broadcast_id`: null (akan diisi setelah broadcast dibuat)

6. Broadcast dibuat via YouTube API (app.js baris 2421-2445):
   ```javascript
   const broadcastResult = await youtubeService.scheduleLive(tokens, {
     title: req.body.streamTitle,
     description: streamData.youtube_description || '',
     privacyStatus: streamData.youtube_privacy || 'unlisted',
     scheduledStartTime: scheduledStartTime,
     streamId: youtubeStreamId, // ✅ MENGGUNAKAN STREAM ID YANG DIPILIH USER
     enableAutoStart: streamData.youtube_auto_start || false,
     enableAutoStop: streamData.youtube_auto_end || false
   });
   ```

7. Broadcast ID disimpan ke database:
   ```javascript
   await Stream.update(stream.id, {
     youtube_broadcast_id: broadcastResult.broadcast.id
   });
   ```

8. Schedule dibuat di database (app.js baris 2340-2360):
   ```javascript
   for (const schedule of schedules) {
     await StreamSchedule.create({
       stream_id: stream.id,
       schedule_time: parseScheduleTime(schedule.schedule_time),
       duration: parseInt(schedule.duration),
       is_recurring: schedule.is_recurring || false,
       recurring_days: schedule.recurring_days || null
     });
   }
   ```

**Hasil:**
- ✅ Stream tersimpan di database dengan RTMP URL dan stream key yang benar
- ✅ Broadcast dibuat di YouTube dengan stream ID yang dipilih user
- ✅ Broadcast terikat ke stream yang sudah ada (reuse)
- ✅ Schedule tersimpan di database

---

### 2. Scheduler Memeriksa Jadwal (Schedule Check)

**Lokasi:** `services/schedulerService.js` function `checkScheduledStreams()` (baris 23-170)

**Proses:**
1. Scheduler berjalan setiap 1 menit (baris 17)
2. Mengambil semua schedule yang pending:
   ```javascript
   const allSchedules = await StreamSchedule.findPending();
   ```

3. Untuk setiap schedule, cek apakah waktunya sudah tiba:
   - Recurring schedule: Cek hari dan jam
   - One-time schedule: Cek tanggal dan jam

4. Jika waktunya tiba, ambil stream dari database:
   ```javascript
   const stream = await Stream.findById(schedule.stream_id);
   ```

5. Update duration dan active_schedule_id:
   ```javascript
   await Stream.update(schedule.stream_id, { 
     duration: schedule.duration,
     active_schedule_id: schedule.id
   });
   ```

6. Mulai stream:
   ```javascript
   const result = await streamingService.startStream(stream.id);
   ```

**Catatan Penting:**
- ❌ **TIDAK membuat broadcast baru** - broadcast sudah dibuat saat stream creation
- ❌ **TIDAK membuat stream key baru** - stream key sudah tersimpan di database
- ✅ **Hanya memulai FFmpeg** dengan RTMP URL dan stream key yang sudah ada

---

### 3. Stream Dimulai (Stream Start)

**Lokasi:** `services/streamingService.js` function `startStream()` (baris 368-500)

**Proses:**
1. Ambil stream dari database:
   ```javascript
   const stream = await Stream.findById(streamId);
   ```

2. Build FFmpeg arguments:
   ```javascript
   const ffmpegArgs = await buildFFmpegArgs(stream);
   ```

3. `buildFFmpegArgs` menggunakan `normalizeRtmpUrl(stream)`:
   ```javascript
   function normalizeRtmpUrl(stream) {
     const baseRaw = String(stream.rtmp_url).trim();
     const keyRaw = String(stream.stream_key).trim();
     const base = /^(rtmps?:)\/\//i.test(baseRaw) ? baseRaw : `rtmp://${baseRaw}`;
     const sanitizedBase = base.replace(/\/$/, '');
     return `${sanitizedBase}/${keyRaw}`; // ✅ MENGGUNAKAN STREAM KEY DARI DATABASE
   }
   ```

4. Spawn FFmpeg process:
   ```javascript
   const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
   ```

5. Update status stream ke 'live':
   ```javascript
   await Stream.updateStatus(streamId, 'live', stream.user_id, { startTimeOverride: startTimeIso });
   ```

6. Transition broadcast ke 'live' (baris 397-448):
   ```javascript
   if (stream.use_youtube_api && stream.youtube_broadcast_id) {
     // Retry up to 10 times
     await youtubeService.transition(tokens, {
       broadcastId: stream.youtube_broadcast_id,
       status: 'live'
     });
   }
   ```

**Hasil:**
- ✅ FFmpeg streaming ke RTMP URL dan stream key yang benar
- ✅ Broadcast di YouTube menerima stream
- ✅ Broadcast transition ke 'live'
- ✅ Stream bisa ditonton di YouTube

---

## Diagram Alur

```
┌─────────────────────────────────────────────────────────────┐
│ 1. STREAM CREATION (User Action)                           │
├─────────────────────────────────────────────────────────────┤
│ User selects stream from streamlist                         │
│   ↓                                                          │
│ youtubeStreamId stored in sessionStorage                    │
│   ↓                                                          │
│ User fills form and submits                                 │
│   ↓                                                          │
│ Frontend validates youtubeStreamId exists                   │
│   ↓                                                          │
│ Backend validates youtubeStreamId exists                    │
│   ↓                                                          │
│ Stream saved to DB with:                                    │
│   - rtmp_url (from selected stream)                         │
│   - stream_key (from selected stream)                       │
│   - use_youtube_api: true                                   │
│   ↓                                                          │
│ Broadcast created via YouTube API with:                     │
│   - streamId: youtubeStreamId (REUSE existing stream) ✅    │
│   ↓                                                          │
│ Broadcast ID saved to DB:                                   │
│   - youtube_broadcast_id                                    │
│   ↓                                                          │
│ Schedule saved to DB                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SCHEDULER CHECK (Every 1 minute)                        │
├─────────────────────────────────────────────────────────────┤
│ Scheduler checks if schedule time arrived                   │
│   ↓                                                          │
│ If yes, load stream from DB                                 │
│   ↓                                                          │
│ Call streamingService.startStream(stream.id)                │
│   ↓                                                          │
│ NO NEW BROADCAST CREATED ✅                                 │
│ NO NEW STREAM KEY CREATED ✅                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. STREAM START (Automatic)                                │
├─────────────────────────────────────────────────────────────┤
│ Load stream from DB                                         │
│   ↓                                                          │
│ Build FFmpeg args using:                                    │
│   - stream.rtmp_url (from DB) ✅                            │
│   - stream.stream_key (from DB) ✅                          │
│   ↓                                                          │
│ Spawn FFmpeg process                                        │
│   ↓                                                          │
│ FFmpeg streams to correct RTMP URL + stream key ✅          │
│   ↓                                                          │
│ Transition broadcast to 'live' using:                       │
│   - stream.youtube_broadcast_id (from DB) ✅                │
│   ↓                                                          │
│ Broadcast receives stream and goes live ✅                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Kesimpulan

### ✅ Yang Sudah Benar:

1. **Stream Creation:**
   - User HARUS memilih stream dari streamlist
   - Validasi di frontend dan backend
   - Broadcast dibuat dengan stream ID yang dipilih (reuse)
   - RTMP URL dan stream key tersimpan di database

2. **Scheduler:**
   - Hanya memulai stream yang sudah ada
   - TIDAK membuat broadcast baru
   - TIDAK membuat stream key baru

3. **Stream Start:**
   - FFmpeg menggunakan RTMP URL dan stream key dari database
   - Broadcast transition ke 'live'
   - Stream bisa ditonton di YouTube

### ⚠️ Yang Perlu Diperhatikan:

1. **User HARUS memilih stream dari streamlist:**
   - Jika tidak, request akan ditolak
   - Error message yang jelas akan ditampilkan

2. **Reuse stream, jangan buat baru:**
   - Satu stream bisa digunakan untuk banyak broadcast
   - Tidak perlu membuat stream baru setiap kali

3. **Broadcast vs Stream:**
   - Broadcast = Event/video di YouTube
   - Stream = Ingestion point (RTMP URL + stream key)
   - Satu stream bisa untuk banyak broadcast
   - Satu broadcast hanya bisa terikat ke satu stream

---

## Testing Checklist

### ✅ Test Case 1: Stream Jadwal dengan Stream yang Dipilih
- [ ] Login ke dashboard
- [ ] Klik "New Stream"
- [ ] Pilih tab "YouTube API"
- [ ] Klik "Select Stream Key" dan pilih stream
- [ ] Isi form (title, video, schedule)
- [ ] Submit form
- [ ] **Expected:** Stream berhasil dibuat
- [ ] **Expected:** Broadcast dibuat dengan stream ID yang dipilih
- [ ] **Expected:** Schedule tersimpan
- [ ] Tunggu sampai waktu jadwal tiba
- [ ] **Expected:** Stream otomatis dimulai
- [ ] **Expected:** FFmpeg streaming ke stream key yang benar
- [ ] **Expected:** Broadcast go live di YouTube

### ❌ Test Case 2: Stream Jadwal tanpa Memilih Stream
- [ ] Login ke dashboard
- [ ] Klik "New Stream"
- [ ] Pilih tab "YouTube API"
- [ ] JANGAN klik "Select Stream Key"
- [ ] Isi form (title, video, schedule)
- [ ] Submit form
- [ ] **Expected:** Error message muncul
- [ ] **Expected:** Form tidak di-submit

### ✅ Test Case 3: Stream Now dengan Stream yang Dipilih
- [ ] Login ke dashboard
- [ ] Klik "New Stream"
- [ ] Pilih tab "YouTube API"
- [ ] Klik "Select Stream Key" dan pilih stream
- [ ] Isi form (title, video)
- [ ] JANGAN isi schedule (Stream Now mode)
- [ ] Submit form
- [ ] **Expected:** Stream berhasil dibuat dan langsung dimulai
- [ ] **Expected:** Broadcast go live di YouTube

---

## Referensi Kode

1. **Frontend Validation:** `views/dashboard.ejs` baris 1217-1227
2. **Backend Validation:** `app.js` baris 2397-2420
3. **Broadcast Creation:** `app.js` baris 2421-2445
4. **Scheduler:** `services/schedulerService.js` baris 23-170
5. **Stream Start:** `services/streamingService.js` baris 368-500
6. **RTMP URL Normalization:** `services/streamingService.js` baris 68-88
