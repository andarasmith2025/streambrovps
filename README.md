# 🎥 StreamBro - Multi-Platform Live Streaming Manager

StreamBro adalah aplikasi web untuk mengelola dan menjadwalkan live streaming ke berbagai platform (YouTube, Facebook, Twitch, dll) dengan mudah.

![StreamBro Dashboard](https://img.shields.io/badge/Node.js-20.x-green) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

### Core Features
- 🎬 **Multi-Video Streaming** - Upload dan stream multiple videos
- 📅 **Stream Scheduling** - Jadwalkan stream otomatis dengan repeat options
- 🔄 **Auto-Recovery** - Stream otomatis restart setelah server reboot
- 📊 **Real-time Monitoring** - Monitor CPU, RAM, Network, dan Capacity
- 👥 **Multi-User Support** - User management dengan quota system
- 🎨 **Modern UI** - Responsive dashboard dengan Tailwind CSS

### Advanced Features
- ⚡ **Hardware Encoding** - Support NVIDIA NVENC, Intel QSV
- 🎵 **Playlist Support** - Stream multiple videos in sequence
- 🔁 **Loop Mode** - Repeat video/playlist infinitely
- 📝 **Stream Templates** - Save dan reuse stream configurations
- 🎯 **Video Quality Detection** - Auto-detect bitrate, GOP, resolution
- 💾 **Low Memory Mode** - Optimized for streamcopy (30MB per stream)

### Platform Support
- ✅ YouTube Live
- ✅ Facebook Live
- ✅ Twitch
- ✅ Custom RTMP servers

---

## 📋 Requirements

### Minimum Specs
- **OS**: Ubuntu 22.04 LTS (or Windows 10/11 for development)
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 60 GB SSD
- **Network**: 100 Mbps upload

### Software
- Node.js 20.x
- FFmpeg 4.x or higher
- PM2 (for production)
- SQLite3 (included)

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/streambro.git
cd streambro
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env
```

Generate session secret:
```bash
node generate-secret.js
```

### 4. Create Admin Account
```bash
node create-admin.js
```

### 5. Run Application

**Development:**
```bash
npm start
```

**Production (with PM2):**
```bash
pm2 start app.js --name streambro
pm2 save
pm2 startup
```

### 6. Access Dashboard
```
http://localhost:7575
```

Login with admin credentials you created.

---

## 📚 Documentation

### Installation & Setup
- **[Complete Installation Guide](INSTALLATION_GUIDE.md)** - Step-by-step VPS setup
- **[User Management](USER_MANAGEMENT.md)** - Create users, reset passwords, manage quota

### Technical Guides
- **[RAM Calculation Guide](RAM_CALCULATION_GUIDE.md)** - Understanding memory usage
- **[Auto Recovery](AUTO_RECOVERY.md)** - How auto-recovery works
- **[Video Quality Detection](VIDEO_QUALITY_DETECTION.md)** - Video analysis features
- **[Memory Optimization](MEMORY_OPTIMIZATION.md)** - Optimize RAM usage
- **[Hardware Encoder](HARDWARE_ENCODER_IMPLEMENTATION.md)** - GPU acceleration setup

### Features
- **[Stream Templates](STREAM_TEMPLATES.md)** - Save and reuse configurations
- **[Video Bitrate Analysis](VIDEO_BITRATE_ANALYSIS.md)** - Bitrate recommendations

---

## 🎯 Usage Examples

### Create a Stream
1. Upload video via dashboard
2. Click "New Stream"
3. Select video, enter RTMP URL and Stream Key
4. Choose schedule or "Stream Now"
5. Click "Create Stream"

### Schedule Recurring Stream
1. Create stream as above
2. Select "Schedule" mode
3. Add schedule: Day, Time, Duration
4. Enable "Repeat Weekly"
5. Stream will auto-start every week

### Monitor System
Dashboard shows real-time:
- Active streams count
- CPU usage
- RAM usage (Used / Total)
- Network speed (Upload/Download)
- Stream capacity

---

## 🛠️ Common Commands

### User Management
```bash
# Check users
node check-users.js

# Reset password
node reset-password.js Username NewPassword

# Activate user
node activate-user.js Username
```

### Stream Management
```bash
# Check active streams
node check-streams.js

# Check schedules
node check-schedules.js

# Fix stream status
node fix-stream-status.js
```

### PM2 Management
```bash
# Status
pm2 status

# Logs
pm2 logs streambro

# Restart
pm2 restart streambro

# Monitor
pm2 monit
```

---

## 🔧 Configuration

### Environment Variables (.env)
```env
# Server
PORT=7575
NODE_ENV=production

# Session
SESSION_SECRET=your_generated_secret

# Database
DB_PATH=./db/streambro.db

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg

# Limits
MAX_CONCURRENT_STREAMS_PER_USER=5
MAX_CONCURRENT_STREAMS_GLOBAL=20

# Hardware Encoding
PREFER_HARDWARE_ENCODING=true
HARDWARE_ENCODER_FALLBACK=true
```

### User Quota (Admin can set)
- **Streams**: Max concurrent streams per user
- **Storage**: Max video storage in GB
- **Role**: `admin` or `member`

---

## 📊 Performance

### Streamcopy Mode (Recommended)
- **RAM per stream**: ~30 MB
- **CPU per stream**: ~5%
- **Max streams (4GB RAM)**: ~125 streams (limited by CPU/Network)

### Re-encode Mode (Advanced Settings ON)
- **RAM per stream**: ~150 MB
- **CPU per stream**: ~50%
- **Max streams (4GB RAM)**: ~2-3 streams (limited by CPU)

**Recommendation**: Use streamcopy mode and pre-encode videos with proper bitrate.

---

## 🐛 Troubleshooting

### Cannot Login
```bash
# Check server status
pm2 status

# Check logs
pm2 logs streambro --err

# Reset admin password
node reset-password.js Admin NewPassword123
```

### Stream Not Starting
```bash
# Check logs
pm2 logs streambro --lines 100

# Common issues:
# - Invalid RTMP URL/Key
# - Video file not found
# - FFmpeg error
# - Network issue
```

### High RAM Usage
```bash
# Check memory
free -h

# Check FFmpeg processes
ps aux | grep ffmpeg

# Restart to clear
pm2 restart streambro
```

See [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) for more troubleshooting tips.

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.

---

## 🙏 Acknowledgments

- **FFmpeg** - Video processing
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Tailwind CSS** - UI styling
- **PM2** - Process management
- **systeminformation** - System monitoring

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: Open an issue on GitHub
- **Email**: support@streambro.com (if available)

---

## 🎉 Success Stories

StreamBro is used by:
- Content creators for 24/7 streaming
- Churches for live worship streaming
- Schools for online classes
- Businesses for product launches

**Join the community and start streaming!** 🚀

---

Made with ❤️ by StreamBro Team
