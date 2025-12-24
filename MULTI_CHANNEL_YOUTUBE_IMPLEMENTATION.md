# Multi-Channel YouTube Support Implementation

## Problem Analysis
StreamBro currently supports only 1 YouTube OAuth connection per user due to:
- `youtube_tokens` table using `user_id` as PRIMARY KEY
- OAuth flow designed for single channel per user
- UI assumes one YouTube connection per user

## Solution Overview
Implement multi-channel support by:
1. **Database Schema Changes**: Allow multiple YouTube channels per user
2. **OAuth Flow Enhancement**: Support channel selection during connection
3. **UI Updates**: Channel selector in stream creation
4. **Token Management**: Handle multiple channels per user

## Implementation Plan

### Phase 1: Database Schema Migration
```sql
-- Create new multi-channel tokens table
CREATE TABLE youtube_channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT,
  channel_avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expiry_date INTEGER,
  is_default BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, channel_id)
);

-- Migrate existing tokens
INSERT INTO youtube_channels (id, user_id, channel_id, access_token, refresh_token, expiry_date, is_default)
SELECT 
  user_id || '_default' as id,
  user_id,
  'unknown_' || user_id as channel_id,
  access_token,
  refresh_token,
  expiry_date,
  1 as is_default
FROM youtube_tokens;
```

### Phase 2: Enhanced OAuth Flow
- Add channel selection step after OAuth
- Store channel info during token exchange
- Support multiple channel connections per user

### Phase 3: UI Enhancements
- Channel selector dropdown in stream modal
- Channel management in user settings
- Visual indicators for multiple channels

### Phase 4: Token Manager Updates
- Support channel-specific token retrieval
- Handle multi-channel refresh logic
- Maintain backward compatibility

## Benefits
- ✅ Multiple YouTube channels per user
- ✅ Different stream keys per channel
- ✅ Channel-specific settings and permissions
- ✅ Backward compatibility with existing single-channel users
- ✅ Improved workflow for multi-channel creators

## Migration Strategy
1. **Backward Compatible**: Existing users continue working
2. **Gradual Migration**: Users can add additional channels over time
3. **Default Channel**: First/existing channel becomes default
4. **Seamless UX**: No disruption to current workflows