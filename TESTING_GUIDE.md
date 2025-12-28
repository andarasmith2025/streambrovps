# Testing Guide - Broadcast Duplication Fix

## Current Status
- ✅ Fix deployed to VPS (PM2 restart #210)
- ✅ Server running normally
- ⏳ Waiting for test schedule creation

## Current Time
Check current server time:
```bash
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "date '+%H:%M:%S WIB'"
```

## Step 1: Create Test Schedule

1. **Open Dashboard**: http://85.9.195.103:3000
2. **Login as Admin**
3. **Click "New Stream"**
4. **Select "YouTube API" tab**
5. **Fill in details**:
   - Select YouTube channel
   - Select video
   - Set schedule time: **5-10 minutes from now**
   - Duration: 15-30 minutes (for testing)
   - Recurring: Choose today only (or one-time)
   - Upload thumbnail (optional but recommended)
6. **Save**

## Step 2: Verify Schedule Created

Run this command to check:
```bash
check-new-schedule.bat
```

Or manually:
```bash
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && node check-admin-schedules-vps.js"
```

## Step 3: Monitor Logs

Run this to monitor real-time:
```bash
monitor-test-schedule.bat
```

Or manually:
```bash
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro"
```

## Expected Timeline (Example: Schedule at 16:45)

### T-3 minutes (16:42)
**BroadcastScheduler creates broadcast**
```
[BroadcastScheduler] Memproses jadwal ID: xxx
[BroadcastScheduler] 📤 Creating broadcast in YouTube...
[BroadcastScheduler] ✅ SUCCESS: Broadcast ABC123 created with thumbnail
```

### T-2 minutes (16:43)
**FFmpeg starts (YouTube API mode)**
```
[Scheduler] ✓ Schedule matched: xxx
[Scheduler] Starting stream for schedule xxx
[StreamingService] Starting stream: xxx
Starting stream: ffmpeg -re -stream_loop -1 -i ...
```

### T-0 minutes (16:45)
**StreamingService checks for existing broadcast**

✅ **EXPECTED (Fix working)**:
```
[StreamingService] Creating NEW YouTube broadcast for stream xxx...
[StreamingService] ⚠️ Broadcast already exists: ABC123
[StreamingService] Skipping broadcast creation to prevent duplication
```

❌ **UNEXPECTED (Fix not working)**:
```
[StreamingService] Creating NEW YouTube broadcast for stream xxx...
[StreamingService] ✓ New broadcast created: XYZ789
```
(This means 2 broadcasts created - duplication!)

### T+0 to T+1 minutes (16:45-16:46)
**YouTube auto-transition to LIVE**
```
[YouTube] Stream should auto-transition to live (enableAutoStart: true)
```

Check YouTube Studio to verify:
- Only 1 broadcast appears
- Stream status changes to "Live"

## Step 4: Verify in YouTube Studio

1. Open YouTube Studio
2. Go to "Live" section
3. Check "Upcoming" or "Live" broadcasts
4. **Should see only 1 broadcast** for your schedule

## Step 5: Check Auto-Stop

Wait until schedule end time, then check:
```
[Scheduler] ⏰ Stream xxx reached scheduled end time
[Scheduler] Stopping stream xxx (scheduled end)
[StreamingService] Stopping stream xxx...
```

## Troubleshooting

### If 2 broadcasts appear:
1. Check if fix was actually deployed:
   ```bash
   ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "grep -A 5 'CRITICAL FIX: Check if broadcast already exists' /root/streambrovps/services/streamingService.js"
   ```
2. Check PM2 restart count (should be #210 or higher)
3. Check logs for error messages

### If stream doesn't start:
1. Check scheduler logs for errors
2. Verify YouTube channel has valid tokens
3. Check FFmpeg process is running

### If stream doesn't go live:
1. Check if broadcast was created in YouTube
2. Check FFmpeg is sending data (check stream status in YouTube)
3. Wait 1-2 minutes for YouTube ingestion

## Quick Commands Reference

**Check current time:**
```bash
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "date '+%H:%M:%S WIB'"
```

**Check admin schedules:**
```bash
check-new-schedule.bat
```

**Monitor logs:**
```bash
monitor-test-schedule.bat
```

**Check PM2 status:**
```bash
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 list"
```

**Check specific time range in logs:**
```bash
ssh -i %USERPROFILE%\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --lines 200 --nostream | grep -E '(16:4[0-9]|Broadcast)'"
```

## Success Criteria

✅ Only 1 broadcast created per schedule
✅ Stream starts at scheduled time
✅ Stream goes live automatically
✅ Stream stops at scheduled end time
✅ No duplicate broadcasts in YouTube Studio

## Notes

- Fix prevents duplication by checking database before creating broadcast
- BroadcastScheduler creates broadcast 3-5 minutes early
- StreamingService skips creation if broadcast already exists
- YouTube auto-transitions to live with `enableAutoStart: true`
- Node.js controls stop with `enableAutoStop: false`
