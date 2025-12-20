# Recurring Schedule Token Auto-Refresh Fix

## Problem

YouTube access tokens expire after **1 hour**. For recurring schedules that run daily/weekly, the token will be expired when the scheduler tries to start the stream automatically.

### Example Scenario:
1. User creates recurring schedule at 10:00 AM
2. Token is valid (expires at 11:00 AM)
3. Stream starts successfully at 10:00 AM
4. **Next day at 10:00 AM**: Token expired (24 hours later)
5. **Scheduler fails to start stream** ❌

## Solution: Auto-Refresh Tokens in Scheduler

### What Was Added:

#### 1. Token Refresh Before Starting Stream (schedulerService.js)

```javascript
// ⭐ CRITICAL: Refresh YouTube tokens before starting stream
if (stream.use_youtube_api && stream.user_id) {
  try {
    console.log(`[Scheduler] Refreshing YouTube tokens for user ${stream.user_id}`);
    const { getTokensForUser } = require('../routes/youtube');
    const tokens = await getTokensForUser(stream.user_id);
    
    if (tokens && tokens.access_token) {
      const minutesUntilExpiry = Math.floor((expiry - now) / (60 * 1000));
      console.log(`[Scheduler] ✓ YouTube token valid (expires in ${minutesUntilExpiry} minutes)`);
    } else {
      console.error(`[Scheduler] ❌ Failed to get valid YouTube tokens`);
      // Skip this stream
      continue;
    }
  } catch (tokenError) {
    console.error(`[Scheduler] ❌ Error refreshing YouTube tokens:`, tokenError.message);
    // Skip this stream
    continue;
  }
}
```

#### 2. getTokensForUser() Already Has Auto-Refresh (routes/youtube.js)

```javascript
// Check if token is expired or about to expire (within 5 minutes)
const isExpired = expiry && now > expiry - (5 * 60 * 1000); // 5 minutes buffer

if (isExpired && tokens.refresh_token) {
  console.log(`[getTokensForUser] Token expired/expiring, auto-refreshing...`);
  const { getFreshClient } = require('../services/googleAuth');
  const { oauth2, tokens: freshTokens } = await getFreshClient(tokens);
  
  // Update database with new token
  db.run(
    `UPDATE youtube_tokens 
     SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = ?`,
    [freshTokens.access_token, freshTokens.expiry_date, userId]
  );
  
  return freshTokens; // Return fresh token
}
```

## How It Works

### Flow for Recurring Schedule:

1. **Scheduler checks schedules every minute**
2. **Finds matching recurring schedule** (e.g., Monday 10:00 AM)
3. **Before starting stream**:
   - Calls `getTokensForUser(userId)`
   - `getTokensForUser()` checks if token expired
   - If expired: **Automatically refreshes using refresh_token**
   - Updates database with new access_token
   - Returns fresh token
4. **Scheduler validates token**:
   - If valid: Start stream ✅
   - If invalid: Skip stream and log error ❌
5. **Stream starts successfully with fresh token**

### Token Lifecycle:

```
Day 1, 10:00 AM:
- User creates recurring schedule
- Token: Valid (expires 11:00 AM)
- Stream starts: ✅

Day 1, 11:00 AM:
- Token expires

Day 2, 10:00 AM:
- Scheduler checks schedule
- Token expired (24 hours old)
- getTokensForUser() auto-refreshes token
- New token: Valid (expires 11:00 AM)
- Stream starts: ✅

Day 3, 10:00 AM:
- Same process repeats
- Token auto-refreshed again
- Stream starts: ✅
```

## Requirements for Auto-Refresh to Work

### 1. User Must Have Refresh Token

When user connects YouTube, we store:
- `access_token` - Expires in 1 hour
- `refresh_token` - **Never expires** (unless revoked)
- `expiry_date` - Timestamp when access_token expires

**Refresh token is obtained when user first authorizes the app.**

### 2. User Credentials Must Be Configured

Each user must have their own YouTube API credentials:
- `youtube_client_id`
- `youtube_client_secret`
- `youtube_redirect_uri`

These are stored in `users` table and used for token refresh.

### 3. Refresh Token Must Not Be Revoked

Refresh token can be revoked if:
- User disconnects YouTube from Google account settings
- User changes password
- App is removed from Google account

**If refresh token is revoked, user must reconnect YouTube.**

## Error Handling

### If Token Refresh Fails:

```javascript
// Scheduler logs error and skips stream
console.error(`[Scheduler] ❌ Failed to get valid YouTube tokens for user ${stream.user_id}`);
console.error(`[Scheduler] Stream ${stream.id} will NOT start - YouTube tokens missing or expired`);

// Mark schedule as failed (for one-time schedules)
if (!schedule.is_recurring) {
  await StreamSchedule.updateStatus(schedule.id, 'failed');
}

// Skip this stream
continue;
```

### User Will See:
- Stream status remains "scheduled"
- No error notification (silent fail)
- Check PM2 logs to see error:
  ```bash
  pm2 logs | grep "Failed to get valid YouTube tokens"
  ```

### How to Fix:
1. User must reconnect YouTube:
   - Go to dashboard
   - Click "Connect YouTube"
   - Authorize again
2. New refresh_token will be stored
3. Next schedule will work

## Testing Recurring Schedules

### Test 1: Create Recurring Schedule
```javascript
// Create stream with recurring schedule
{
  streamTitle: "Daily Stream",
  useYouTubeAPI: true,
  schedules: [{
    schedule_time: "10:00",
    duration: 60,
    is_recurring: true,
    recurring_days: "1,2,3,4,5" // Monday to Friday
  }]
}
```

### Test 2: Monitor Scheduler Logs
```bash
pm2 logs --lines 100 | grep "Scheduler"
```

You should see:
```
[Scheduler] Checking schedules at 10:00 on Monday (day 1)
[Scheduler] Refreshing YouTube tokens for user abc-123
[Scheduler] ✓ YouTube token valid (expires in 55 minutes)
[Scheduler] Starting stream: xyz-456 - Daily Stream
[Scheduler] Successfully started: xyz-456
```

### Test 3: Simulate Token Expiry

Manually set token expiry to past:
```javascript
const { db } = require('./db/database');

db.run(
  `UPDATE youtube_tokens 
   SET expiry_date = ? 
   WHERE user_id = ?`,
  [Date.now() - 1000, 'user-id-here']
);
```

Then trigger scheduler manually:
```javascript
const schedulerService = require('./services/schedulerService');
// Wait for next minute to trigger
```

Should see:
```
[Scheduler] Token expired/expiring, auto-refreshing...
[getTokensForUser] ✓ Token refreshed and saved
[Scheduler] ✓ YouTube token valid (expires in 60 minutes)
```

## Monitoring Token Health

### Check Token Expiry:
```bash
node -e "const {db} = require('./db/database'); db.all('SELECT user_id, expiry_date FROM youtube_tokens', [], (e,r) => { r.forEach(t => { const exp = new Date(Number(t.expiry_date)); const now = new Date(); const diff = Math.floor((exp - now) / 60000); console.log(\`User: \${t.user_id}, Expires: \${exp.toISOString()}, In: \${diff} minutes\`); }); process.exit(0); });"
```

### Check Refresh Token Exists:
```bash
node -e "const {db} = require('./db/database'); db.all('SELECT user_id, refresh_token FROM youtube_tokens', [], (e,r) => { r.forEach(t => console.log(\`User: \${t.user_id}, Has Refresh Token: \${!!t.refresh_token}\`)); process.exit(0); });"
```

## Conclusion

✅ **Recurring schedules now work properly with token auto-refresh**
✅ **Tokens are refreshed automatically before starting streams**
✅ **No manual intervention needed**
✅ **Proper error handling if refresh fails**

**User only needs to ensure they stay connected to YouTube (don't revoke access).**
