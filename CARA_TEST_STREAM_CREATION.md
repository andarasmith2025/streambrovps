# Cara Test Stream Creation - Debugging Frontend ke Database

## Masalah
Kamu curiga frontend gagal kirim data ke database.

## Solusi: Logging Lengkap Sudah Ditambahkan

Saya sudah tambahkan logging lengkap di:
1. **Frontend** (dashboard.ejs) - Track request yang dikirim
2. **Backend** (app.js) - Track request yang diterima dan response

## Cara Test

### 1. Restart PM2 (Sudah Dilakukan)
```bash
pm2 restart ecosystem.config.js
```

### 2. Clear Browser Cache
1. Tekan **Ctrl + Shift + Delete**
2. Pilih "All time"
3. Centang semua
4. Clear data
5. Tutup dan buka ulang browser

### 3. Login Ulang
- Username: **BangTeguh** (admin)
- Password: (password kamu)

### 4. Buka Console Browser
1. Tekan **F12**
2. Klik tab **Console**
3. Biarkan terbuka

### 5. Coba Buat Stream
1. Klik "New Stream"
2. Isi form:
   - Pilih video
   - Isi stream title
   - Isi RTMP URL
   - Isi Stream Key
3. Klik "Create Stream"

### 6. Cek Log di Console Browser

Kamu harus lihat log seperti ini:

```
========================================
[Frontend] Sending POST /api/streams
========================================
Form Data: {streamTitle: "Test", videoId: "123", ...}
Use YouTube API: false
Stream Now: true
Has Schedules: 0
========================================

[Frontend] Response status: 200

========================================
[Frontend] Response received
========================================
Success: true
Stream ID: abc-123-def
Error: undefined
========================================
```

### 7. Cek Log di Server (PM2)

Buka terminal baru dan jalankan:
```bash
pm2 logs --lines 50
```

Kamu harus lihat log seperti ini:

```
========================================
[POST /api/streams] NEW STREAM REQUEST
========================================
Session userId: 66868fda-5f92-425f-bda1-6258e0ec5076
Session username: BangTeguh
Request body keys: ['streamTitle', 'videoId', 'rtmpUrl', ...]
Stream Title: Test Stream
RTMP URL: rtmps://a.rtmp.youtube.com/live2
Stream Key: ***abcd
Use YouTube API: false
Stream Now: true
Schedules: missing
========================================

========================================
[POST /api/streams] ✅ SUCCESS
========================================
Stream ID: abc-123-def-456
Stream Title: Test Stream
Status: offline
User ID: 66868fda-5f92-425f-bda1-6258e0ec5076
Stream Now: true
========================================
```

## Analisa Log

### Jika Frontend Log Muncul Tapi Backend Tidak
**Masalah**: Request tidak sampai ke server
**Penyebab**:
- Server mati
- Port salah
- CORS issue
- Network error

**Solusi**:
```bash
pm2 status
pm2 logs
```

### Jika Backend Log Muncul Tapi Error
**Masalah**: Ada error di backend
**Cek**:
- Error message di log
- Stack trace
- Database error

### Jika Success Tapi Data Tidak Muncul
**Masalah**: Database write gagal atau read dari database salah
**Cek**:
```bash
node -e "const {db} = require('./db/database'); db.all('SELECT * FROM streams ORDER BY created_at DESC LIMIT 5', [], (e,r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); });"
```

### Jika Tidak Ada Log Sama Sekali
**Masalah**: JavaScript tidak jalan (cached old version)
**Solusi**:
1. Hard refresh: **Ctrl + Shift + R**
2. Clear cache lagi
3. Cek Network tab di DevTools - lihat apakah request dikirim

## Script Helper untuk Cek Database

### Cek Stream Terbaru
```bash
node check-latest-stream.js
```

### Cek Semua Streams
```bash
node check-streams.js
```

### Monitor Real-time
```bash
node monitor-create-stream.js
```

Biarkan script ini jalan, lalu coba buat stream dari browser. Script akan otomatis detect perubahan di database.

## Kesimpulan

Dengan logging lengkap ini, kita bisa tahu persis di mana masalahnya:
- ✅ Frontend kirim request atau tidak
- ✅ Backend terima request atau tidak
- ✅ Data masuk database atau tidak
- ✅ Error apa yang terjadi

**Sekarang coba buat stream dan lihat log nya!**
