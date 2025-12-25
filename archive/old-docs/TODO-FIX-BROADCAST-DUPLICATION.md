# TODO: Fix Broadcast Duplication Issue

## Problem
Ketika stream dijadwalkan dan live, sistem membuat broadcast BARU lagi (tanpa thumbnail) padahal sudah ada broadcast yang dijadwalkan dengan thumbnail.

**Hasil:** Duplikasi broadcast di YouTube Studio

## Root Cause
File: `services/streamingService.js` line 490-527

Fallback logic membuat broadcast baru jika:
1. `active_schedule_id` NULL, ATAU
2. Schedule tidak punya `youtube_broadcast_id`, ATAU  
3. Broadcast ID tidak valid

## Solution Options

### Option 1: Strict Mode (Recommended)
**Jangan buat broadcast baru jika schedule tidak punya broadcast_id**
- Jika schedule.youtube_broadcast_id NULL → ERROR, jangan start stream
- Paksa user untuk create broadcast dulu via scheduler

**Pros:**
- Tidak ada duplikasi
- Lebih predictable
- Thumbnail selalu ada

**Cons:**
- Stream tidak start jika broadcast belum dibuat
- Perlu monitoring scheduler

### Option 2: Smart Fallback
**Cek dulu apakah ada broadcast yang sudah dibuat untuk stream ini**
- Query YouTube API untuk cari broadcast dengan title yang sama
- Jika ada, gunakan broadcast tersebut
- Jika tidak ada, baru buat baru

**Pros:**
- Lebih flexible
- Auto-recovery jika broadcast_id hilang

**Cons:**
- Lebih complex
- API call tambahan

### Option 3: Pre-create Broadcasts
**Scheduler membuat broadcast SEBELUM waktu start**
- Saat schedule dibuat, langsung create broadcast
- Save broadcast_id ke database
- Saat waktu start, tinggal bind & transition

**Pros:**
- Broadcast sudah siap dengan thumbnail
- Tidak ada fallback needed
- Paling reliable

**Cons:**
- Perlu refactor scheduler
- Broadcast dibuat jauh sebelum stream

## Recommended Fix (Option 3)

### Step 1: Update Scheduler
File: `services/schedulerService.js`

Saat schedule dibuat (recurring), create broadcast untuk hari ini:
```javascript
// Setelah schedule dibuat, create broadcast untuk today
if (schedule.is_recurring) {
  const todayBroadcast = await createBroadcastForSchedule(schedule);
  await StreamSchedule.update(schedule.id, {
    youtube_broadcast_id: todayBroadcast.id
  });
}
```

### Step 2: Remove Fallback
File: `services/streamingService.js` line 524

Hapus atau disable fallback:
```javascript
} else {
  // REMOVED: Fallback create new broadcast
  // Instead, throw error
  throw new Error(`Schedule ${stream.active_schedule_id} has no broadcast ID. Cannot start stream.`);
}
```

### Step 3: Add Broadcast Cleanup
Setelah stream selesai, cleanup broadcast atau mark as completed.

## Testing Plan
1. Create schedule dengan YouTube API
2. Verify broadcast dibuat dengan thumbnail
3. Wait for scheduler to start stream
4. Verify NO duplicate broadcast
5. Check thumbnail masih ada

## Priority
**HIGH** - Menyebabkan duplikasi broadcast dan thumbnail hilang

## Estimated Time
2-3 hours untuk implement Option 3

---
Created: 2025-12-24
Status: TODO
Assigned: -
