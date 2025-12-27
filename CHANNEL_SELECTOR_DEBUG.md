# Channel Selector Debug Guide

## Masalah
Stream yang dibuat dengan channel HSN malah masuk ke channel "Healing Earth Resonance" (default channel).

## Root Cause
`youtube_channel_id` bernilai `null` di database, padahal user sudah memilih channel HSN di frontend.

## Kemungkinan Penyebab

### 1. Channel Selector Tidak Ter-populate
- Element `youtubeChannelSelect` tidak ter-load dengan channel HSN
- Hanya channel default yang muncul

### 2. Value Tidak Terkirim dari Frontend
- `formData.youtubeChannelId` kosong atau undefined
- FormData tidak mengirim field dengan benar

### 3. Backend Tidak Menerima Value
- `req.body.youtubeChannelId` kosong
- Parsing FormData gagal

## Logging yang Ditambahkan

### Frontend (public/js/stream-modal.js)

**Di `updateChannelSelector()`:**
```javascript
console.log('[updateChannelSelector] 🔍 DEBUG:');
console.log('  selector element:', selector);
console.log('  container element:', container);
console.log('  channels:', channels);
console.log('  Sorted channels:', sortedChannels.map(ch => `${ch.isDefault ? '⭐' : ''} ${ch.title} (${ch.id})`));
console.log('  Populated selector with', sortedChannels.length, 'options');
console.log('  Current selector.value:', selector.value);
console.log('  Auto-selected default channel:', defaultChannel.title, '(', defaultChannel.id, ')');
console.log('  Final selector.value:', selector.value);
console.log('  Final selectedChannelId:', selectedChannelId);
```

**Di form submit (dashboard.ejs line ~788):**
```javascript
console.log('[Form Submit] ========== CHANNEL DEBUG ==========');
console.log('[Form Submit] youtubeChannelSelect element:', youtubeChannelSelect);
console.log('[Form Submit] youtubeChannelSelect.value:', channelIdValue);
console.log('[Form Submit] youtubeChannelSelect.options:', youtubeChannelSelect?.options);
console.log('[Form Submit] youtubeChannelSelect.selectedIndex:', youtubeChannelSelect?.selectedIndex);
console.log('[Form Submit] ✅ YouTube Channel ID:', formData.youtubeChannelId);
```

### Backend (app.js)

**Di endpoint POST /api/streams:**
```javascript
console.log('🔍 CHANNEL DEBUG:');
console.log('  req.body.youtubeChannelId:', req.body.youtubeChannelId);
console.log('  Type:', typeof req.body.youtubeChannelId);
console.log('  Is null?:', req.body.youtubeChannelId === null);
console.log('  Is undefined?:', req.body.youtubeChannelId === undefined);
console.log('  Is empty string?:', req.body.youtubeChannelId === '');
console.log('  Truthy?:', !!req.body.youtubeChannelId);
```

**Saat menyimpan ke streamData:**
```javascript
console.log(`[CREATE STREAM] 🔍 Processing YouTube Channel ID:`);
console.log(`  Raw value from req.body:`, rawChannelId);
console.log(`  Type:`, typeof rawChannelId);
console.log(`  After || null:`, rawChannelId || null);
console.log(`[CREATE STREAM] ⭐ Final YouTube Channel ID to save: ${streamData.youtube_channel_id || 'NULL (will use default)'}`);
```

## Cara Debug

### Step 1: Cek Frontend Console
1. Buka browser console (F12)
2. Buka modal create stream
3. Switch ke tab YouTube API
4. Lihat log `[updateChannelSelector]` - apakah channel HSN muncul?
5. Pilih channel HSN dari dropdown
6. Klik Create Stream
7. Lihat log `[Form Submit] ✅ YouTube Channel ID:` - apakah berisi ID channel HSN?

**Expected Output:**
```
[updateChannelSelector] Sorted channels: ["⭐ Healing Earth Resonance (UCDM_CmM0o5WN6tkF7bbEeRQ)", "HSN (UCsAt2CugoD0xatdKguG1O5w)"]
[updateChannelSelector] Final selector.value: UCDM_CmM0o5WN6tkF7bbEeRQ
[Form Submit] ✅ YouTube Channel ID: UCsAt2CugoD0xatdKguG1O5w
```

### Step 2: Cek Backend Log
```bash
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103
cd /root/streambrovps
pm2 logs streambro --lines 50
```

**Expected Output:**
```
[POST /api/streams] NEW STREAM REQUEST
🔍 CHANNEL DEBUG:
  req.body.youtubeChannelId: UCsAt2CugoD0xatdKguG1O5w
  Type: string
  Is null?: false
  Is undefined?: false
  Is empty string?: false
  Truthy?: true
[CREATE STREAM] 🔍 Processing YouTube Channel ID:
  Raw value from req.body: UCsAt2CugoD0xatdKguG1O5w
  Type: string
  After || null: UCsAt2CugoD0xatdKguG1O5w
[CREATE STREAM] ⭐ Final YouTube Channel ID to save: UCsAt2CugoD0xatdKguG1O5w
```

### Step 3: Verify Database
```bash
node -e "const { db } = require('./db/database'); db.get('SELECT id, title, youtube_channel_id FROM streams ORDER BY created_at DESC LIMIT 1', (err, row) => { console.log(JSON.stringify(row, null, 2)); process.exit(); });"
```

**Expected Output:**
```json
{
  "id": "...",
  "title": "...",
  "youtube_channel_id": "UCsAt2CugoD0xatdKguG1O5w"
}
```

## Troubleshooting

### Jika Channel HSN Tidak Muncul di Dropdown
**Problem:** Channel selector hanya menampilkan channel default

**Solution:**
1. Cek apakah channel HSN terdaftar di database:
```bash
node -e "const { db } = require('./db/database'); db.all('SELECT channel_id, channel_title, is_default FROM youtube_channels', (err, rows) => { console.log(JSON.stringify(rows, null, 2)); process.exit(); });"
```

2. Jika channel HSN tidak ada, reconnect channel HSN di settings

### Jika `formData.youtubeChannelId` Kosong
**Problem:** Frontend tidak mengirim channel ID

**Possible Causes:**
1. Element `youtubeChannelSelect` tidak ditemukan (null)
2. User tidak memilih channel (menggunakan default)
3. JavaScript error sebelum form submit

**Solution:**
1. Cek browser console untuk error
2. Pastikan element `youtubeChannelSelect` ada di DOM
3. Pastikan `updateChannelSelector()` dipanggil saat load modal

### Jika `req.body.youtubeChannelId` Kosong di Backend
**Problem:** Backend tidak menerima channel ID dari frontend

**Possible Causes:**
1. FormData tidak mengirim field dengan benar
2. Multer middleware mengubah body
3. Field name tidak match (`youtubeChannelId` vs `youtube_channel_id`)

**Solution:**
1. Cek `Content-Type` header - harus `multipart/form-data` jika ada thumbnail
2. Cek apakah field name di frontend match dengan backend
3. Cek apakah multer middleware memproses field dengan benar

## Quick Fix

Jika masalah persist, tambahkan fallback ke default channel:

```javascript
// In app.js, after getting channelId
if (!channelId && useYouTubeAPI) {
  // Get default channel for user
  const defaultChannel = await new Promise((resolve, reject) => {
    db.get(
      'SELECT channel_id FROM youtube_channels WHERE user_id = ? AND is_default = 1',
      [req.session.userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  if (defaultChannel) {
    channelId = defaultChannel.channel_id;
    console.log(`[CREATE STREAM] Using default channel as fallback: ${channelId}`);
  }
}
```

## Files Modified
- `app.js` - Added detailed logging in POST /api/streams endpoint
- `public/js/stream-modal.js` - Added logging in updateChannelSelector()
- `views/dashboard.ejs` - Already has logging in form submit handler

## Next Steps
1. Deploy changes to VPS ✅
2. Test create stream with channel HSN
3. Check browser console logs
4. Check backend logs
5. Verify database

## Tanggal
26 Desember 2024
