# Summary: Apa yang Di-Save di Tombol Save

## NEW STREAM MODAL (Create Stream)

### Basic Fields (Selalu di-save):
1. ✅ **Stream Title** (`streamTitle`) → `title`
2. ✅ **Video ID** (`videoId`) → `video_id`
3. ✅ **RTMP URL** (`rtmpUrl`) → `rtmp_url`
4. ✅ **Stream Key** (`streamKey`) → `stream_key`
5. ✅ **Loop Video** (`loopVideo`) → `loop_video`
6. ✅ **Platform** (auto-detected dari RTMP URL) → `platform`, `platform_icon`
7. ✅ **Use YouTube API** (`useYouTubeAPI`) → `use_youtube_api`
8. ✅ **User ID** (dari session) → `user_id`

### YouTube API Fields (Jika `useYouTubeAPI` = true):
9. ✅ **Description** (`youtubeDescription`) → `youtube_description`
10. ✅ **Privacy** (`youtubePrivacy`) → `youtube_privacy`
11. ✅ **Made for Kids** (`youtubeMadeForKids`) → `youtube_made_for_kids`
12. ✅ **Age Restricted** (`youtubeAgeRestricted`) → `youtube_age_restricted`
13. ✅ **Synthetic Content** (`youtubeSyntheticContent`) → `youtube_synthetic_content`
14. ✅ **Auto Start** (`youtubeAutoStart`) → `youtube_auto_start`
15. ✅ **Auto End** (`youtubeAutoEnd`) → `youtube_auto_end`
16. ✅ **Tags** (`youtube_tags`) → `youtube_tags` (JSON string)
17. ✅ **Thumbnail** (file upload) → Uploaded ke YouTube API + path saved

### Schedule Fields:
18. ✅ **Schedules** (array) → Multiple records di `stream_schedules` table
    - `schedule_time`
    - `duration`
    - `is_recurring`
    - `recurring_days`

### Status Fields (Auto-calculated):
19. ✅ **Status** → `scheduled` (jika ada schedule) atau `offline`
20. ✅ **Schedule Time** → Dari schedule pertama
21. ✅ **Duration** → Total dari semua schedules

---

## EDIT STREAM MODAL (Update Stream)

### Basic Fields (Selalu di-update):
1. ✅ **Stream Title** (`streamTitle`) → `title`
2. ✅ **Video ID** (`videoId`) → `video_id`
3. ✅ **Loop Video** (`loopVideo`) → `loop_video`

### RTMP Fields (HANYA jika BUKAN YouTube API):
4. ✅ **RTMP URL** (`rtmpUrl`) → `rtmp_url` (HANYA jika `use_youtube_api` = false)
5. ✅ **Stream Key** (`streamKey`) → `stream_key` (HANYA jika `use_youtube_api` = false)

**CATATAN PENTING**: 
- Jika stream menggunakan YouTube API (`use_youtube_api` = true), RTMP URL dan Stream Key TIDAK di-update
- Ini karena managed by YouTube broadcast
- User tetap bisa LIHAT tapi tidak bisa EDIT

### YouTube API Fields (Jika `useYouTubeAPI` = true):
6. ✅ **Description** (`youtubeDescription`) → `youtube_description`
7. ✅ **Privacy** (`youtubePrivacy`) → `youtube_privacy`
8. ✅ **Made for Kids** (`youtubeMadeForKids`) → `youtube_made_for_kids`
9. ✅ **Age Restricted** (`youtubeAgeRestricted`) → `youtube_age_restricted`
10. ✅ **Synthetic Content** (`youtubeSyntheticContent`) → `youtube_synthetic_content`
11. ✅ **Auto Start** (`youtubeAutoStart`) → `youtube_auto_start`
12. ✅ **Auto End** (`youtubeAutoEnd`) → `youtube_auto_end`
13. ✅ **Tags** (`youtubeTags`) → `youtube_tags` (JSON string) **[BARU DITAMBAHKAN]**
14. ✅ **Thumbnail** (file upload) → `youtube_thumbnail_path` **[BARU DITAMBAHKAN]**

### Schedule Fields:
15. ✅ **Schedules** (array) → Delete old + create new records di `stream_schedules` table
    - `schedule_time`
    - `duration`
    - `is_recurring`
    - `recurring_days`

### Status Fields (Auto-calculated):
16. ✅ **Status** → `scheduled` (jika ada schedule) atau `offline`
17. ✅ **Schedule Time** → Dari schedule pertama
18. ✅ **Duration** → Total dari semua schedules

---

## Perbedaan NEW vs EDIT

### NEW STREAM:
- ✅ Semua field bisa di-set
- ✅ RTMP URL dan Stream Key selalu di-save
- ✅ YouTube broadcast di-create jika `useYouTubeAPI` = true
- ✅ Tags di-save ke database
- ✅ Thumbnail di-upload ke YouTube API (jika Stream Now)
- ✅ Thumbnail path di-save untuk scheduler (jika Scheduled)

### EDIT STREAM:
- ✅ Semua field bisa di-update KECUALI:
  - ❌ RTMP URL (jika YouTube API stream)
  - ❌ Stream Key (jika YouTube API stream)
- ✅ Tags SEKARANG di-save (baru ditambahkan)
- ✅ Thumbnail SEKARANG di-save (baru ditambahkan)
- ❌ YouTube broadcast TIDAK di-update (harus manual via YouTube Studio)

---

## Yang Baru Ditambahkan di Update Stream

### 1. Tags Support
**Sebelumnya**: Tags tidak di-save saat update
**Sekarang**: Tags di-save sebagai JSON string ke `youtube_tags` column

```javascript
// Handle tags (convert array to JSON string for storage)
if (req.body.youtubeTags !== undefined) {
  const tags = typeof req.body.youtubeTags === 'string' ? JSON.parse(req.body.youtubeTags) : req.body.youtubeTags;
  updateData.youtube_tags = JSON.stringify(tags);
}
```

### 2. Thumbnail Support
**Sebelumnya**: Thumbnail tidak di-save saat update
**Sekarang**: Thumbnail di-upload dan path di-save ke `youtube_thumbnail_path` column

```javascript
// Handle thumbnail upload
if (req.file) {
  updateData.youtube_thumbnail_path = `/uploads/thumbnails/${req.file.filename}`;
}
```

### 3. Database Column Added
**Baru ditambahkan di `db/database.js`**:
```javascript
db.run(`ALTER TABLE streams ADD COLUMN youtube_thumbnail_path TEXT`, ...);
```

---

## Storage Location

### Tags:
- **Location**: Database (`streams.youtube_tags`)
- **Format**: JSON string (array of strings)
- **Example**: `'["432hz music","healing music","meditation"]'`

### Thumbnail:
- **Location**: 
  1. File system: `/uploads/thumbnails/filename.jpg`
  2. Database: `streams.youtube_thumbnail_path` = `/uploads/thumbnails/filename.jpg`
- **Format**: String (file path)

### Description:
- **Location**: Database (`streams.youtube_description`)
- **Format**: Text

### All Other YouTube Fields:
- **Location**: Database (`streams` table)
- **Format**: Various (TEXT, BOOLEAN, etc.)

---

## Form Submission

### NEW STREAM:
```javascript
FormData {
  streamTitle: "...",
  videoId: "...",
  rtmpUrl: "...",
  streamKey: "...",
  useYouTubeAPI: "true",
  youtubeDescription: "...",
  youtubeTags: "[\"tag1\",\"tag2\"]", // JSON string
  youtubeThumbnail: File, // File object
  // ... other fields
}
```

### EDIT STREAM:
```javascript
FormData {
  streamTitle: "...",
  videoId: "...",
  loopVideo: "true",
  useYouTubeAPI: "true",
  youtubeDescription: "...",
  youtubeTags: "[\"tag1\",\"tag2\"]", // JSON string
  youtubeThumbnail: File, // File object (if uploaded)
  // ... other fields
  // NOTE: rtmpUrl and streamKey NOT sent if YouTube API stream
}
```

---

## Kesimpulan

✅ **NEW STREAM**: Semua field di-save dengan benar
✅ **EDIT STREAM**: Sekarang sudah support Tags dan Thumbnail
✅ **Tags**: Di-save ke database sebagai JSON string
✅ **Thumbnail**: Di-save ke file system + path di database
✅ **RTMP/Stream Key**: Protected untuk YouTube API streams (tidak bisa di-edit)
