# YouTube Auto Start/Stop - Technical Guide

## Masalah Utama

YouTube API sangat ketat terhadap field `contentDetails`. Jika mengirimkan objek yang tidak lengkap atau menyertakan field read-only, YouTube akan menolak seluruh request.

## Penyebab Error "400 Bad Request"

1. **Field Read-Only**: Mengirim field seperti `monitorStream`, `boundStreamId`, `cdn`, atau `ingestionInfo` akan ditolak
2. **Data Tidak Lengkap**: Harus mengirim kembali seluruh data `snippet` dan `status` yang sudah ada
3. **Type Mismatch**: `enableAutoStart` dan `enableAutoStop` harus boolean murni, bukan string

## Solusi: Fetch-Modify-Update Pattern

### 1. Ambil Data Broadcast Terlebih Dahulu

```javascript
const current = await youtubeService.getBroadcast(userId, { broadcastId });
```

### 2. Susun Request Body dengan Benar

```javascript
const requestBody = {
  id: broadcastId,
  snippet: {
    title: current.snippet.title,
    description: current.snippet.description,
    scheduledStartTime: current.snippet.scheduledStartTime,
  },
  status: {
    privacyStatus: current.status.privacyStatus,
  },
  contentDetails: {
    // Spread existing contentDetails
    ...current.contentDetails,
    // Override only what we want to change
    enableAutoStart: Boolean(enableAutoStart),
    enableAutoStop: Boolean(enableAutoStop),
  }
};

// CRITICAL: Remove read-only fields
delete requestBody.contentDetails.monitorStream;
delete requestBody.contentDetails.boundStreamId;
delete requestBody.contentDetails.latencyPreference; // Sometimes read-only
```

### 3. Kirim Update

```javascript
await yt.liveBroadcasts.update({
  part: 'snippet,status,contentDetails',
  requestBody: requestBody
});
```

## Implementasi Lengkap

```javascript
async function updateAutoStartStop(userId, { broadcastId, enableAutoStart, enableAutoStop }) {
  const yt = await getYouTubeClientFromTokensOrUserId(userId);
  
  // 1. Fetch current broadcast
  const current = await this.getBroadcast(userId, { broadcastId });
  if (!current) throw new Error("Broadcast not found");
  
  // 2. Build clean contentDetails
  const contentDetails = {
    enableAutoStart: Boolean(enableAutoStart),
    enableAutoStop: Boolean(enableAutoStop),
    enableMonitorStream: current.contentDetails?.enableMonitorStream ?? true,
  };
  
  // 3. Build complete request body
  const requestBody = {
    id: broadcastId,
    snippet: {
      title: current.snippet.title,
      description: current.snippet.description,
      scheduledStartTime: current.snippet.scheduledStartTime,
    },
    status: {
      privacyStatus: current.status.privacyStatus,
    },
    contentDetails: contentDetails
  };
  
  // 4. Execute update
  try {
    const res = await yt.liveBroadcasts.update({
      part: 'snippet,status,contentDetails',
      requestBody: requestBody
    });
    return res.data;
  } catch (err) {
    console.error('[YouTube Error] Detail:', JSON.stringify(err.response?.data || err.message, null, 2));
    throw err;
  }
}
```

## Bulk Update Considerations

### Quota Management
- Setiap `liveBroadcasts.update` = **50 units**
- 100 broadcasts = 5,000 units (50% dari daily quota 10,000)
- Gunakan batch processing dengan delay

### Rate Limiting
```javascript
// Process in batches with delay
for (const broadcast of broadcasts) {
  await updateAutoStartStop(userId, {
    broadcastId: broadcast.id,
    enableAutoStart: true,
    enableAutoStop: true
  });
  
  // Wait 100ms between requests to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Error Handling
```javascript
const results = {
  success: [],
  failed: []
};

for (const broadcast of broadcasts) {
  try {
    await updateAutoStartStop(userId, {
      broadcastId: broadcast.id,
      enableAutoStart: true,
      enableAutoStop: true
    });
    results.success.push(broadcast.id);
  } catch (err) {
    results.failed.push({
      id: broadcast.id,
      error: err.message
    });
  }
}
```

## Tips Penting

### Auto Start
- Hanya berfungsi jika encoder mengirim sinyal "Good" setelah `scheduledStartTime`
- VPS harus sudah streaming sebelum jadwal
- YouTube butuh 30-60 detik untuk validasi stream quality

### Auto Stop
- **SANGAT SENSITIF** terhadap koneksi
- Jika VPS terputus sejenak, broadcast akan langsung End
- Broadcast yang sudah End tidak bisa dibuka lagi
- **Rekomendasi**: Jangan gunakan Auto Stop jika koneksi VPS tidak 100% stabil

### Monitor Stream
- Field `monitorStream` adalah **read-only**
- Jangan pernah kirim field ini dalam update request
- YouTube akan otomatis set nilai ini

### Bound Stream ID
- Field `boundStreamId` adalah **read-only**
- Hanya bisa di-set melalui `liveBroadcasts.bind` endpoint
- Jangan kirim dalam update request

## Frontend Integration

### Convert String to Boolean
```javascript
// Frontend sering kirim string "true"/"false"
const enableAutoStart = req.body.enableAutoStart === 'true' || req.body.enableAutoStart === true;
const enableAutoStop = req.body.enableAutoStop === 'true' || req.body.enableAutoStop === true;
```

### Validation
```javascript
// Ensure boolean type
if (typeof enableAutoStart !== 'boolean' && enableAutoStart !== undefined) {
  return res.status(400).json({ error: 'enableAutoStart must be boolean' });
}
```

## Debugging

### Log Request Body
```javascript
console.log('[YouTube] Request Body:', JSON.stringify(requestBody, null, 2));
```

### Check Response
```javascript
console.log('[YouTube] Response:', JSON.stringify(response.data, null, 2));
```

### Common Errors

1. **"The field enableMonitorStream is required"**
   - Solution: Always include `enableMonitorStream: true` in contentDetails

2. **"Invalid value for contentDetails"**
   - Solution: Remove all read-only fields (monitorStream, boundStreamId, etc)

3. **"Snippet is required"**
   - Solution: Always include complete snippet with title, description, scheduledStartTime

4. **"Status is required"**
   - Solution: Always include status with privacyStatus

## Current Implementation Status

✅ Individual Edit - Working (uses correct pattern)
❌ Bulk Edit - Removed due to complexity and quota concerns
✅ Error Handling - Improved with detailed logging
✅ Token Management - Auto-refresh working

## Future Improvements

1. **Implement Proper Bulk Update**
   - Use queue system for rate limiting
   - Add progress tracking
   - Implement retry logic

2. **Add Validation Layer**
   - Validate all fields before sending to API
   - Strip read-only fields automatically

3. **Improve Error Messages**
   - User-friendly error messages
   - Suggest solutions based on error type

## References

- [YouTube Live Streaming API - Broadcasts](https://developers.google.com/youtube/v3/live/docs/liveBroadcasts)
- [YouTube API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube Live Streaming Best Practices](https://support.google.com/youtube/answer/2853702)
