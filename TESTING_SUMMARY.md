# 🧪 Testing Tools - YouTube API Additional Settings

## ✅ Tools yang Sudah Disiapkan

### 1. **Verification Script** (`check-youtube-api-calls.js`)
**Lokasi:** 
- Local: `F:\streambro\check-youtube-api-calls.js`
- VPS: `/root/streambrovps/check-youtube-api-calls.js` ✅ Uploaded

**Fungsi:**
- Cek settings di database
- Fetch settings dari YouTube API
- Compare dan verify apakah match
- Tampilkan hasil dengan warna (✓ success, ✗ error)

**Usage:**
```bash
# Di VPS
ssh root@94.237.3.164
cd /root/streambrovps
node check-youtube-api-calls.js <stream-id>
```

**Output:**
```
=== STREAM SETTINGS IN DATABASE ===
Stream ID: abc123
Title: Test Stream
Use YouTube API: YES
Privacy: public
Made for Kids: NO
Age Restricted: YES
Auto Start: YES
Auto End: YES

=== BROADCAST DETAILS FROM YOUTUBE API ===
✓ Privacy Status: Public
✓ Auto Start: ENABLED
✓ Auto End: ENABLED

=== VERIFICATION RESULTS ===
✓ Privacy Status: MATCH (public)
✓ Auto Start: MATCH (Enabled)
✓ Auto End: MATCH (Enabled)
✓ Made for Kids: MATCH (No)

✓ ALL SETTINGS VERIFIED SUCCESSFULLY!
```

---

### 2. **Log Monitor Script** (PowerShell)
**File:** `monitor-youtube-api-logs.ps1`

**Usage:**
```powershell
.\monitor-youtube-api-logs.ps1
```

**Akan menampilkan:**
- [CREATE STREAM] logs
- setAudience() calls
- setThumbnail() calls
- Auto Start/End settings
- Broadcast creation logs

---

### 3. **Testing Guide**
**File:** `YOUTUBE_API_TESTING_GUIDE.md`

**Berisi:**
- Step-by-step testing procedure
- Test cases (Full Settings & Minimal)
- Log patterns yang harus muncul
- Troubleshooting guide
- Quick commands
- Testing checklist

---

## 🎯 Cara Testing (Quick Start)

### Step 1: Buat Stream Baru
1. Buka https://streambro.nivarastudio.site
2. Login
3. Klik "New Stream"
4. Pilih tab "YouTube API"
5. Isi form dengan settings:
   - ✅ Privacy: Public
   - ✅ Made for Kids: No
   - ✅ Age Restricted: Yes
   - ✅ Synthetic Content: Yes
   - ✅ Auto Start: Yes
   - ✅ Auto End: Yes
   - ✅ Upload thumbnail
6. Submit

### Step 2: Monitor Logs
```powershell
# Di Windows
.\monitor-youtube-api-logs.ps1

# Atau SSH manual
ssh root@94.237.3.164 "pm2 logs streambro --lines 50"
```

**Cari log ini:**
```
[CREATE STREAM] ✓ YouTube broadcast created: <broadcast-id>
[CREATE STREAM] ✓ Audience settings applied
[CREATE STREAM] ✓ Thumbnail uploaded
```

### Step 3: Verify dengan Script
```bash
# SSH ke VPS
ssh root@94.237.3.164

# Jalankan checker (ganti <stream-id> dengan ID stream yang baru dibuat)
cd /root/streambrovps
node check-youtube-api-calls.js <stream-id>
```

### Step 4: Verify di YouTube Studio
1. Buka https://studio.youtube.com
2. Go to Content → Live
3. Cari broadcast yang baru dibuat
4. Klik Edit
5. Cek semua settings

---

## 📋 What to Check

| Setting | Where to Check | Expected |
|---------|----------------|----------|
| **Privacy** | YouTube Studio → Visibility | Public/Unlisted/Private |
| **Made for Kids** | YouTube Studio → Audience | Yes/No |
| **Age Restricted** | YouTube Studio → Age restriction | 18+ or Not |
| **Thumbnail** | YouTube Studio → Thumbnail | Custom uploaded |
| **Auto Start** | YouTube Studio → Advanced | Enabled/Disabled |
| **Auto End** | YouTube Studio → Advanced | Enabled/Disabled |
| **Synthetic Content** | Database only | Yes/No (not in YT API yet) |

---

## 🔍 Log Patterns

**Success Patterns:**
```
✓ [CREATE STREAM] YouTube broadcast created: <id>
✓ [CREATE STREAM] Audience settings applied (Made for Kids: false, Age Restricted: true)
✓ [CREATE STREAM] Thumbnail uploaded
```

**Error Patterns:**
```
✗ [CREATE STREAM] Error setting audience: <error>
✗ [CREATE STREAM] Error uploading thumbnail: <error>
✗ [CREATE STREAM] YouTube tokens not found
```

---

## 🚨 Common Issues

### Issue 1: "Audience settings not applied"
**Solution:**
- Check if broadcast was created (broadcast_id exists)
- Check YouTube API quota
- Check tokens are valid

### Issue 2: "Thumbnail upload failed"
**Solution:**
- Check file size (< 2MB)
- Check format (JPG/PNG)
- Check aspect ratio (16:9)
- Check uploads folder permissions

### Issue 3: "Auto Start/End not working"
**Solution:**
- These settings are already correct in code
- Check YouTube Studio → Advanced Settings
- Only works for scheduled broadcasts

---

## 📞 Quick Commands Reference

```bash
# Monitor logs
pm2 logs streambro --lines 100

# Filter YouTube API logs
pm2 logs streambro | grep "CREATE STREAM"

# Check database
sqlite3 db/streambro.db "SELECT * FROM streams WHERE use_youtube_api=1 LIMIT 5;"

# Verify stream
node check-youtube-api-calls.js <stream-id>

# Restart server
pm2 restart streambro
```

---

## ✅ Ready to Test!

Semua tools sudah siap. Silakan:
1. Buat stream baru dengan YouTube API
2. Monitor logs dengan `monitor-youtube-api-logs.ps1`
3. Verify dengan `check-youtube-api-calls.js`
4. Cross-check di YouTube Studio

**Good luck testing!** 🚀
