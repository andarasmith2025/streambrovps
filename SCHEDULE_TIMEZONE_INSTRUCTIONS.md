# Schedule Timezone - User Instructions

## ✅ Timezone Fix is Complete and Working!

The system now automatically handles timezone conversion. You can use your local time (WIB, WITA, or WIT), and the system will execute schedules correctly.

## 🔧 What Was Fixed

### 1. Frontend (Dashboard)
- ✅ Auto-detects your timezone (Asia/Jakarta for WIB)
- ✅ Converts your local time to UTC before saving
- ✅ Displays schedules in your local time when editing

### 2. Backend (Scheduler)
- ✅ Stores schedules in UTC format (universal)
- ✅ Converts UTC back to local time for execution
- ✅ Compares with current local time to trigger streams

### 3. Database
- ✅ Added `user_timezone` column to track user's timezone
- ✅ Stores UTC time for universal compatibility

## ⚠️ Important: Delete Old Schedules

**Old schedules created before this fix will NOT work correctly.**

The schedule you created at 7:20 was stored incorrectly because it was created before the timezone detection was implemented.

### Steps to Fix:
1. Go to your dashboard
2. Find the stream with the wrong schedule
3. Click **Edit** on that stream
4. Delete the old schedule
5. Create a new schedule with the same time
6. Click **Save**

The new schedule will use the correct timezone conversion.

## 📝 How to Create a Schedule

### Example: Schedule a stream for 7:20 AM WIB

1. Click **New Stream** or **Edit** existing stream
2. Switch to **Schedule** mode
3. Set **Start Time**: `07:20`
4. Set **Duration**: `1:00` (1 hour)
5. Enable **Recurring** if you want it to repeat daily
6. Select days: Mon, Tue, Wed, Thu, Fri, Sat, Sun
7. Click **Create Stream** or **Save**

### What Happens Behind the Scenes:
- **You enter**: 07:20 (your local time in WIB)
- **System stores**: 00:20 UTC (automatically converted)
- **System executes**: 07:20 WIB (converts back to your local time)

## 🧪 Testing the Schedule

### Quick Test (2 minutes from now):
1. Check current time: Let's say it's **10:28 AM**
2. Create a schedule for: **10:30 AM**
3. Wait 2 minutes
4. Stream should start automatically at 10:30 AM

### Monitor the Logs:
```bash
pm2 logs streambro --lines 50
```

### What to Look For:
```
[Scheduler] Checking schedules at 10:30 on Tuesday (day 2)
[Scheduler] Found 1 pending schedule(s)
[Scheduler] Parsed datetime (UTC->Local): 2025-12-16T03:30:00.000Z -> Local: 10:30 (Timezone: Asia/Jakarta)
[Scheduler] Time comparison: schedule=10:30, now=10:30
[Scheduler] ✓ Recurring schedule matched
[Scheduler] Starting stream: [stream-id] - [stream-title]
[Scheduler] Successfully started: [stream-id]
```

## 🌍 Multi-Timezone Support

The system now supports users in different timezones:
- **WIB** (Western Indonesia Time) = UTC+7
- **WITA** (Central Indonesia Time) = UTC+8
- **WIT** (Eastern Indonesia Time) = UTC+9

Each user sees and enters their local time, and the system handles conversion automatically.

## 🔍 Troubleshooting

### Schedule Not Executing?

1. **Check if schedule is old**: Delete and recreate it
2. **Check server logs**: `pm2 logs streambro --lines 50`
3. **Verify schedule time**: Edit stream and check the time displayed
4. **Check recurring days**: Make sure today is selected

### Schedule Shows Wrong Time?

This means it was created before the timezone fix. Delete and recreate it.

### How to Verify Timezone Detection?

Open browser console (F12) and run:
```javascript
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
```

Should show: `Asia/Jakarta` (for WIB)

## 📊 Database Query (For Debugging)

To check schedules in database:
```bash
node -e "const { db } = require('./db/database'); db.all('SELECT id, stream_id, schedule_time, user_timezone, is_recurring, recurring_days FROM stream_schedules ORDER BY schedule_time', (err, rows) => { if (err) console.error(err); else console.log(JSON.stringify(rows, null, 2)); process.exit(0); });"
```

## ✨ Benefits

1. **No manual timezone conversion** - Just use your local time
2. **Multi-user support** - Each user can be in different timezone
3. **Accurate execution** - Streams start exactly at scheduled time
4. **Easy to understand** - See and enter times in your local timezone

## 🚀 Ready to Use!

The timezone fix is complete and tested. Just delete old schedules and create new ones. The system will handle everything automatically!

## 📞 Need Help?

If schedules still don't work after recreating them:
1. Share the PM2 logs: `pm2 logs streambro --lines 100`
2. Share the database query output (command above)
3. Mention the time you set and the time it should execute
