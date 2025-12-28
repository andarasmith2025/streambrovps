# DEPLOY BROADCAST FIX - URGENT

## Problem
2 broadcasts masih terbentuk untuk 1 jadwal karena fix belum di-deploy ke VPS.

## Fix Yang Sudah Dibuat
File `services/streamingService.js` sudah dimodifikasi dengan duplicate check di function `createNewBroadcast()` (line ~356).

## Deploy Steps

### Option 1: Manual Upload (Recommended)
```bash
# 1. Upload file
scp services/streamingService.js root@85.9.195.103:/root/streambrovps/services/

# 2. Restart PM2
ssh root@85.9.195.103 "cd /root/streambrovps && pm2 restart streambro"

# 3. Check logs
ssh root@85.9.195.103 "pm2 logs streambro --lines 50"
```

### Option 2: Using WinSCP
1. Open WinSCP
2. Connect to 85.9.195.103
3. Navigate to `/root/streambrovps/services/`
4. Upload `services/streamingService.js`
5. Open PuTTY and run: `pm2 restart streambro`

### Option 3: Using FileZilla
1. Open FileZilla
2. Connect to 85.9.195.103 (SFTP)
3. Navigate to `/root/streambrovps/services/`
4. Upload `services/streamingService.js`
5. Open PuTTY and run: `pm2 restart streambro`

## After Deploy

### Test Steps
1. **Buat jadwal baru** untuk 5-10 menit ke depan
2. **Monitor logs** saat T-3 menit (broadcast creation by scheduler):
   ```bash
   ssh root@85.9.195.103 "pm2 logs streambro --lines 100 | grep -i broadcast"
   ```
3. **Monitor logs** saat T-0 menit (FFmpeg start):
   ```bash
   ssh root@85.9.195.103 "pm2 logs streambro --lines 100 | grep -i 'already exists'"
   ```
4. **Cek YouTube Studio** - harus hanya ada 1 broadcast

### Expected Logs After Fix
```
[BroadcastScheduler] Creating broadcast... (T-3 minutes)
[BroadcastScheduler] ✅ SUCCESS: Broadcast ABC123 created

[StreamingService] Creating NEW YouTube broadcast... (T-0 minutes)
[StreamingService] ⚠️ Broadcast already exists: ABC123
[StreamingService] Skipping broadcast creation to prevent duplication
```

## If Still Failing

### Check 1: Verify File Was Uploaded
```bash
ssh root@85.9.195.103 "grep -A 5 'CRITICAL FIX: Check if broadcast already exists' /root/streambrovps/services/streamingService.js"
```

Should show:
```javascript
// ⭐ CRITICAL FIX: Check if broadcast already exists (prevent duplication)
const currentStream = await Stream.findById(streamId);
if (currentStream && currentStream.youtube_broadcast_id) {
  console.log(`[StreamingService] ⚠️ Broadcast already exists: ${currentStream.youtube_broadcast_id}`);
  console.log(`[StreamingService] Skipping broadcast creation to prevent duplication`);
  return; // Exit early - broadcast already created by scheduler
}
```

### Check 2: Verify PM2 Restarted
```bash
ssh root@85.9.195.103 "pm2 list"
```

Should show restart count increased.

### Check 3: Check PM2 Logs for Errors
```bash
ssh root@85.9.195.103 "pm2 logs streambro --err --lines 50"
```

## Current PM2 Restart Count
Before deploy: #209
After deploy: #210 (will increment)

## Files Modified
- `services/streamingService.js` - Added duplicate check in `createNewBroadcast()` function
