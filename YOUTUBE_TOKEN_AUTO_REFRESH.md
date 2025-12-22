# YouTube Token Auto-Refresh Implementation

## 🎯 Masalah yang Diselesaikan

### 1. **Deleted Client Error**
- Error `deleted_client` terjadi ketika OAuth Client ID dihapus atau dicabut aksesnya
- Token di session tidak sinkron dengan database
- Background streaming process kehilangan akses token

### 2. **Token Expiry di VPS**
- Session habis saat user logout/clear cookies
- Streaming yang berjalan di background kehilangan token
- Update database tidak menunggu proses selesai (async issue)

## ✅ Solusi: Token Manager dengan Event Listener

### Arsitektur Baru

```
┌─────────────────────────────────────────────────────────────┐
│                    Token Flow (VPS Safe)                     │
└─────────────────────────────────────────────────────────────┘

1. Request → getTokensFromReq(req)
              ↓
2. Get userId from session
              ↓
3. tokenManager.getAuthenticatedClient(userId)
              ↓
4. Load tokens from DATABASE (source of truth)
              ↓
5. Create OAuth2 Client + Set Credentials
              ↓
6. ⭐ Attach Event Listener: oauth2Client.on('tokens', ...)
              ↓
7. Check if token expiring (5 min buffer)
              ↓
8. If expiring → Force refresh → Auto-save to DB
              ↓
9. Return authenticated client
              ↓
10. Google API calls → Auto-refresh if needed → Event fires → DB updated
```

## 📁 File Structure

```
services/
├── youtubeTokenManager.js    ← ⭐ NEW: Token management dengan event listener
├── youtubeService.js          ← Updated: Menggunakan token manager
└── streamingService.js        ← Updated: Menggunakan token manager

routes/
└── youtube.js                 ← Updated: getTokensFromReq() menggunakan token manager
```

## 🔧 Implementation Details

### 1. Token Manager (`services/youtubeTokenManager.js`)

**Key Features:**
- ✅ Database sebagai single source of truth
- ✅ Event listener untuk auto-save saat Google refresh token
- ✅ Auto-detect `deleted_client` dan cleanup otomatis
- ✅ Auto-detect `invalid_grant` (token revoked) dan cleanup
- ✅ 5 menit buffer sebelum expiry untuk force refresh

**Main Function:**
```javascript
const oauth2Client = await tokenManager.getAuthenticatedClient(userId);
```

**Event Listener:**
```javascript
oauth2Client.on('tokens', async (tokens) => {
  // Auto-save ke database saat Google refresh token
  await updateTokensInDB(userId, tokens);
});
```

### 2. Routes Update (`routes/youtube.js`)

**Before (Problematic):**
```javascript
// ❌ Session sebagai primary source
if (req.session && req.session.youtubeTokens) {
  return req.session.youtubeTokens;
}
```

**After (VPS Safe):**
```javascript
// ✅ Database sebagai primary source
const oauth2Client = await tokenManager.getAuthenticatedClient(userId);
return oauth2Client.credentials;
```

### 3. Error Handling

**Deleted Client:**
```javascript
if (err.message.includes('deleted_client')) {
  console.error('❌ OAuth Client deleted. Cleaning up...');
  await deleteTokensFromDB(userId);
  return null;
}
```

**Invalid Grant (Token Revoked):**
```javascript
if (err.message.includes('invalid_grant')) {
  console.error('❌ Token revoked. Cleaning up...');
  await deleteTokensFromDB(userId);
  return null;
}
```

## 🚀 Usage Examples

### For Web Routes (Express)
```javascript
router.get('/api/broadcasts', async (req, res) => {
  const tokens = await getTokensFromReq(req);
  if (!tokens) {
    return res.status(401).json({ error: 'YouTube not connected' });
  }
  
  // Use tokens - auto-refresh handled automatically
  const broadcasts = await youtubeService.listBroadcasts(tokens);
  res.json({ broadcasts });
});
```

### For Background Processes (Streaming)
```javascript
// In streamingService.js
const { getTokensForUser } = require('../routes/youtube');

async function startStream(streamId, userId) {
  // Get fresh tokens from database
  const tokens = await getTokensForUser(userId);
  
  if (!tokens) {
    console.error('No valid tokens for user');
    return;
  }
  
  // Use tokens - auto-refresh handled automatically
  await youtubeService.transitionBroadcast(tokens, broadcastId, 'live');
}
```

## 🔍 Debugging

### Check Token Status
```javascript
const tokenRow = await tokenManager.getTokensFromDB(userId);
console.log('Token expiry:', new Date(tokenRow.expiry_date));
console.log('Time until expiry:', tokenRow.expiry_date - Date.now(), 'ms');
```

### Monitor Auto-Refresh
```javascript
// Logs akan muncul saat token di-refresh:
// [TokenManager] 🔄 Auto-refresh detected for user 1, saving to DB...
// [TokenManager] ✅ Tokens updated for user 1
```

### Check for Deleted Client
```javascript
// Jika client dihapus, logs akan muncul:
// [TokenManager] ❌ OAuth Client deleted by Google/User. Cleaning up...
// [TokenManager] ✅ Tokens deleted for user 1
```

## ⚠️ Common Issues & Solutions

### Issue 1: "deleted_client" Error Berulang

**Penyebab:**
- Client ID di database tidak match dengan Google Cloud Console
- User mencabut akses aplikasi di Google Security Settings

**Solusi:**
```sql
-- Cek client ID di database
SELECT id, username, youtube_client_id FROM users WHERE id = 1;

-- Pastikan sama dengan Google Cloud Console
-- Jika berbeda, update:
UPDATE users SET 
  youtube_client_id = 'YOUR_CORRECT_CLIENT_ID',
  youtube_client_secret = 'YOUR_CORRECT_CLIENT_SECRET'
WHERE id = 1;

-- Hapus token lama dan reconnect
DELETE FROM youtube_tokens WHERE user_id = 1;
```

### Issue 2: Stream Tidak Auto-Recover Setelah Restart

**Penyebab:**
- Token expired saat server restart
- Background process tidak bisa akses token

**Solusi:**
✅ Sudah teratasi dengan token manager baru!
- Database sebagai source of truth
- Auto-refresh sebelum digunakan
- Event listener menjaga token selalu fresh

### Issue 3: RTMP Connection Failed

**Penyebab:**
- Stream key tidak valid
- Broadcast belum di-transition ke "live"

**Solusi:**
```javascript
// Pastikan format RTMP URL benar
const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;

// Transition broadcast ke live setelah FFmpeg connect
await youtubeService.transitionBroadcast(tokens, broadcastId, 'live');
```

## 📊 Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      Token Lifecycle                         │
└─────────────────────────────────────────────────────────────┘

1. User connects YouTube
   ↓
2. OAuth flow → Get access_token + refresh_token
   ↓
3. Save to database (youtube_tokens table)
   ↓
4. Token valid for ~1 hour
   ↓
5. Before expiry (5 min buffer):
   - Token manager detects expiry
   - Force refresh using refresh_token
   - Event listener saves new token to DB
   ↓
6. Google API calls:
   - If token expired → Google lib auto-refresh
   - Event listener saves new token to DB
   ↓
7. Token stays fresh indefinitely (as long as refresh_token valid)
   ↓
8. If refresh_token invalid:
   - Error: deleted_client or invalid_grant
   - Token manager deletes tokens from DB
   - User must reconnect YouTube
```

## 🎯 Best Practices

### 1. Always Use Token Manager
```javascript
// ✅ Good
const oauth2Client = await tokenManager.getAuthenticatedClient(userId);

// ❌ Bad
const tokens = req.session.youtubeTokens; // Session unreliable
```

### 2. Handle Null Returns
```javascript
const tokens = await getTokensFromReq(req);
if (!tokens) {
  return res.status(401).json({ error: 'YouTube not connected' });
}
```

### 3. Let Event Listener Handle Saves
```javascript
// ✅ Good - Event listener auto-saves
oauth2Client.on('tokens', async (tokens) => {
  await updateTokensInDB(userId, tokens);
});

// ❌ Bad - Manual save prone to race conditions
const newTokens = await oauth2Client.refreshAccessToken();
db.run('UPDATE youtube_tokens...'); // Might miss updates
```

### 4. Monitor Logs
```bash
# Watch for token refresh events
pm2 logs streambro | grep "TokenManager"

# Expected output:
# [TokenManager] 🔄 Auto-refresh detected for user 1
# [TokenManager] ✅ Tokens updated for user 1
```

## 🔐 Security Notes

1. **Refresh Token Storage**
   - Refresh tokens stored in database (encrypted recommended)
   - Never expose refresh_token in API responses
   - Only update refresh_token when Google sends new one

2. **Client Secret Protection**
   - Store in environment variables or database
   - Never commit to git
   - Rotate periodically

3. **Token Cleanup**
   - Auto-delete tokens when client deleted
   - Auto-delete tokens when grant invalid
   - User must reconnect after cleanup

## 📝 Migration Guide

### From Old System to New Token Manager

1. **Backup Database**
```bash
sqlite3 db/streambro.db ".backup db/streambro_backup.db"
```

2. **Deploy New Code**
```bash
git pull
pm2 restart streambro
```

3. **Test Token Refresh**
```bash
# Check logs for auto-refresh
pm2 logs streambro --lines 100 | grep "TokenManager"
```

4. **Verify Streaming Works**
- Create test stream
- Start streaming
- Restart PM2
- Verify stream auto-recovers

## 🎉 Benefits

✅ **VPS Safe**: Database sebagai source of truth
✅ **Auto-Refresh**: Event listener menjaga token fresh
✅ **Error Recovery**: Auto-cleanup saat client deleted
✅ **Background Safe**: Streaming process tidak kehilangan token
✅ **Session Independent**: Tidak bergantung pada user session
✅ **Race Condition Free**: Event listener mencegah race condition

## 📞 Support

Jika masih ada masalah:
1. Check logs: `pm2 logs streambro`
2. Check database: `sqlite3 db/streambro.db "SELECT * FROM youtube_tokens"`
3. Reconnect YouTube channel
4. Restart PM2: `pm2 restart streambro`
