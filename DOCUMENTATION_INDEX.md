# 📚 StreamBro - Documentation Index

Daftar lengkap semua dokumentasi StreamBro.

---

## 🚀 Getting Started

### 1. [README.md](README.md)
**Overview aplikasi StreamBro**
- Features
- Requirements
- Quick start
- Usage examples

### 2. [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) ⭐ **MULAI DI SINI**
**Panduan lengkap instalasi di VPS Ubuntu**
- VPS setup
- SSH key configuration
- Install dependencies (Node.js, FFmpeg, PM2)
- Clone & configure StreamBro
- Create admin account
- Run with PM2
- Firewall & security
- Troubleshooting

### 3. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) ⚡
**Cheat sheet command yang sering digunakan**
- Installation commands
- SSH key setup
- User management
- Stream management
- PM2 commands
- Git update
- System monitoring
- Troubleshooting quick fixes

---

## 👥 User Management

### [USER_MANAGEMENT.md](USER_MANAGEMENT.md)
**Mengelola user dan quota**
- Create admin account
- Create member account
- Reset password
- Activate/deactivate user
- Set user quota (streams & storage)
- Check user list
- User roles (admin vs member)

---

## 🎬 Streaming Features

### [STREAM_TEMPLATES.md](STREAM_TEMPLATES.md)
**Save dan reuse stream configurations**
- Create template from existing stream
- Use template for new stream
- Edit template
- Delete template
- Template benefits

### [AUTO_RECOVERY.md](AUTO_RECOVERY.md)
**Auto-restart streams after server reboot**
- How it works
- Recovery for scheduled streams
- Recovery for manual streams (Stream Now)
- Recovery window (24 hours)
- Disable auto-recovery

---

## 📊 Performance & Optimization

### [RAM_CALCULATION_GUIDE.md](RAM_CALCULATION_GUIDE.md)
**Understanding memory usage**
- How to view RAM in dashboard
- RAM calculation accuracy
- Idle vs streaming RAM usage
- Capacity calculation
- Real-time monitoring
- Troubleshooting RAM issues

### [MEMORY_OPTIMIZATION.md](MEMORY_OPTIMIZATION.md)
**Optimize RAM usage for more streams**
- FFmpeg buffer optimization
- Streamcopy vs re-encode mode
- Memory per stream
- Max streams calculation
- Recommendations for 4GB RAM

### [HARDWARE_ENCODER_IMPLEMENTATION.md](HARDWARE_ENCODER_IMPLEMENTATION.md)
**GPU acceleration for encoding**
- NVIDIA NVENC setup
- Intel Quick Sync setup
- Hardware detection
- Fallback to software encoding
- Performance comparison

---

## 🎥 Video Quality

### [VIDEO_QUALITY_DETECTION.md](VIDEO_QUALITY_DETECTION.md)
**Auto-detect video quality on upload**
- Bitrate detection
- GOP size detection
- Resolution & FPS detection
- YouTube-ready validation
- Warnings & recommendations
- Analysis speed (1-2 seconds)

### [VIDEO_BITRATE_ANALYSIS.md](VIDEO_BITRATE_ANALYSIS.md)
**Bitrate recommendations for streaming**
- Recommended bitrates by resolution
- YouTube requirements
- Facebook requirements
- Twitch requirements
- GOP size recommendations
- Encoding tips

---

## 📄 License

### [LICENSE.md](LICENSE.md)
**MIT License**
- Open source
- Free to use
- Modify and distribute

---

## 📖 Documentation Structure

```
StreamBro Documentation/
│
├── 🚀 Getting Started
│   ├── README.md                          # Overview
│   ├── INSTALLATION_GUIDE.md              # Complete setup guide ⭐
│   └── QUICK_REFERENCE.md                 # Command cheat sheet ⚡
│
├── 👥 User Management
│   └── USER_MANAGEMENT.md                 # User & quota management
│
├── 🎬 Streaming Features
│   ├── STREAM_TEMPLATES.md                # Save/reuse configurations
│   └── AUTO_RECOVERY.md                   # Auto-restart streams
│
├── 📊 Performance & Optimization
│   ├── RAM_CALCULATION_GUIDE.md           # Memory usage guide
│   ├── MEMORY_OPTIMIZATION.md             # Optimize RAM
│   └── HARDWARE_ENCODER_IMPLEMENTATION.md # GPU acceleration
│
├── 🎥 Video Quality
│   ├── VIDEO_QUALITY_DETECTION.md         # Auto-detect quality
│   └── VIDEO_BITRATE_ANALYSIS.md          # Bitrate recommendations
│
└── 📄 License
    └── LICENSE.md                         # MIT License
```

---

## 🎯 Quick Navigation

### Untuk Pemula:
1. Baca [README.md](README.md) untuk overview
2. Ikuti [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) step-by-step
3. Simpan [QUICK_REFERENCE.md](QUICK_REFERENCE.md) untuk referensi cepat

### Untuk Admin:
1. [USER_MANAGEMENT.md](USER_MANAGEMENT.md) - Kelola user
2. [RAM_CALCULATION_GUIDE.md](RAM_CALCULATION_GUIDE.md) - Monitor resources
3. [MEMORY_OPTIMIZATION.md](MEMORY_OPTIMIZATION.md) - Optimize performance

### Untuk Advanced Users:
1. [HARDWARE_ENCODER_IMPLEMENTATION.md](HARDWARE_ENCODER_IMPLEMENTATION.md) - GPU setup
2. [VIDEO_QUALITY_DETECTION.md](VIDEO_QUALITY_DETECTION.md) - Quality analysis
3. [AUTO_RECOVERY.md](AUTO_RECOVERY.md) - Auto-restart configuration

---

## 🔍 Search by Topic

### Installation & Setup
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Complete VPS setup
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick commands

### User & Account
- [USER_MANAGEMENT.md](USER_MANAGEMENT.md) - User management
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md#8-create-admin-account) - Create admin

### Streaming
- [STREAM_TEMPLATES.md](STREAM_TEMPLATES.md) - Templates
- [AUTO_RECOVERY.md](AUTO_RECOVERY.md) - Auto-restart
- [VIDEO_QUALITY_DETECTION.md](VIDEO_QUALITY_DETECTION.md) - Quality check

### Performance
- [RAM_CALCULATION_GUIDE.md](RAM_CALCULATION_GUIDE.md) - RAM usage
- [MEMORY_OPTIMIZATION.md](MEMORY_OPTIMIZATION.md) - Optimize RAM
- [HARDWARE_ENCODER_IMPLEMENTATION.md](HARDWARE_ENCODER_IMPLEMENTATION.md) - GPU

### Video Quality
- [VIDEO_QUALITY_DETECTION.md](VIDEO_QUALITY_DETECTION.md) - Auto-detect
- [VIDEO_BITRATE_ANALYSIS.md](VIDEO_BITRATE_ANALYSIS.md) - Recommendations

### Troubleshooting
- [INSTALLATION_GUIDE.md#12-troubleshooting](INSTALLATION_GUIDE.md#12-troubleshooting) - Common issues
- [QUICK_REFERENCE.md#-troubleshooting](QUICK_REFERENCE.md#-troubleshooting) - Quick fixes
- [RAM_CALCULATION_GUIDE.md#-troubleshooting-ram](RAM_CALCULATION_GUIDE.md#-troubleshooting-ram) - RAM issues

---

## 📝 Documentation Stats

- **Total Documents**: 12 files
- **Getting Started**: 3 files
- **User Management**: 1 file
- **Streaming Features**: 2 files
- **Performance**: 3 files
- **Video Quality**: 2 files
- **License**: 1 file

---

## 🆘 Need Help?

1. **Check documentation** - Lihat index di atas
2. **Search by topic** - Gunakan Ctrl+F
3. **Quick reference** - [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
4. **Troubleshooting** - Setiap guide punya section troubleshooting

---

## 🔄 Documentation Updates

Dokumentasi ini akan terus diupdate. Untuk versi terbaru:
```bash
cd ~/streambrovps
git pull origin main
```

---

Made with ❤️ by StreamBro Team
