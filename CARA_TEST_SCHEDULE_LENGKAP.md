# Cara Test Schedule Lengkap - YouTube API & Token Refresh

## Prerequisites (WAJIB!)

### 1. Clear Browser Cache
```
Ctrl + Shift + Delete → All time → Clear all → Restart browser
```

### 2. Logout & Login Ulang
- Username: **BangTeguh**
- Password: (password kamu)

### 3. Connect YouTube (PENTING!)
1. Buka dashboard
2. Klik tombol **"Connect YouTube"**
3. Login dengan akun YouTube kamu
4. Authorize aplikasi
5. Tunggu redirect kembali ke dashboard
6. Pastikan muncul "Connected as [Channel Name]"

**⚠️  Tanpa connect YouTube, schedule tidak akan jalan!**

## Test 1: Cek Koneksi YouTube & Token

Jalankan script test:
```bash
node test-schedule-complete.js
```

### Output yang Diharapkan:

```
========================================
TEST: Schedule Creation & Database
========================================

1. Checking YouTube Connection...

✓ User: BangTeguh (66868fda-5f92-425f-bda1-6258e0ec5076)
  Has YouTube Client ID: true
  Has YouTube Client Secret: true
  Has Access Token: true
  Has Refresh Token: true
  ✓ Token valid (expires in 55 minutes)

2. Testing Token Auto-Refresh...

✓ Token refresh successful
  Access Token: ya29.a0AfB_byC...
  Refresh Token: present
  Expires in: 55 minutes

3. Checking Existing Streams...

Found 2 stream(s):

1. Test Stream
   ID: abc-123-def
   Status: scheduled
   YouTube API: Yes
   Created: 12/20/2025, 2:00:00 PM

4. Checking Schedules...

Stream: Test Stream
  Schedules: 1

  1. Schedule ID: sch-123
     Time: 2025-12-20T14:30:00.000
     Duration: 60 minutes
     Status: pending
     Recurring: Yes
     Days: Mon, Tue, Wed, Thu, Fri (1,2,3,4,5)

✓ Total schedules: 1

5. Testing Scheduler Logic...

Current time: 14:30 on Friday (day 5)

Found 1 pending schedule(s)

Checking: Test Stream (sch-123)
  Recurring: Monday to Friday
  Today allowed: Yes
  Schedule time: 14:30
  Current time: 14:30
  Time difference: 0 minutes
  ✓ WOULD START NOW!

⚠️  1 schedule(s) would start NOW if scheduler is running!

========================================
SUMMARY
========================================

✅ YouTube Connection: OK
✅ Token Refresh: OK
✅ Streams in Database: 2
✅ Schedules in Database: 1
✅ Pending Schedules: 1
✅ Ready to Start Now: 1

📋 Next Steps:

1. Schedules are ready to start!
2. Check if PM2 is running: pm2 status
3. Monitor logs: pm2 logs --lines 50
4. Stream should start within 1 minute

✅ All tests passed!
```

## Test 2: Buat Stream dengan Schedule

### Langkah-langkah:

1. **Buka Dashboard**
   - Login sebagai BangTeguh
   - Pastikan "Connected as [Channel]" muncul

2. **Klik "New Stream"**

3. **Pilih Tab "YouTube API"**

4. **Isi Form:**
   - **Select Video**: Pilih video dari list
   - **Stream Title**: "Test Schedule Stream"
   - **Load Stream Key**: Klik "Load" → Pilih stream key dari list
   - **Description**: (optional)
   - **Privacy**: Unlisted
   - **Additional Settings**: (optional)

5. **Tambah Schedule:**
   - Klik "Add Schedule"
   - **Time**: Pilih waktu 2-3 menit dari sekarang
     - Contoh: Sekarang 14:30 → Set 14:32
   - **Duration**: 5 (menit)
   - **Recurring**: Centang hari yang diinginkan
     - Contoh: Centang Mon, Tue, Wed, Thu, Fri

6. **Klik "Create Stream"**

7. **Buka Console Browser (F12)**
   - Lihat log frontend
   - Pastikan muncul:
     ```
     [Frontend] ✓ Stream will be SCHEDULED with 1 schedule(s)
     [Frontend] Response received
     Success: true
     Stream ID: abc-123
     ```

8. **Cek PM2 Logs**
   ```bash
   pm2 logs --lines 50
   ```
   
   Pastikan muncul:
   ```
   [POST /api/streams] NEW STREAM REQUEST
   Stream Title: Test Schedule Stream
   Use YouTube API: true
   Schedules: present
   
   [POST /api/streams] ✅ SUCCESS
   Stream ID: abc-123-def
   Status: scheduled
   ```

## Test 3: Verifikasi Database

Jalankan test lagi:
```bash
node test-schedule-complete.js
```

Pastikan:
- ✅ Stream muncul di database
- ✅ Schedule muncul di database
- ✅ Status: pending

## Test 4: Monitor Scheduler

### Cara 1: Real-time Logs
```bash
pm2 logs --lines 0
```

Biarkan terminal terbuka, tunggu sampai waktu schedule.

### Cara 2: Grep Scheduler
```bash
pm2 logs | grep Scheduler
```

### Output yang Diharapkan (saat waktu schedule):

```
[Scheduler] Checking schedules at 14:32 on Friday (day 5)
[Scheduler] Found 1 pending schedule(s)
[Scheduler] Recurring schedule matched: abc-123 on Friday at 14:32
[Scheduler] Refreshing YouTube tokens for user 66868fda-5f92-425f-bda1-6258e0ec5076
[Scheduler] ✓ YouTube token valid (expires in 55 minutes)
[Scheduler] Starting stream: abc-123 - Test Schedule Stream with duration 5 minutes
[Scheduler] Successfully started: abc-123 (will auto-stop after 5 minutes)
```

## Test 5: Verifikasi FFmpeg Jalan

### Cek Process FFmpeg:
```bash
# Windows
tasklist | findstr ffmpeg

# Output:
ffmpeg.exe    12345 Console    1    150,000 K
```

### Cek Stream Status di Database:
```bash
node -e "const {db} = require('./db/database'); db.get('SELECT id, title, status, start_time FROM streams WHERE id = \"abc-123\"', [], (e,r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); });"
```

Output:
```json
{
  "id": "abc-123",
  "title": "Test Schedule Stream",
  "status": "live",
  "start_time": "2025-12-20T14:32:00.000Z"
}
```

### Cek YouTube Live:
1. Buka YouTube Studio
2. Klik "Go Live"
3. Pastikan stream muncul dan status "Live"

## Test 6: Test Token Refresh (Simulasi Expired)

### Cara 1: Set Token Expired Manual
```bash
node -e "const {db} = require('./db/database'); db.run('UPDATE youtube_tokens SET expiry_date = ? WHERE user_id = ?', [Date.now() - 1000, '66868fda-5f92-425f-bda1-6258e0ec5076'], (e) => { console.log('Token set to expired'); process.exit(0); });"
```

### Cara 2: Jalankan Test Lagi
```bash
node test-schedule-complete.js
```

Output:
```
1. Checking YouTube Connection...

✓ User: BangTeguh
  ⚠️  Token EXPIRED 1 minutes ago
     Will test auto-refresh...

2. Testing Token Auto-Refresh...

[getTokensForUser] Token expired/expiring, auto-refreshing...
[getTokensForUser] ✓ Token refreshed and saved

✓ Token refresh successful
  Expires in: 60 minutes
```

## Test 7: Test Recurring Schedule (Besok)

Jika schedule recurring (contoh: Senin-Jumat jam 14:30):

### Hari Ini (Jumat 14:30):
- Stream start ✅
- Token valid ✅

### Besok (Sabtu 14:30):
- Schedule TIDAK jalan (Sabtu tidak di-centang) ✅

### Lusa (Senin 14:30):
- Scheduler cek schedule
- Token expired (24 jam kemudian)
- **Auto-refresh token** ✅
- Stream start dengan token baru ✅

### Monitor:
```bash
pm2 logs | grep "Token expired"
pm2 logs | grep "Token refreshed"
```

## Troubleshooting

### Problem 1: "User not connected to YouTube"
**Solusi**: Connect YouTube dari dashboard

### Problem 2: "No schedules found"
**Solusi**: Buat stream dengan schedule (bukan Stream Now)

### Problem 3: Schedule tidak jalan
**Cek**:
1. PM2 running: `pm2 status`
2. Waktu schedule sudah lewat: `node test-schedule-complete.js`
3. Recurring day match: Cek hari ini termasuk dalam recurring_days
4. Token valid: Cek di test output

### Problem 4: Token refresh gagal
**Cek**:
1. User punya refresh_token: `node test-schedule-complete.js`
2. User punya client_id & client_secret
3. Refresh token tidak revoked (user tidak disconnect dari Google)

**Solusi**: Disconnect dan reconnect YouTube

### Problem 5: FFmpeg tidak jalan
**Cek**:
1. Stream status di database: `live` atau `offline`?
2. PM2 logs: Ada error FFmpeg?
3. Video file exists: Cek path video_id

## Kesimpulan

Untuk schedule YouTube API berfungsi dengan baik:

✅ **User harus connect YouTube** (punya access_token & refresh_token)
✅ **Schedule masuk ke database** (tabel stream_schedules)
✅ **Scheduler check setiap menit** (schedulerService.js)
✅ **Token auto-refresh sebelum start** (getTokensForUser)
✅ **FFmpeg start otomatis** (streamingService.startStream)
✅ **Auto-stop setelah duration** (schedulerService.checkStreamDurations)

**Sekarang coba connect YouTube dulu, lalu jalankan test!**
