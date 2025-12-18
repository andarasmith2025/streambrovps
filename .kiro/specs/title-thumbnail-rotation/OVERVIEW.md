# Title & Thumbnail Rotation Feature - Overview

## 🎯 Purpose

Enable content creators to perform A/B testing on their YouTube live streams by automatically or manually rotating between multiple title and thumbnail variants, tracking performance metrics, and identifying the most effective combinations for maximizing viewer engagement.

## 🎨 Key Features

### 1. **Variant Management**
- Create 2-5 title and thumbnail combinations per stream
- Upload custom thumbnails (16:9 ratio, max 2MB)
- Edit, reorder, and delete variants
- Preview all variants before going live

### 2. **Automatic Rotation**
- Set rotation intervals (5min, 15min, 30min, 1hr, 2hr)
- Automatic cycling through variants
- Seamless YouTube API integration
- Error handling and retry logic

### 3. **Manual Control**
- Quick-switch dropdown on stream cards
- Override automatic rotation anytime
- Real-time variant switching
- Reset rotation timer on manual switch

### 4. **Performance Tracking**
- Views gained per variant
- Active time per variant
- Views per minute calculation
- Aggregate data across multiple streams

### 5. **Analytics Dashboard**
- Visual comparison charts
- Best performer highlighting
- Timeline of variant switches
- Export data to CSV

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
├─────────────────────────────────────────────────────────────┤
│  Stream Modal  │  Stream Card  │  Analytics Dashboard       │
│  - Variant UI  │  - Switcher   │  - Charts & Metrics        │
└────────┬────────────────┬────────────────┬──────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│  Rotation Service  │  Metrics Service  │  YouTube API       │
│  - Auto rotation   │  - Track views    │  - Update title    │
│  - Manual switch   │  - Calculate avg  │  - Update thumb    │
│  - Schedule mgmt   │  - Aggregate data │  - Error handling  │
└────────┬────────────────┬────────────────┬──────────────────┘
         │                │                │
         ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                         Database                             │
├─────────────────────────────────────────────────────────────┤
│  stream_variants   │  variant_rotations  │  streams         │
│  - variant data    │  - rotation history │  - stream config │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Database Schema

### `stream_variants` Table
```sql
- id (TEXT, PRIMARY KEY)
- stream_id (TEXT, FOREIGN KEY)
- variant_number (INTEGER)
- title (TEXT)
- thumbnail_path (TEXT)
- is_active (BOOLEAN)
- views_count (INTEGER)
- engagement_score (REAL)
- created_at (DATETIME)
```

### `variant_rotations` Table
```sql
- id (TEXT, PRIMARY KEY)
- stream_id (TEXT, FOREIGN KEY)
- variant_id (TEXT, FOREIGN KEY)
- started_at (DATETIME)
- ended_at (DATETIME)
- views_gained (INTEGER)
- avg_watch_time (REAL)
- is_manual (BOOLEAN)
```

### `streams` Table (New Fields)
```sql
- rotation_enabled (BOOLEAN)
- rotation_interval (INTEGER) -- in minutes
- current_variant_id (TEXT)
- last_rotation_at (DATETIME)
```

## 🔄 Rotation Flow

### Automatic Rotation
```
1. Stream starts → Activate Variant 1
2. Timer starts (e.g., 30 minutes)
3. Timer expires → Switch to Variant 2
   ├─ Update YouTube title via API
   ├─ Update YouTube thumbnail via API
   ├─ Record rotation in database
   └─ Restart timer
4. Repeat for all variants
5. After last variant → Loop back to Variant 1
```

### Manual Rotation
```
1. User clicks variant switcher
2. Select new variant from dropdown
3. Immediate API call to YouTube
   ├─ Update title
   ├─ Update thumbnail
   └─ Record manual rotation
4. Reset automatic rotation timer (if enabled)
5. Continue with new variant
```

## 🎯 Use Cases

### Use Case 1: A/B Testing for New Content
**Scenario:** Creator wants to test which title attracts more viewers

**Flow:**
1. Create stream with 3 title variants
2. Enable 30-minute auto rotation
3. Stream for 3 hours (6 rotations)
4. Review analytics to see which title got most views
5. Use winning title for future streams

### Use Case 2: Real-time Optimization
**Scenario:** Creator notices low engagement and wants to try different approach

**Flow:**
1. Stream is live with current title/thumbnail
2. Creator checks real-time metrics
3. Manually switches to variant with better past performance
4. Monitors if views increase
5. Keeps best performing variant active

### Use Case 3: Long-term Testing
**Scenario:** Creator wants to build data over multiple streams

**Flow:**
1. Create standard set of 5 variants
2. Use same variants across 10 streams
3. System aggregates performance data
4. Analytics show clear winner after sufficient data
5. Creator adopts winning combination as default

## 🚀 Implementation Phases

### Phase 1: Core Functionality (MVP)
- ✅ Database schema
- ✅ Variant CRUD operations
- ✅ Basic UI in stream modal
- ✅ Manual rotation
- ✅ YouTube API integration

### Phase 2: Automation
- ✅ Automatic rotation service
- ✅ Interval scheduling
- ✅ Error handling & retry logic
- ✅ Rotation history tracking

### Phase 3: Analytics
- ✅ Performance metrics calculation
- ✅ Analytics dashboard UI
- ✅ Comparison charts
- ✅ CSV export

### Phase 4: Advanced Features
- ✅ Smart rotation (auto-switch to best performer)
- ✅ A/B test recommendations
- ✅ Notification system
- ✅ AI-powered suggestions

## 🔐 Security Considerations

1. **OAuth Scopes:** Requires `youtube` and `youtube.force-ssl` scopes
2. **File Upload:** Validate image type, size, and dimensions
3. **API Rate Limits:** Implement exponential backoff
4. **User Permissions:** Only stream owner can manage variants
5. **Data Privacy:** Aggregate metrics don't expose individual viewer data

## 📈 Success Metrics

- **Adoption Rate:** % of users enabling rotation feature
- **Rotation Success Rate:** % of successful API updates
- **Performance Improvement:** Average increase in views with rotation
- **User Satisfaction:** Feedback and feature usage frequency

## 🎓 User Education

### Documentation Needed:
1. **Quick Start Guide:** How to create first A/B test
2. **Best Practices:** Tips for effective title/thumbnail testing
3. **Analytics Guide:** How to interpret performance data
4. **Troubleshooting:** Common issues and solutions

### In-App Guidance:
1. **Tooltips:** Explain each setting
2. **Example Variants:** Show sample titles/thumbnails
3. **Performance Tips:** Suggest optimal rotation intervals
4. **First-time Tutorial:** Walk through creating first test

## 🔮 Future Enhancements

1. **AI Title Generator:** Suggest optimized titles based on content
2. **Thumbnail Templates:** Pre-designed templates for quick creation
3. **Competitor Analysis:** Compare performance with similar streams
4. **Multi-platform Support:** Extend to Twitch, Facebook Live
5. **Advanced Scheduling:** Different variants for different time slots
6. **Audience Segmentation:** Different variants for different viewer demographics

## 📝 Notes for Discussion

### Questions to Consider:
1. Should we limit rotation to YouTube API streams only, or also support manual RTMP?
2. What's the minimum rotation interval that won't annoy viewers?
3. Should we auto-disable rotation if API errors persist?
4. How long should we retain rotation history data?
5. Should variants be shareable between streams (template system)?

### Technical Decisions:
1. Use cron job or event-driven architecture for rotation scheduling?
2. Store thumbnails locally or use cloud storage (S3, etc.)?
3. Real-time metrics via YouTube API or periodic polling?
4. Client-side or server-side analytics calculations?

### UX Considerations:
1. Should rotation be opt-in or opt-out?
2. How prominent should the feature be in the UI?
3. Should we show rotation status on stream cards?
4. How to handle rotation during stream editing?

---

**Document Version:** 1.0  
**Created:** 2024-12-18  
**Status:** Draft - Ready for Review  
**Next Steps:** Review requirements, discuss technical approach, create design document
