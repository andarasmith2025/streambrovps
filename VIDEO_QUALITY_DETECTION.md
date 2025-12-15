# Video Quality Detection System

## Overview

StreamBro otomatis menganalisis setiap video yang di-upload untuk memastikan kompatibilitas streaming, terutama untuk YouTube.

## Apa yang Dideteksi?

### 1. **Bitrate**
- Minimum bitrate untuk setiap resolusi
- Rekomendasi bitrate optimal
- Warning jika bitrate terlalu rendah

**Rekomendasi Bitrate:**
| Resolution | Minimum | Recommended | Maximum |
|------------|---------|-------------|---------|
| 4K (2160p) | 13,000 kbps | 20,000 kbps | 51,000 kbps |
| 1440p | 6,000 kbps | 9,000 kbps | 24,000 kbps |
| 1080p | 4,000 kbps | 6,000 kbps | 12,000 kbps |
| 720p | 2,500 kbps | 4,000 kbps | 7,500 kbps |
| 480p | 1,000 kbps | 2,000 kbps | 4,000 kbps |

### 2. **Keyframe Interval (GOP)**
- Deteksi jarak antar keyframe
- YouTube requirement: ≤4 detik
- Rekomendasi: ≤2 detik untuk kompatibilitas terbaik

### 3. **Codec**
- Deteksi codec video (H.264, H.265, VP9, dll)
- Rekomendasi: H.264 untuk kompatibilitas maksimal

### 4. **Resolution & FPS**
- Deteksi resolusi dan frame rate
- Klasifikasi quality tier (360p - 4K)

## Waktu Analisis

⚡ **Sangat Cepat!**
- Video 10 menit: ~1-2 detik
- Video 1 jam: ~1-2 detik
- Video 3 jam: ~1-2 detik

Analisis hanya membaca metadata, tidak re-encode video!

## Response Format

```json
{
  "success": true,
  "video": {
    "id": "video-id",
    "title": "My Video",
    ...
  },
  "analysis": {
    "quality": {
      "resolution": "1920x1080",
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "bitrate": 5000,
      "codec": "h264",
      "duration": 3600,
      "qualityTier": "1080p",
      "gopSize": 60,
      "gopSeconds": 2.0
    },
    "compatibility": {
      "streamcopyReady": true,
      "youtubeReady": true,
      "requiresAdvancedSettings": false
    },
    "issues": [],
    "warnings": [],
    "recommendations": {
      "minBitrate": 4000,
      "recommendedBitrate": 6000,
      "maxBitrate": 12000
    }
  }
}
```

## Issue Types

### **Errors** (Harus diperbaiki)

#### 1. `bitrate_low`
```json
{
  "type": "bitrate_low",
  "severity": "error",
  "message": "Bitrate too low (2000 kbps). Minimum 4000 kbps recommended for 1080p.",
  "recommendation": "Re-encode video with higher bitrate or use Advanced Settings when streaming."
}
```

#### 2. `gop_too_large`
```json
{
  "type": "gop_too_large",
  "severity": "error",
  "message": "Keyframe interval too large (7.5 seconds). YouTube requires ≤4 seconds.",
  "recommendation": "Enable 'Advanced Settings' when creating stream, or re-encode video with GOP ≤2 seconds."
}
```

### **Warnings** (Opsional, tapi disarankan)

#### 1. `bitrate_suboptimal`
```json
{
  "type": "bitrate_suboptimal",
  "severity": "warning",
  "message": "Bitrate is below recommended (3500 kbps). Recommended: 6000 kbps for 1080p.",
  "recommendation": "Consider re-encoding for better quality."
}
```

#### 2. `gop_suboptimal`
```json
{
  "type": "gop_suboptimal",
  "severity": "warning",
  "message": "Keyframe interval is 3.2 seconds. Recommended: ≤2 seconds for best compatibility.",
  "recommendation": "Consider enabling 'Advanced Settings' for YouTube streaming."
}
```

#### 3. `codec_compatibility`
```json
{
  "type": "codec_compatibility",
  "severity": "warning",
  "message": "Video codec is hevc. H.264 is recommended for best compatibility.",
  "recommendation": "Video will be re-encoded to H.264 when using Advanced Settings."
}
```

## UI Integration

### Upload Success dengan Warning

```html
<div class="upload-result">
  <div class="success-message">
    ✅ Video uploaded successfully!
  </div>
  
  <!-- Jika ada issues -->
  <div class="issues-container">
    <div class="issue error">
      ⚠️ Keyframe interval too large (7.5 seconds)
      <div class="recommendation">
        💡 Enable "Advanced Settings" when creating stream for YouTube
      </div>
    </div>
  </div>
  
  <!-- Jika ada warnings -->
  <div class="warnings-container">
    <div class="warning">
      ℹ️ Bitrate below recommended (3500 kbps vs 6000 kbps)
    </div>
  </div>
  
  <!-- Quality info -->
  <div class="quality-info">
    📊 Quality: 1080p @ 30fps | Bitrate: 3500 kbps | GOP: 7.5s
  </div>
</div>
```

## Solusi untuk Issues

### Jika GOP terlalu besar:

**Opsi 1: Gunakan Advanced Settings** (Saat streaming)
- Buka "New Stream"
- Toggle "Advanced Settings" → ON
- StreamBro akan otomatis fix keyframe

**Opsi 2: Re-encode video** (Sebelum upload)
```bash
ffmpeg -i input.mp4 -c:v libx264 -g 60 -keyint_min 30 -sc_threshold 0 -c:a copy output.mp4
```

### Jika Bitrate terlalu rendah:

**Opsi 1: Gunakan Advanced Settings**
- Set bitrate manual saat streaming

**Opsi 2: Re-encode dengan bitrate lebih tinggi**
```bash
ffmpeg -i input.mp4 -c:v libx264 -b:v 6000k -c:a copy output.mp4
```

## Benefits

✅ **User tahu kualitas video** sebelum streaming
✅ **Hindari error YouTube** (keyframe issue)
✅ **Rekomendasi otomatis** untuk fix issues
✅ **Cepat** - Hanya 1-2 detik analisis
✅ **Tidak re-encode** - Hanya baca metadata

## Future Enhancements

- [ ] Auto-fix saat upload (optional)
- [ ] Batch analysis untuk multiple videos
- [ ] Video quality score (0-100)
- [ ] Platform-specific recommendations (YouTube, Facebook, TikTok)
