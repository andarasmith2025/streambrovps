# YouTube API Monetization Analysis

## 🎯 **Pertanyaan**: Apakah Monetization Masih Bisa Diatur via YouTube API?

### **Jawaban Singkat**: ✅ **YA, masih bisa** - tapi dengan beberapa catatan penting.

## 📊 **Status Monetization di YouTube API (2024)**

### **1. Monetization Masih Tersedia**
```javascript
// YouTube API masih support monetizationDetails
const broadcast = {
  part: 'snippet,status,contentDetails,monetizationDetails', // ✅ Masih ada
  requestBody: {
    snippet: { /* ... */ },
    status: { /* ... */ },
    contentDetails: { /* ... */ },
    monetizationDetails: {
      // ✅ Monetization settings masih bisa diatur
    }
  }
}
```

### **2. Struktur monetizationDetails**
Berdasarkan dokumentasi YouTube API terbaru:
```javascript
monetizationDetails: {
  cuepointSchedule: {
    enabled: boolean,           // Enable/disable ad insertion
    pauseAdsUntil: datetime,    // Pause ads until specific time
    repeatIntervalSecs: number, // Ad insertion interval (seconds)
    type: string               // "concurrent" or "nonConcurrent"
  }
}
```

## 🔍 **Implementasi Saat Ini di StreamBro**

### **Yang Sudah Ada**:
```javascript
// services/youtubeService.js - scheduleLive()
const broadcastRes = await yt.liveBroadcasts.insert({
  part: 'snippet,status,contentDetails', // ❌ Tidak include monetizationDetails
  requestBody: {
    snippet: { /* title, description, tags */ },
    status: { /* privacy */ },
    contentDetails: { /* autoStart, autoStop */ }
    // ❌ MISSING: monetizationDetails
  }
});
```

### **Yang Belum Ada**:
- ❌ `monetizationDetails` tidak di-include dalam `part` parameter
- ❌ Tidak ada field monetization di frontend form
- ❌ Tidak ada setting untuk enable/disable ads
- ❌ Tidak ada kontrol ad scheduling

## 🛠️ **Cara Menambahkan Monetization Support**

### **Step 1: Update Frontend Form**

Tambahkan ke `views/partials/modals/stream-modal-youtube-api.ejs`:

```html
<!-- Monetization Settings -->
<div class="border-t border-gray-700 pt-3 mt-3">
  <button type="button" onclick="toggleYouTubeMonetizationSettings()"
    class="flex items-center justify-between w-full px-2 py-2 hover:bg-dark-700/30 rounded transition-colors">
    <span class="text-sm font-medium text-white">
      <i class="ti ti-currency-dollar mr-1.5"></i>Monetization Settings (Optional)
    </span>
    <i class="ti ti-chevron-down text-gray-400 transition-transform duration-200" id="youtubeMonetizationIcon"></i>
  </button>
  
  <div id="youtubeMonetizationSettings" class="hidden mt-3 space-y-3">
    <div>
      <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input type="checkbox" name="youtubeEnableMonetization" id="youtubeEnableMonetization" class="w-4 h-4 rounded">
        <span>Enable Monetization (Ads)</span>
      </label>
      <p class="text-xs text-gray-500 mt-1 ml-6">Enable ads on this live stream (requires eligible channel)</p>
    </div>
    
    <div id="monetizationOptions" class="hidden space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium text-white block mb-2">Ad Type</label>
          <select name="youtubeAdType" id="youtubeAdType"
            class="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm">
            <option value="concurrent">Concurrent (ads during stream)</option>
            <option value="nonConcurrent">Non-Concurrent (ads between segments)</option>
          </select>
        </div>
        
        <div>
          <label class="text-sm font-medium text-white block mb-2">Ad Interval (minutes)</label>
          <input type="number" name="youtubeAdInterval" id="youtubeAdInterval" min="1" max="60" value="10"
            class="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm"
            placeholder="10">
        </div>
      </div>
      
      <div>
        <label class="text-sm font-medium text-white block mb-2">Pause Ads Until (Optional)</label>
        <input type="datetime-local" name="youtubePauseAdsUntil" id="youtubePauseAdsUntil"
          class="w-full px-4 py-2.5 bg-dark-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-sm">
        <p class="text-xs text-gray-500 mt-1">Delay ad insertion until specified time</p>
      </div>
    </div>
  </div>
</div>

<script>
function toggleYouTubeMonetizationSettings() {
  const settings = document.getElementById('youtubeMonetizationSettings');
  const icon = document.getElementById('youtubeMonetizationIcon');
  
  if (settings.classList.contains('hidden')) {
    settings.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
  } else {
    settings.classList.add('hidden');
    icon.style.transform = 'rotate(0deg)';
  }
}

// Show/hide monetization options based on checkbox
document.getElementById('youtubeEnableMonetization').addEventListener('change', function() {
  const options = document.getElementById('monetizationOptions');
  if (this.checked) {
    options.classList.remove('hidden');
  } else {
    options.classList.add('hidden');
  }
});
</script>
```

### **Step 2: Update Backend Processing**

Tambahkan ke `app.js` - parameter processing:

```javascript
// Add YouTube monetization settings if using YouTube API
if (useYouTubeAPI) {
  // ... existing parameters ...
  
  // Monetization settings
  streamData.youtube_enable_monetization = req.body.youtubeEnableMonetization === 'true' || req.body.youtubeEnableMonetization === true;
  streamData.youtube_ad_type = req.body.youtubeAdType || 'concurrent';
  streamData.youtube_ad_interval = parseInt(req.body.youtubeAdInterval) || 10;
  streamData.youtube_pause_ads_until = req.body.youtubePauseAdsUntil || null;
  
  console.log(`[CREATE STREAM] Monetization enabled: ${streamData.youtube_enable_monetization}`);
  if (streamData.youtube_enable_monetization) {
    console.log(`[CREATE STREAM] Ad type: ${streamData.youtube_ad_type}, Interval: ${streamData.youtube_ad_interval}m`);
  }
}
```

### **Step 3: Update Database Schema**

Tambahkan kolom monetization ke tabel `streams`:

```sql
ALTER TABLE streams ADD COLUMN youtube_enable_monetization BOOLEAN DEFAULT FALSE;
ALTER TABLE streams ADD COLUMN youtube_ad_type VARCHAR(20) DEFAULT 'concurrent';
ALTER TABLE streams ADD COLUMN youtube_ad_interval INTEGER DEFAULT 10;
ALTER TABLE streams ADD COLUMN youtube_pause_ads_until DATETIME NULL;

-- Update stream_templates juga
ALTER TABLE stream_templates ADD COLUMN youtube_enable_monetization BOOLEAN DEFAULT FALSE;
ALTER TABLE stream_templates ADD COLUMN youtube_ad_type VARCHAR(20) DEFAULT 'concurrent';
ALTER TABLE stream_templates ADD COLUMN youtube_ad_interval INTEGER DEFAULT 10;
ALTER TABLE stream_templates ADD COLUMN youtube_pause_ads_until DATETIME NULL;
```

### **Step 4: Update YouTube Service**

Enhance `services/youtubeService.js`:

```javascript
async function scheduleLive(tokensOrUserId, { 
  title, description, privacyStatus, scheduledStartTime, 
  streamId: existingStreamId, streamKey: manualStreamKey, 
  enableAutoStart = false, enableAutoStop = false, 
  tags = null, category = null, language = null, thumbnailPath = null,
  // ✅ NEW: Monetization parameters
  enableMonetization = false, adType = 'concurrent', adInterval = 10, pauseAdsUntil = null
}) {
  const yt = await getYouTubeClientFromTokensOrUserId(tokensOrUserId);
  
  // ... existing code ...
  
  // Build broadcast request body
  const requestBody = {
    snippet,
    status: {
      privacyStatus: privacyStatus || 'private',
    },
    contentDetails: {
      enableAutoStart: !!enableAutoStart,
      enableAutoStop: !!enableAutoStop,
    }
  };
  
  // ✅ ADD: Monetization details if enabled
  if (enableMonetization) {
    requestBody.monetizationDetails = {
      cuepointSchedule: {
        enabled: true,
        type: adType, // 'concurrent' or 'nonConcurrent'
        repeatIntervalSecs: adInterval * 60, // Convert minutes to seconds
      }
    };
    
    // Add pause ads until if specified
    if (pauseAdsUntil) {
      requestBody.monetizationDetails.cuepointSchedule.pauseAdsUntil = pauseAdsUntil;
    }
    
    console.log(`[YouTubeService.scheduleLive] ✅ Monetization enabled: ${adType}, interval: ${adInterval}m`);
  }
  
  // ✅ UPDATE: Include monetizationDetails in part parameter
  const broadcastRes = await yt.liveBroadcasts.insert({
    part: enableMonetization 
      ? 'snippet,status,contentDetails,monetizationDetails' 
      : 'snippet,status,contentDetails',
    requestBody
  });
  
  // ... rest of existing code ...
}
```

### **Step 5: Update Stream Creation Call**

Update call di `app.js`:

```javascript
// Create broadcast via YouTube API
const broadcastResult = await youtubeService.scheduleLive(tokens, {
  title: req.body.streamTitle,
  description: streamData.youtube_description || '',
  privacyStatus: streamData.youtube_privacy || 'unlisted',
  scheduledStartTime: scheduledStartTime,
  streamId: youtubeStreamId,
  streamKey: hasManualStreamKey ? req.body.streamKey.trim() : null,
  enableAutoStart: streamData.youtube_auto_start || false,
  enableAutoStop: streamData.youtube_auto_end || false,
  tags: tags,
  category: streamData.youtube_category_id || null,
  language: streamData.youtube_language || null,
  thumbnailPath: thumbnailPath,
  // ✅ NEW: Monetization parameters
  enableMonetization: streamData.youtube_enable_monetization || false,
  adType: streamData.youtube_ad_type || 'concurrent',
  adInterval: streamData.youtube_ad_interval || 10,
  pauseAdsUntil: streamData.youtube_pause_ads_until || null
});
```

## ⚠️ **Persyaratan Monetization**

### **Channel Requirements**:
1. ✅ **YouTube Partner Program**: Channel harus eligible
2. ✅ **1,000+ Subscribers**: Minimum subscriber requirement
3. ✅ **4,000+ Watch Hours**: Dalam 12 bulan terakhir
4. ✅ **AdSense Account**: Linked dan approved
5. ✅ **Community Guidelines**: No strikes

### **Live Stream Requirements**:
1. ✅ **Mobile Verification**: Channel verified
2. ✅ **No Live Streaming Restrictions**: Dalam 90 hari terakhir
3. ✅ **Content Guidelines**: Advertiser-friendly content

## 🧪 **Testing Monetization**

### **Test Script**:

```javascript
// test-youtube-monetization.js
async function testMonetization() {
  console.log('🧪 Testing YouTube Monetization API...\n');
  
  const testParams = {
    title: 'Monetization Test Stream',
    description: 'Testing monetization via YouTube API',
    privacyStatus: 'private',
    scheduledStartTime: new Date(Date.now() + 300000).toISOString(),
    enableMonetization: true,
    adType: 'concurrent',
    adInterval: 5, // 5 minutes
    pauseAdsUntil: null
  };
  
  try {
    const result = await youtubeService.scheduleLive(tokens, testParams);
    
    console.log('📊 MONETIZATION TEST RESULTS:');
    console.log(`✅ Broadcast ID: ${result.broadcast?.id}`);
    console.log(`✅ Monetization: ${result.broadcast?.monetizationDetails ? 'ENABLED' : 'DISABLED'}`);
    
    if (result.broadcast?.monetizationDetails) {
      const monetization = result.broadcast.monetizationDetails;
      console.log(`✅ Ad Type: ${monetization.cuepointSchedule?.type}`);
      console.log(`✅ Ad Interval: ${monetization.cuepointSchedule?.repeatIntervalSecs / 60}m`);
      console.log(`✅ Ads Enabled: ${monetization.cuepointSchedule?.enabled}`);
    }
    
  } catch (error) {
    console.error('❌ Monetization test failed:', error.message);
    
    if (error.message.includes('monetization')) {
      console.log('💡 Possible reasons:');
      console.log('   - Channel not eligible for YouTube Partner Program');
      console.log('   - AdSense not linked or approved');
      console.log('   - Insufficient subscribers/watch hours');
    }
  }
}
```

## 🎯 **Kesimpulan**

### **✅ Monetization Masih Bisa Diatur via API**:
1. **API Support**: `monetizationDetails` masih tersedia di YouTube API
2. **Fine-grained Control**: Ad scheduling, type, interval bisa diatur
3. **Integration Ready**: Bisa diintegrasikan ke StreamBro

### **📋 Implementation Checklist**:
- [ ] Add monetization fields to frontend form
- [ ] Update database schema
- [ ] Enhance YouTube service with monetization support
- [ ] Add monetization parameters to stream creation
- [ ] Test with eligible YouTube channel

### **⚠️ Catatan Penting**:
- **Channel Eligibility**: Harus memenuhi YouTube Partner Program requirements
- **Content Guidelines**: Stream harus advertiser-friendly
- **API Permissions**: Mungkin perlu scope tambahan untuk monetization

**Jadi ya, monetization masih bisa di-enable via YouTube API** - tinggal implementasi saja! 🎉