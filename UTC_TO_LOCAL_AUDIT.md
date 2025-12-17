# UTC to Local Time Conversion Audit

## Summary
All UTC references have been converted to use local time (Asia/Jakarta, UTC+7). The server timezone is set to Asia/Jakarta and all date/time operations now use local time instead of UTC.

## Changes Made

### 1. Server Timezone Configuration
- **Status**: ✅ COMPLETED
- **Command**: `timedatectl set-timezone Asia/Jakarta`
- **Verification**: Server shows `Time zone: Asia/Jakarta (WIB, +0700)`

### 2. Recovery Mode (services/streamingService.js)
- **Status**: ✅ FIXED
- **Lines**: 1051-1052
- **Change**: 
  - Before: `scheduleTime.getUTCHours()` and `scheduleTime.getUTCMinutes()`
  - After: `scheduleTime.getHours()` and `scheduleTime.getMinutes()`
- **Impact**: Recovery mode now correctly calculates schedule windows using local time

### 3. Database Default Timezone (db/database.js)
- **Status**: ✅ FIXED
- **Line**: 230
- **Change**:
  - Before: `user_timezone TEXT DEFAULT 'UTC'`
  - After: `user_timezone TEXT DEFAULT 'Asia/Jakarta'`
- **Impact**: New schedules default to Asia/Jakarta timezone

### 4. StreamSchedule Model (models/StreamSchedule.js)
- **Status**: ✅ FIXED
- **Line**: 22
- **Change**:
  - Before: `data.user_timezone || 'UTC'`
  - After: `data.user_timezone || 'Asia/Jakarta'`
- **Impact**: Schedule creation defaults to Asia/Jakarta timezone

### 5. Scheduler Service (services/schedulerService.js)
- **Status**: ✅ ALREADY CORRECT
- **Lines**: 70-79
- **Details**: Already has logic to detect UTC format (with 'Z' suffix) and convert to local time
- **Code**:
  ```javascript
  if (schedule.schedule_time.endsWith('Z')) {
    // UTC format - convert to local time
    const utcDate = new Date(schedule.schedule_time);
    scheduleHour = utcDate.getHours();  // Returns local time
    scheduleMinute = utcDate.getMinutes();
  }
  ```

## Remaining UTC References (Safe to Keep)

### 1. toISOString() Usage
- **Status**: ✅ SAFE - Used for database storage only
- **Files**: Multiple files
- **Reason**: ISO format is standard for database timestamps. The Date object automatically handles timezone conversion when reading.

### 2. Helper Function (app.js lines 190-195)
- **Status**: ✅ SAFE - Converts to local display
- **Code**:
  ```javascript
  const utcDate = new Date(isoString);
  return utcDate.toLocaleString('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // ... format options
  });
  ```
- **Reason**: This correctly converts UTC timestamps from database to local time for display

### 3. YouTube API (views/youtube_manage.ejs)
- **Status**: ✅ SAFE - YouTube API requirement
- **Reason**: YouTube API requires ISO format with timezone. The code correctly handles conversion.

## Schedule Time Format Standards

### Frontend Input
- Format: `YYYY-MM-DDTHH:MM` (datetime-local input)
- Example: `2025-12-17T19:46`
- Timezone: Local (Asia/Jakarta)

### Database Storage
- Format: `YYYY-MM-DDTHH:MM:SS.000` (without 'Z' suffix for local time)
- Example: `2025-12-17T19:46:00.000`
- Timezone: Local (Asia/Jakarta)

### Legacy UTC Format (Backward Compatibility)
- Format: `YYYY-MM-DDTHH:MM:SS.000Z` (with 'Z' suffix)
- Example: `2025-12-15T05:07:00.000Z`
- Handling: Automatically detected and converted to local time by scheduler

## Testing Checklist

- [x] Server timezone set to Asia/Jakarta
- [x] Recovery mode uses local time
- [x] New schedules default to Asia/Jakarta
- [x] Scheduler correctly handles both UTC and local formats
- [x] Schedule creation saves in local format
- [x] Schedule display shows correct local time
- [x] Auto-start triggers at correct local time
- [x] Auto-stop works after duration expires

## Deployment

**Date**: December 17, 2025
**Commit**: ff989be
**Files Changed**:
- services/streamingService.js
- db/database.js
- models/StreamSchedule.js

**Deployment Command**:
```bash
cd /root/streambrovps
git pull origin main
pm2 reload streambro
```

## Verification

Check logs to confirm local time usage:
```bash
pm2 logs streambro --lines 50
```

Expected log output:
- `[Scheduler] Checking schedules at HH:MM on DayName (day N)` - shows local time
- `[Recovery] Recurring schedule ... NOT in active window. Current: HH:MM, Schedule: HH:MM - HH:MM` - all local times
- `[UPDATE STREAM] Created recurring schedule ... "user_timezone":"Asia/Jakarta"` - confirms timezone

## Conclusion

✅ **ALL UTC REFERENCES HAVE BEEN AUDITED AND FIXED**

The system now operates entirely in local time (Asia/Jakarta, UTC+7). All schedule operations, recovery mode, and auto-start/stop functionality use local time. Legacy UTC format schedules are automatically detected and converted for backward compatibility.
