# YouTube API Manual Stream Key Fix

## Problem Statement

Saat user menggunakan YouTube API mode dengan manual stream key input, sistem masih membuat broadcast baru dan stream key baru, yang menyebabkan:
- Broadcast duplikat tanpa thumbnail
- Stream key yang diinput manual tidak digunakan
- Broadcast yang sudah disiapkan user di YouTube Studio tidak terpakai

## Current Behavior (WRONG)

**YouTube API + Manual Stream Key:**
1. User input stream key manual: `abcd-1234-efgh-5678`
2. StreamBro buat broadcast baru via API
3. StreamBro buat stream key baru (karena tidak ada streamId)
4. StreamBro bind broadcast baru ke stream key baru
5. Stream key manual yang diinput user diabaikan

## Expected Behavior (CORRECT)

**YouTube API + Manual Stream Key:**
1. User input stream key manual: `abcd-1234-efgh-5678`
2. StreamBro buat broadcast baru via API
3. StreamBro cari stream ID yang match dengan stream key tersebut
4. StreamBro bind broadcast baru ke stream ID yang sudah ada
5. StreamBro TIDAK buat stream key baru

## User Stories

### Story 1: Manual Stream Key Binding
**As a** user who has prepared stream keys in YouTube Studio  
**I want** to input the stream key in YouTube API mode  
**So that** StreamBro creates a new broadcast but uses my existing stream key

**Acceptance Criteria:**
- When I input a manual stream key in YouTube API mode
- StreamBro should create a new broadcast via API
- StreamBro should find the existing stream ID that matches this stream key
- StreamBro should bind the new broadcast to the existing stream ID
- StreamBro should NOT create a new stream key
- The new broadcast should use the stream key I provided

### Story 2: Stream Key Validation
**As a** user inputting a manual stream key  
**I want** to know if the stream key is valid and which broadcast it belongs to  
**So that** I can confirm I'm using the right stream key

**Acceptance Criteria:**
- When I input a stream key, system should validate it exists
- System should show which broadcast this stream key belongs to
- System should show broadcast title, thumbnail, and status
- If stream key is invalid, show clear error message

### Story 3: Fallback Behavior
**As a** user when my manual stream key doesn't match any existing broadcast  
**I want** the system to handle this gracefully  
**So that** I can still create a stream

**Acceptance Criteria:**
- If manual stream key doesn't match any existing broadcast
- System should show warning message
- System should offer to create new broadcast with this stream key
- User should be able to choose: create new or use different stream key

## Technical Requirements

### 1. Stream Key to Stream ID Lookup Function
```javascript
async function findStreamIdByStreamKey(tokens, streamKey) {
  // 1. List all user's streams
  // 2. Find stream with matching streamName (stream key)
  // 3. Return stream ID or null
}
```

### 2. Modified scheduleLive Function
```javascript
// When streamKey is provided manually:
if (manualStreamKey && !existingStreamId) {
  // Find existing stream ID by stream key
  const foundStreamId = await findStreamIdByStreamKey(tokens, manualStreamKey);
  
  if (foundStreamId) {
    // Use existing stream ID, create new broadcast
    existingStreamId = foundStreamId;
  } else {
    // Stream key not found, show error
    throw new Error('Stream key not found in your channel');
  }
}

// Continue with normal broadcast creation using existingStreamId
```

### 3. UI Changes
- Add validation indicator next to stream key input
- Show broadcast preview when valid stream key is entered
- Add confirmation dialog when binding to existing broadcast

## Implementation Plan

### Phase 1: Backend Logic
1. Create `findBroadcastByStreamKey` function
2. Modify `scheduleLive` to handle manual stream key lookup
3. Add stream key validation endpoint

### Phase 2: Frontend Integration  
1. Add real-time stream key validation
2. Show broadcast preview for valid stream keys
3. Add confirmation UI for existing broadcast binding

### Phase 3: Error Handling
1. Handle invalid stream keys gracefully
2. Provide clear error messages
3. Offer fallback options

## Success Criteria

1. **No more duplicate broadcasts** when using manual stream key
2. **Existing broadcasts are reused** when stream key matches
3. **Clear validation feedback** for stream key input
4. **Graceful error handling** for invalid stream keys
5. **User can choose** between reusing existing or creating new broadcast

## Testing Scenarios

1. **Valid Manual Stream Key**: Input stream key that exists → Should bind to existing broadcast
2. **Invalid Manual Stream Key**: Input non-existent stream key → Should show error
3. **Load from Dropdown**: Select from dropdown → Should work as before
4. **Empty Stream Key**: No stream key provided → Should create new stream as before
5. **Mixed Mode**: Switch between manual and dropdown → Should work correctly

## Notes

- This fix addresses the core issue causing broadcast duplication
- Maintains backward compatibility with existing "Load" dropdown functionality
- Provides better user experience with validation and preview
- Reduces API calls by reusing existing broadcasts