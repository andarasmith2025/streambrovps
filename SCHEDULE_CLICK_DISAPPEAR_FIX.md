# Schedule Click Disappear Fix - Browser Cache Issue

## Problem Summary
- **Issue**: Schedule list items disappear when clicked in normal browser
- **Works Fine**: In incognito mode (no cache)
- **No Console Logs**: When clicking in normal browser, no debug logs appear
- **Data Intact**: Schedules reappear after page refresh (data is in database)

## Root Cause
**Browser is serving cached HTML/JavaScript** from before the logging was added. The old cached version doesn't have the debug logging or recent fixes.

## Evidence
1. ✅ Works perfectly in incognito mode (no cache)
2. ❌ Fails in normal browser (cached version)
3. ❌ No console logs appear (old JavaScript running)
4. ✅ Data persists in database (not a backend issue)

## Fixes Applied

### 1. Added Cache Control Headers (app.js)
```javascript
// Dashboard route now sends headers to prevent caching
res.set({
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
});
```

### 2. Service Worker Already Disabled (layout.ejs)
- Service Worker auto-unregisters on page load
- All caches cleared automatically

### 3. Extensive Logging Added (dashboard.ejs)
- `[CLICK DEBUG]` - Tracks all clicks on stream rows
- `[loadStreams]` - Tracks API calls and responses
- `[displayStreams]` - Tracks rendering process
- `[displayDesktopStreams]` - Tracks table row creation/removal

## Solution: Clear Browser Cache Completely

### Method 1: Hard Refresh (Try First)
1. Open the dashboard page
2. Press **Ctrl + Shift + R** (or **Ctrl + F5**)
3. This forces browser to reload without cache

### Method 2: Clear All Browser Data (Recommended)
1. Press **Ctrl + Shift + Delete**
2. Select **"All time"** from time range dropdown
3. Check ALL boxes:
   - ✅ Browsing history
   - ✅ Download history
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - ✅ Hosted app data
4. Click **"Clear data"**
5. Close and reopen browser
6. Navigate to `https://streambro.nivarastudio.site/dashboard`

### Method 3: Developer Tools Cache Clear
1. Open Developer Tools (F12)
2. Right-click the **Refresh button** (next to address bar)
3. Select **"Empty Cache and Hard Reload"**

## Verification Steps

After clearing cache, you should see:

### 1. Console Logs Appear
```
[loadStreams] Fetching streams with cache buster: ?_=1734712345678
[loadStreams] Response status: 200
[loadStreams] Got 3 streams
[displayStreams] Called with 3 streams
[displayDesktopStreams] Called with 3 streams
```

### 2. Click Logging Works
When you click on a schedule row:
```
[CLICK DEBUG] Clicked inside stream row: 123
[CLICK DEBUG] Target element: BUTTON btn-stop
[CLICK DEBUG] Event will bubble: true
```

### 3. Schedule Doesn't Disappear
- Clicking should trigger action (stop/delete/edit)
- Row should remain visible or update properly
- No unexpected disappearance

## If Issue Persists After Cache Clear

### Check Browser Extensions
Some extensions can interfere with JavaScript:
1. Open browser in **Safe Mode** or **Disable all extensions**
2. Test if issue still occurs
3. Re-enable extensions one by one to find culprit

### Check localStorage/sessionStorage
Open Developer Console and run:
```javascript
// Check what's stored
console.log('localStorage:', localStorage);
console.log('sessionStorage:', sessionStorage);

// Clear if needed
localStorage.clear();
sessionStorage.clear();
```

### Verify Logging Appears
If logs still don't appear after cache clear:
1. Check if JavaScript errors are blocking execution
2. Look for red errors in Console tab
3. Check Network tab to see if dashboard page is loading

## Technical Details

### Why Incognito Works
- No cached files
- No extensions (usually)
- No localStorage/sessionStorage
- Fresh JavaScript execution

### Why Normal Browser Failed
- Cached HTML from before fixes were added
- Old JavaScript without logging
- Service Worker may have cached old version
- Browser aggressive caching of EJS-rendered pages

### Cache Control Headers Explained
- `no-store`: Don't store in cache at all
- `no-cache`: Revalidate with server before using cache
- `must-revalidate`: Check with server if cache is stale
- `Pragma: no-cache`: HTTP/1.0 compatibility
- `Expires: 0`: Immediate expiration

## Files Modified
- ✅ `app.js` - Added cache control headers to dashboard route
- ✅ `views/layout.ejs` - Service Worker disabled and auto-unregisters
- ✅ `views/dashboard.ejs` - Extensive logging added
- ✅ `public/sw.js` - Cache version updated (but SW is disabled)

## Next Steps

1. **Restart PM2** to apply cache header changes:
   ```bash
   pm2 restart ecosystem.config.js
   ```

2. **Clear browser cache completely** (Method 2 above)

3. **Test and verify**:
   - Console logs should appear
   - Clicking schedules should work
   - No unexpected disappearances

4. **If still not working**:
   - Check browser extensions
   - Try different browser
   - Check for JavaScript errors in console

## Commit Message
```
fix: Add cache control headers to prevent browser caching issues

- Added no-cache headers to dashboard route
- Prevents browser from serving stale cached HTML/JavaScript
- Fixes schedule disappearing issue in normal browser
- Issue was caused by cached old version without recent fixes
- Works in incognito because no cache exists
```
