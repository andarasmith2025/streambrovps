# Analisis Multi Schedule YouTube API Workflow

## 🎯 Skenario: Multi Jadwal dalam 1 Stream Key

### Contoh Kasus:
- **Stream Key**: `abc123-xyz789` (sama untuk semua jadwal)
- **Jadwal A**: 06:00 - 11:00 (5 jam)
- **Jadwal B**: 18:00 - 23:00 (5 jam)
- **Mode**: YouTube API (bukan manual RTMP)

## 📊 Workflow Analysis

### 1. **Persiapan Schedule (User membuat jadwal)**

```javascript
// User membuat 2 jadwal untuk 1 stream
Stream ID: 123
├── Schedule A: 06:00-11:00 (duration: 300 minutes)
├── Schedule B: 18:00-23:00 (duration: 300 minutes)
└── Stream Key: Sama untuk kedua jadwal
```

**Status Awal**:
- Stream status: `scheduled`
- Active schedule: `null`
- YouTube broadcast: `null`

### 2. **Jadwal A Dimulai (06:00 AM)**

#### Scheduler Service (`checkScheduledStreams()`)
```javascript
// schedulerService.js - line 60-150
1. Cek waktu sekarang: 06:00
2. Temukan Schedule A yang match
3. Set active_schedule_id = Schedule A ID
4. Panggil streamingService.startStream(streamId)
```

#### Streaming Service (`startStream()`)
```javascript
// streamingService.js - line 490-530
1. Cek stream.active_schedule_id (ada Schedule A)
2. Ambil broadcast_id dari schedule (jika ada)
3. Jika tidak ada broadcast_id:
   - Buat broadcast baru via YouTube API
   - Bind ke stream key yang ada
4. Start FFmpeg
5. Update status = 'live'
```

**Status Setelah Start**:
- Stream status: `live`
- Active schedule: `Schedule A ID`
- YouTube broadcast: `broadcast_123_A`
- FFmpeg: Running

### 3. **Jadwal A Berakhir (11:00 AM) - CRITICAL POINT**

#### Duration Check (`checkStreamDurations()`)
```javascript
// schedulerService.js - line 200-250
1. Cek stream yang live
2. Hitung: start_time + duration = end_time
3. Jika now >= end_time:
   - Panggil streamingService.stopStream(streamId)
```

#### Stop Stream Process
```javascript
// streamingService.js - line 833-1100
1. Kill FFmpeg (SIGTERM)
2. Transition YouTube broadcast ke 'complete'
3. Clear youtube_broadcast_id dari stream
4. Clear active_schedule_id = null
5. Cek upcoming schedules hari ini
6. Set status = 'scheduled' (karena ada Schedule B)
```

**Status Setelah Stop**:
- Stream status: `scheduled` ✅
- Active schedule: `null` ✅
- YouTube broadcast: `null` (completed)
- FFmpeg: Stopped ✅

### 4. **Antara Jadwal (11:00 - 18:00)**

**Expected Status**:
- Stream status: `scheduled`
- Active schedule: `null`
- Checklist: Kosong atau show "Schedule B upcoming"

### 5. **Jadwal B Dimulai (18:00 PM)**

#### Scheduler Service
```javascript
1. Cek waktu sekarang: 18:00
2. Temukan Schedule B yang match
3. Set active_schedule_id = Schedule B ID
4. Panggil streamingService.startStream(streamId)
```

#### Streaming Service
```javascript
1. Cek stream.active_schedule_id (ada Schedule B)
2. Schedule B tidak punya broadcast_id (karena baru)
3. Buat broadcast BARU via YouTube API
4. Bind ke stream key yang SAMA
5. Start FFmpeg
6. Update status = 'live'
```

**Status Setelah Start**:
- Stream status: `live`
- Active schedule: `Schedule B ID`
- YouTube broadcast: `broadcast_123_B` (BARU)
- FFmpeg: Running

## 🚨 Masalah yang Teridentifikasi

### **Problem 1: YouTube Broadcast Tidak Stop**
**Gejala**: "di youtube studio streaming A tidak benar2 stop masih ada dan jalan"

**Root Cause Analysis**:
```javascript
// streamingService.js - line 924-970
if (stream.use_youtube_api && stream.youtube_broadcast_id) {
  try {
    await youtubeService.transition(tokens, {
      broadcastId: stream.youtube_broadcast_id,
      status: 'complete'
    });
  } catch (ytError) {
    console.error('❌ Error transitioning YouTube broadcast to complete:', ytError);
    // ⚠️ MASALAH: Error tidak di-handle dengan baik
  }
}
```

**Kemungkinan Penyebab**:
1. **Token Expired**: Token YouTube expired saat transition
2. **API Rate Limit**: YouTube API rate limit exceeded
3. **Broadcast State**: Broadcast sudah dalam state yang tidak bisa di-complete
4. **Network Error**: Koneksi gagal ke YouTube API

**Impact**:
- YouTube Studio masih show "Live" 
- Tidak ada VOD yang terbuat
- Schedule B tidak bisa start (conflict)

### **Problem 2: Status Frontend Salah**
**Gejala**: "status masih streaming"

**Root Cause**:
```javascript
// streamingService.js - line 1050-1080
const newStatus = hasUpcomingScheduleToday ? 'scheduled' : 'offline';
await Stream.updateStatus(streamId, newStatus, stream.user_id);
```

**Kemungkinan Masalah**:
1. `hasUpcomingScheduleToday` logic salah
2. Database update gagal
3. Frontend tidak refresh status

### **Problem 3: Checklist Salah**
**Gejala**: "checklist di jadwal B" (saat Schedule A masih running)

**Root Cause**:
```javascript
// dashboard.ejs - line 1223-1230
function isScheduleActive(stream, schedule) {
  if (stream.status === 'live' && stream.active_schedule_id) {
    return stream.active_schedule_id === schedule.id;
  }
}
```

**Kemungkinan Masalah**:
1. `active_schedule_id` tidak di-set dengan benar
2. Frontend logic salah
3. Database tidak sync

## 🔧 Solusi yang Direkomendasikan

### **Fix 1: Enhanced YouTube Broadcast Transition**

```javascript
// services/streamingService.js - Enhanced stopStream()
if (stream.use_youtube_api && stream.youtube_broadcast_id) {
  console.log(`[StreamingService] 🎬 Stopping YouTube broadcast ${stream.youtube_broadcast_id}...`);
  
  try {
    // Step 1: Get fresh tokens
    const tokens = await getTokensForUser(stream.user_id);
    if (!tokens || !tokens.access_token) {
      throw new Error('No valid YouTube tokens available');
    }
    
    // Step 2: Check broadcast status first
    const broadcast = await youtubeService.getBroadcast(tokens, { 
      broadcastId: stream.youtube_broadcast_id 
    });
    
    if (!broadcast) {
      console.log(`[StreamingService] ⚠️ Broadcast ${stream.youtube_broadcast_id} not found, may already be deleted`);
    } else {
      const currentStatus = broadcast.status?.lifeCycleStatus;
      console.log(`[StreamingService] Current broadcast status: ${currentStatus}`);
      
      // Step 3: Transition based on current status
      if (currentStatus === 'live' || currentStatus === 'testing') {
        await youtubeService.transition(tokens, {
          broadcastId: stream.youtube_broadcast_id,
          status: 'complete'
        });
        console.log(`[StreamingService] ✅ Broadcast transitioned from ${currentStatus} to complete`);
      } else if (currentStatus === 'ready') {
        // If broadcast never went live, delete it instead
        await youtubeService.deleteBroadcast(tokens, { 
          broadcastId: stream.youtube_broadcast_id 
        });
        console.log(`[StreamingService] ✅ Unused broadcast deleted`);
      } else {
        console.log(`[StreamingService] ℹ️ Broadcast already in final state: ${currentStatus}`);
      }
    }
    
  } catch (ytError) {
    console.error(`[StreamingService] ❌ YouTube transition failed: ${ytError.message}`);
    
    // Fallback: Try to delete broadcast
    try {
      await youtubeService.deleteBroadcast(tokens, { 
        broadcastId: stream.youtube_broadcast_id 
      });
      console.log(`[StreamingService] ✅ Fallback: Broadcast deleted`);
    } catch (deleteError) {
      console.error(`[StreamingService] ❌ Fallback delete also failed: ${deleteError.message}`);
      console.error(`[StreamingService] ⚠️ MANUAL ACTION REQUIRED: Check YouTube Studio for stuck broadcast`);
    }
  }
  
  // Always clear broadcast_id from database
  await Stream.update(streamId, { 
    youtube_broadcast_id: null,
    youtube_stream_id: null 
  });
}
```

### **Fix 2: Enhanced Status Management**

```javascript
// services/streamingService.js - Enhanced status logic
async function updateStreamStatusAfterStop(streamId, stream) {
  console.log(`[StreamingService] 📊 Determining new status for stream ${streamId}...`);
  
  try {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Get all pending schedules for this stream
    const upcomingSchedules = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM stream_schedules 
         WHERE stream_id = ? 
         AND status = 'pending'
         ORDER BY schedule_time ASC`,
        [streamId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    
    console.log(`[StreamingService] Found ${upcomingSchedules.length} pending schedules`);
    
    let hasUpcomingToday = false;
    let nextScheduleInfo = null;
    
    for (const schedule of upcomingSchedules) {
      let scheduleTimeMinutes = null;
      let isToday = false;
      
      if (schedule.is_recurring && schedule.recurring_days) {
        const allowedDays = schedule.recurring_days.split(',').map(d => parseInt(d));
        if (allowedDays.includes(currentDay)) {
          isToday = true;
          // Parse time from schedule
          const timeMatch = schedule.schedule_time.match(/(\d{1,2}):(\d{2})/);
          if (timeMatch) {
            scheduleTimeMinutes = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
          }
        }
      } else {
        // One-time schedule
        const scheduleDate = new Date(schedule.schedule_time);
        if (scheduleDate.toDateString() === now.toDateString()) {
          isToday = true;
          scheduleTimeMinutes = scheduleDate.getHours() * 60 + scheduleDate.getMinutes();
        }
      }
      
      if (isToday && scheduleTimeMinutes > currentTimeMinutes) {
        hasUpcomingToday = true;
        nextScheduleInfo = {
          id: schedule.id,
          time: scheduleTimeMinutes,
          timeString: `${Math.floor(scheduleTimeMinutes/60)}:${(scheduleTimeMinutes%60).toString().padStart(2,'0')}`
        };
        console.log(`[StreamingService] ✓ Next schedule today: ${nextScheduleInfo.timeString} (Schedule ${schedule.id})`);
        break;
      }
    }
    
    const newStatus = hasUpcomingToday ? 'scheduled' : 'offline';
    await Stream.updateStatus(streamId, newStatus, stream.user_id);
    
    console.log(`[StreamingService] ✅ Status updated to '${newStatus}' (upcoming today: ${hasUpcomingToday})`);
    if (nextScheduleInfo) {
      console.log(`[StreamingService] ℹ️ Next schedule at ${nextScheduleInfo.timeString}`);
    }
    
    return { status: newStatus, nextSchedule: nextScheduleInfo };
    
  } catch (error) {
    console.error(`[StreamingService] ❌ Error updating status:`, error);
    // Fallback to offline
    await Stream.updateStatus(streamId, 'offline', stream.user_id);
    return { status: 'offline', nextSchedule: null };
  }
}
```

### **Fix 3: Enhanced Frontend Status Display**

```javascript
// views/dashboard.ejs - Enhanced checklist logic
function getActiveScheduleInfo(stream) {
  if (stream.status !== 'live' || !stream.active_schedule_id) {
    return null;
  }
  
  // Find the active schedule
  const activeSchedule = stream.schedules?.find(s => s.id === stream.active_schedule_id);
  if (!activeSchedule) {
    console.warn(`Active schedule ${stream.active_schedule_id} not found in schedules`);
    return null;
  }
  
  return {
    id: activeSchedule.id,
    startTime: parseScheduleTime(activeSchedule.schedule_time),
    duration: activeSchedule.duration,
    isRecurring: activeSchedule.is_recurring
  };
}

function updateStreamStatusDisplay(stream) {
  const statusElement = document.getElementById(`status-${stream.id}`);
  const checklistElement = document.getElementById(`checklist-${stream.id}`);
  
  if (stream.status === 'live') {
    const activeInfo = getActiveScheduleInfo(stream);
    if (activeInfo) {
      statusElement.innerHTML = `
        <span class="bg-red-500 text-white px-2 py-1 rounded text-xs">
          🔴 LIVE - Schedule ${activeInfo.id}
        </span>
      `;
      
      // Show checklist for active schedule only
      showScheduleChecklist(checklistElement, activeInfo);
    } else {
      statusElement.innerHTML = `
        <span class="bg-red-500 text-white px-2 py-1 rounded text-xs">
          🔴 LIVE - Manual
        </span>
      `;
      checklistElement.innerHTML = '';
    }
  } else if (stream.status === 'scheduled') {
    statusElement.innerHTML = `
      <span class="bg-blue-500 text-white px-2 py-1 rounded text-xs">
        📅 SCHEDULED
      </span>
    `;
    checklistElement.innerHTML = ''; // No checklist when not live
  } else {
    statusElement.innerHTML = `
      <span class="bg-gray-500 text-white px-2 py-1 rounded text-xs">
        ⚫ OFFLINE
      </span>
    `;
    checklistElement.innerHTML = '';
  }
}
```

### **Fix 4: Manual Cleanup Endpoint**

```javascript
// app.js - Add manual cleanup endpoint
app.post('/api/streams/:id/cleanup-youtube', isAuthenticated, async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    if (stream.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (!stream.youtube_broadcast_id) {
      return res.json({ success: true, message: 'No broadcast to cleanup' });
    }
    
    const { getTokensForUser } = require('./routes/youtube');
    const youtubeService = require('./services/youtubeService');
    
    const tokens = await getTokensForUser(stream.user_id);
    if (!tokens) {
      return res.status(400).json({ error: 'YouTube not configured' });
    }
    
    // Try to complete broadcast
    try {
      await youtubeService.transition(tokens, {
        broadcastId: stream.youtube_broadcast_id,
        status: 'complete'
      });
      console.log(`[Manual Cleanup] Broadcast ${stream.youtube_broadcast_id} completed`);
    } catch (transitionError) {
      // If complete fails, try delete
      try {
        await youtubeService.deleteBroadcast(tokens, { 
          broadcastId: stream.youtube_broadcast_id 
        });
        console.log(`[Manual Cleanup] Broadcast ${stream.youtube_broadcast_id} deleted`);
      } catch (deleteError) {
        console.error(`[Manual Cleanup] Both complete and delete failed:`, deleteError);
        return res.status(500).json({ 
          error: 'Failed to cleanup broadcast',
          details: deleteError.message 
        });
      }
    }
    
    // Clear from database
    await Stream.update(stream.id, {
      youtube_broadcast_id: null,
      youtube_stream_id: null
    });
    
    res.json({ 
      success: true, 
      message: 'YouTube broadcast cleaned up successfully' 
    });
    
  } catch (error) {
    console.error('[Manual Cleanup] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## 🧪 Testing Plan

### **Test Case 1: Normal Multi-Schedule Flow**
```bash
1. Buat stream dengan 2 jadwal (5 menit interval untuk testing)
2. Tunggu Schedule A start otomatis
3. Verify: Status = 'live', active_schedule_id = Schedule A
4. Tunggu Schedule A berakhir
5. Verify: 
   - YouTube broadcast completed
   - Status = 'scheduled' 
   - active_schedule_id = null
6. Tunggu Schedule B start
7. Verify: Status = 'live', active_schedule_id = Schedule B, broadcast BARU
```

### **Test Case 2: YouTube API Failure Recovery**
```bash
1. Start Schedule A
2. Invalidate YouTube token (simulate expired)
3. Tunggu Schedule A berakhir
4. Verify: Error logged, fallback cleanup executed, status tetap update
```

### **Test Case 3: Manual Cleanup**
```bash
1. Start stream dengan YouTube API
2. Simulate stuck broadcast (kill FFmpeg manually)
3. Call POST /api/streams/:id/cleanup-youtube
4. Verify: Broadcast cleaned up, database cleared
```

## 📋 Monitoring & Debugging

### **Enhanced Logging**
```javascript
console.log('[StreamingService] ========== MULTI-SCHEDULE DEBUG ==========');
console.log('[StreamingService] Stream ID:', streamId);
console.log('[StreamingService] Current Status:', stream.status);
console.log('[StreamingService] Active Schedule:', stream.active_schedule_id);
console.log('[StreamingService] YouTube Broadcast:', stream.youtube_broadcast_id);
console.log('[StreamingService] Use YouTube API:', stream.use_youtube_api);
console.log('[StreamingService] ===============================================');
```

### **Dashboard Indicators**
- Show active schedule ID in status badge
- Add "Next Schedule" indicator when status = 'scheduled'
- Add manual cleanup button for stuck broadcasts

## 🎯 Expected Results After Fixes

### **Scenario: 2 Jadwal dalam 1 Hari**

**06:00 - Schedule A Start**:
- ✅ Status: `live`
- ✅ Active Schedule: `Schedule A ID`
- ✅ YouTube: Broadcast A created & live
- ✅ Checklist: Show Schedule A progress

**11:00 - Schedule A End**:
- ✅ Status: `scheduled` (karena ada Schedule B)
- ✅ Active Schedule: `null`
- ✅ YouTube: Broadcast A completed/deleted
- ✅ Checklist: Empty atau show "Next: Schedule B at 18:00"

**18:00 - Schedule B Start**:
- ✅ Status: `live`
- ✅ Active Schedule: `Schedule B ID`
- ✅ YouTube: Broadcast B created & live (BARU)
- ✅ Checklist: Show Schedule B progress

**23:00 - Schedule B End**:
- ✅ Status: `offline` (tidak ada schedule lagi hari ini)
- ✅ Active Schedule: `null`
- ✅ YouTube: Broadcast B completed/deleted
- ✅ Checklist: Empty

Dengan implementasi fixes ini, multi-schedule workflow dengan YouTube API akan berjalan dengan lancar dan reliable.