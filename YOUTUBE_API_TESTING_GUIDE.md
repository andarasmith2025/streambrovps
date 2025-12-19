# YouTube API Additional Settings - Testing Guide

## 🧪 Cara Testing & Verifikasi

### 1️⃣ Persiapan Testing

**A. Pastikan Server Running**
```bash
ssh root@94.237.3.164
cd /root/streambrovps
pm2 status streambro
```

**B. Buka Dashboard**
- URL: https://streambro.nivarastudio.site
- Login dengan akun yang sudah connect YouTube API

---

### 2️⃣ Test Create Stream dengan Additional Settings

**Langkah:**
1. Klik "New Stream"
2. Pilih tab "YouTube API"
3. Pilih YouTube Stream dari dropdown
4. Isi form dengan settings berikut:

**Test Case 1: Full Settings**
- ✅ Title: "Test Additional Settings"
- ✅ Description: "Testing all YouTube API settings"
- ✅ Privacy: Public
- ✅ Made for Kids: No
- ✅ Age Restricted: Yes (18+)
- ✅ Synthetic Content: Yes
- ✅ Auto Start: Yes
- ✅ Auto End: Yes
- ✅ Thumbnail: Upload gambar 1280x720

**Test Case 2: Minimal Settings**
- ✅ Title: "Test Minimal"
- ✅ Privacy: Unlisted
- ✅ Made for Kids: No
- ⬜ Semua checkbox lainnya OFF

---

### 3️⃣ Monitoring Logs Real-Time

**Opsi A: Dari Windows (PowerShell)**
```powershell
.\monitor-youtube-api-logs.ps1
```

**Opsi B: Dari VPS (SSH)**
```bash
ssh root@94.237.3.164
cd /root/streambrovps
pm2 logs streambro --lines 50 | grep -E "CREATE STREAM|setAudience|setThumbnail"
```

---

### 4️⃣ Verifikasi dengan Script Checker

**Setelah create stream, jalankan:**
```bash
# Di VPS
node check-youtube-api-calls.js <stream-id>
```

**Contoh:**
```bash
node check-youtube-api-calls.js abc123-def456-ghi789
```

Script akan menampilkan:
- ✅ Settings di Database
- ✅ Settings di YouTube API
- ✅ Comparison (Match/Mismatch)

---


### 5️⃣ Verifikasi Manual di YouTube Studio

**Langkah:**
1. Buka https://studio.youtube.com
2. Pilih "Content" → "Live"
3. Cari broadcast yang baru dibuat
4. Klik "Edit" untuk melihat settings

**Cek:**
- ✅ Privacy Status (Public/Unlisted/Private)
- ✅ Made for Kids setting
- ✅ Age Restriction (18+)
- ✅ Thumbnail (custom atau auto-generated)
- ✅ Auto Start/End (di Advanced Settings)

---

### 6️⃣ Log Patterns yang Harus Muncul

**Saat Create Stream:**
```
[CREATE STREAM] Creating YouTube broadcast for stream <id>
[CREATE STREAM] - Title: <title>
[CREATE STREAM] - Privacy: <privacy>
[CREATE STREAM] - YouTube Stream ID: <stream-id>
[CREATE STREAM] ✓ YouTube broadcast created: <broadcast-id>
```

**Saat Set Audience:**
```
[CREATE STREAM] ✓ Audience settings applied (Made for Kids: false, Age Restricted: true)
```

**Saat Upload Thumbnail:**
```
[CREATE STREAM] Thumbnail file received: <filename>
[CREATE STREAM] ✓ Thumbnail uploaded to YouTube
```

---

### 7️⃣ Troubleshooting

**Problem: Audience settings tidak tersimpan**
- Cek log: `grep "setAudience" pm2 logs`
- Pastikan broadcast sudah dibuat (ada broadcast_id)
- Cek YouTube API quota

**Problem: Thumbnail tidak ter-upload**
- Cek ukuran file (max 2MB)
- Cek format (JPG/PNG)
- Cek ratio (16:9 recommended)
- Cek folder permissions: `uploads/` harus writable

**Problem: Auto Start/End tidak jalan**
- Ini sudah benar di kode
- Cek di YouTube Studio → Advanced Settings
- Pastikan broadcast status = "ready" atau "testing"

---

### 8️⃣ Quick Commands

**Monitor logs (filter YouTube API):**
```bash
pm2 logs streambro | grep -E "CREATE STREAM|YouTube|setAudience|setThumbnail"
```

**Check last 100 lines:**
```bash
pm2 logs streambro --lines 100 --nostream | grep "CREATE STREAM"
```

**Check database:**
```bash
sqlite3 db/streambro.db "SELECT id, title, youtube_broadcast_id, youtube_privacy, youtube_made_for_kids, youtube_age_restricted, youtube_synthetic_content, youtube_auto_start, youtube_auto_end FROM streams WHERE use_youtube_api = 1 ORDER BY created_at DESC LIMIT 5;"
```

---

### 9️⃣ Expected Results

| Setting | Database | YouTube API | Status |
|---------|----------|-------------|--------|
| Privacy Status | ✅ | ✅ | Should match |
| Auto Start | ✅ | ✅ | Should match |
| Auto End | ✅ | ✅ | Should match |
| Made for Kids | ✅ | ✅ | Should match |
| Age Restricted | ✅ | ✅ | Should match |
| Synthetic Content | ✅ | ⚠️ | DB only (no API yet) |
| Thumbnail | - | ✅ | Uploaded to YouTube |

---

### 🔟 Testing Checklist

- [ ] Create stream dengan YouTube API tab
- [ ] Set Privacy = Public
- [ ] Set Made for Kids = No
- [ ] Set Age Restricted = Yes
- [ ] Set Synthetic Content = Yes
- [ ] Set Auto Start = Yes
- [ ] Set Auto End = Yes
- [ ] Upload thumbnail (1280x720)
- [ ] Submit form
- [ ] Check logs untuk "[CREATE STREAM]"
- [ ] Check logs untuk "setAudience"
- [ ] Check logs untuk "setThumbnail"
- [ ] Run verification script
- [ ] Verify di YouTube Studio
- [ ] Compare settings (DB vs YouTube)

---

## 📝 Notes

1. **Synthetic Content** saat ini hanya disimpan di database, belum ada API YouTube untuk ini
2. **Thumbnail upload** memerlukan file < 2MB, format JPG/PNG
3. **Auto Start/End** hanya berlaku untuk scheduled broadcasts
4. **Made for Kids** dan **Age Restricted** tidak bisa keduanya true
5. **Privacy Status** bisa diubah kapan saja di YouTube Studio

---

## 🚀 Quick Test Command

```bash
# Upload script ke VPS
scp check-youtube-api-calls.js root@94.237.3.164:/root/streambrovps/

# SSH dan test
ssh root@94.237.3.164
cd /root/streambrovps
node check-youtube-api-calls.js <stream-id>
```
