# YouTube API Stream Fix - December 19, 2024

## Masalah yang Diperbaiki

### 1. Stream Langsung API Membuat Broadcast Baru dengan Stream Key Baru
**Masalah:**
- Ketika user membuat stream dengan mode "YouTube API", sistem membuat broadcast baru
- Jika `youtubeStreamId` tidak diberikan, sistem membuat stream baru di YouTube
- Stream baru ini memiliki stream key yang berbeda dari yang dipilih user
- Akibatnya, FFmpeg streaming ke stream key yang salah dan broadcast tidak menerima data

**Penyebab:**
- Di `app.js` baris 2397-2401, kode menerima `youtubeStreamId` dari frontend
- Jika `youtubeStreamId` adalah `null`, `youtubeService.scheduleLive()` membuat stream baru
- Stream baru ini punya stream key berbeda yang tidak diketahui user

**Solusi:**
1. **Backend Validation (app.js):**
   - Menambahkan validasi wajib untuk `youtubeStreamId`
   - Jika tidak ada, request ditolak dengan error message yang jelas
   - Stream yang sudah dibuat akan dihapus jika validasi gagal

2. **Frontend Validation (dashboard.ejs):**
   - Menambahkan validasi sebelum submit form
   - Memastikan user sudah memilih stream dari streamlist
   - Menampilkan pesan error yang jelas jika belum memilih

### 2. Broadcast yang Dibuat Masuk ke Streamlist
**Masalah:**
- Broadcast yang dibuat via API muncul di streamlist
- Seharusnya streamlist hanya menampilkan stream yang bisa di-reuse
- User bingung karena ada banyak stream yang sebenarnya sudah terikat ke broadcast

**Catatan:**
- Ini adalah behavior normal dari YouTube API
- Semua stream yang dibuat akan muncul di list
- Yang penting adalah user HARUS memilih stream yang sudah ada (reuse)
- Jangan buat stream baru setiap kali membuat broadcast

## Alur yang Benar

### Untuk Stream Langsung API (YouTube API Mode):

1. **User harus memilih stream dari streamlist terlebih dahulu:**
   - Buka tab "YouTube API" di modal stream
   - Klik tombol "Select Stream Key"
   - Pilih salah satu stream yang sudah ada dari list
   - Stream key akan otomatis terisi

2. **Sistem akan menggunakan stream yang dipilih:**
   - `youtubeStreamId` disimpan di sessionStorage
   - Saat submit form, `youtubeStreamId` dikirim ke backend
   - Backend membuat broadcast baru dengan stream ID yang dipilih
   - Broadcast akan terikat ke stream yang sudah ada (reuse)

3. **FFmpeg akan streaming ke stream key yang benar:**
   - RTMP URL dan Stream Key yang ditampilkan adalah dari stream yang dipilih
   - FFmpeg akan streaming ke stream key tersebut
   - Broadcast akan menerima data dan bisa go live

### Untuk Stream Manual (Manual RTMP Mode):

1. **User memasukkan RTMP URL dan Stream Key manual:**
   - Tidak perlu memilih dari streamlist
   - User bisa menggunakan stream key apapun
   - Tidak ada broadcast yang dibuat via API

## Kode yang Diubah

### 1. app.js (Backend Validation)
```javascript
// ⚠️ CRITICAL: YouTube Stream ID MUST be provided when using YouTube API mode
if (!youtubeStreamId) {
  console.error(`[CREATE STREAM] ❌ YouTube Stream ID is required for YouTube API mode`);
  console.error(`[CREATE STREAM] User must select a stream from YouTube streamlist first`);
  
  // Delete the stream we just created since we can't proceed
  await Stream.delete(stream.id);
  
  return res.status(400).json({ 
    success: false, 
    error: 'YouTube Stream ID is required. Please select a stream from YouTube streamlist first.' 
  });
}
```

### 2. dashboard.ejs (Frontend Validation)
```javascript
// ⚠️ CRITICAL: Validate that YouTube Stream ID is present
const youtubeStreamIdInput = document.getElementById('youtubeStreamId');
const youtubeStreamId = youtubeStreamIdInput?.value || sessionStorage.getItem('selectedYouTubeStreamId');

if (!youtubeStreamId || youtubeStreamId === 'null' || youtubeStreamId === 'undefined') {
  showNotification('Warning', 'Please select a stream from YouTube streamlist first. Click "Select Stream Key" button to choose an existing stream.', 'warning');
  return;
}
```

## Testing

### Test Case 1: Stream Langsung API dengan Stream yang Dipilih
1. Login ke dashboard
2. Klik "New Stream"
3. Pilih tab "YouTube API"
4. Klik "Select Stream Key"
5. Pilih salah satu stream dari list
6. Isi form lainnya (title, video, dll)
7. Klik "Create Stream"
8. **Expected:** Stream berhasil dibuat, broadcast dibuat dengan stream ID yang dipilih
9. **Expected:** FFmpeg streaming ke stream key yang benar
10. **Expected:** Broadcast bisa go live

### Test Case 2: Stream Langsung API tanpa Memilih Stream
1. Login ke dashboard
2. Klik "New Stream"
3. Pilih tab "YouTube API"
4. JANGAN klik "Select Stream Key"
5. Isi form lainnya (title, video, dll)
6. Klik "Create Stream"
7. **Expected:** Error message muncul: "Please select a stream from YouTube streamlist first"
8. **Expected:** Form tidak di-submit

### Test Case 3: Stream Manual RTMP
1. Login ke dashboard
2. Klik "New Stream"
3. Pilih tab "Manual RTMP"
4. Isi RTMP URL dan Stream Key manual
5. Isi form lainnya (title, video, dll)
6. Klik "Create Stream"
7. **Expected:** Stream berhasil dibuat tanpa membuat broadcast
8. **Expected:** FFmpeg streaming ke RTMP URL dan Stream Key yang dimasukkan

## Catatan Penting

1. **Reuse Stream, Jangan Buat Baru:**
   - Selalu gunakan stream yang sudah ada dari streamlist
   - Jangan buat stream baru setiap kali membuat broadcast
   - Satu stream bisa digunakan untuk banyak broadcast

2. **Stream Key Tetap Sama:**
   - Stream key dari stream yang dipilih akan tetap sama
   - User bisa menggunakan stream key yang sama untuk broadcast berikutnya
   - Tidak perlu membuat stream baru

3. **Broadcast vs Stream:**
   - **Broadcast** = Event/video yang akan ditampilkan di YouTube
   - **Stream** = Ingestion point (RTMP URL + Stream Key)
   - Satu stream bisa digunakan untuk banyak broadcast
   - Tapi satu broadcast hanya bisa terikat ke satu stream

## Referensi

- YouTube Live Streaming API: https://developers.google.com/youtube/v3/live/docs
- LiveBroadcasts.insert: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/insert
- LiveStreams.insert: https://developers.google.com/youtube/v3/live/docs/liveStreams/insert
- LiveBroadcasts.bind: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/bind
