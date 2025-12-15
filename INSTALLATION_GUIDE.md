# 🚀 StreamBro - Complete Installation Guide

Panduan lengkap instalasi StreamBro di VPS Ubuntu dari awal sampai running.

---

## 📋 Table of Contents

1. [Requirements](#requirements)
2. [VPS Setup](#vps-setup)
3. [SSH Key Setup](#ssh-key-setup)
4. [Server Preparation](#server-preparation)
5. [Install Dependencies](#install-dependencies)
6. [Clone & Configure StreamBro](#clone--configure-streambro)
7. [Database Setup](#database-setup)
8. [Create Admin Account](#create-admin-account)
9. [Run with PM2](#run-with-pm2)
10. [Firewall & Security](#firewall--security)
11. [Common Commands](#common-commands)
12. [Troubleshooting](#troubleshooting)

---

## 1. Requirements

### Minimum VPS Specs:
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 60 GB SSD
- **Network**: 100 Mbps upload (untuk streaming)

### Recommended VPS Providers:
- Contabo (murah, performa bagus)
- DigitalOcean
- Vultr
- Linode

---

## 2. VPS Setup

### A. Order VPS
1. Pilih provider (contoh: Contabo)
2. Pilih plan: **Cloud VPS M** (2 CPU, 4GB RAM, 100 Mbps)
3. Pilih OS: **Ubuntu 22.04 LTS**
4. Pilih region terdekat (Singapore untuk Asia)
5. Order dan tunggu email konfirmasi

### B. Dapatkan Akses SSH
Setelah VPS aktif, Anda akan menerima email berisi:
```
IP Address: 94.237.3.164
Username: root
Password: YourRandomPassword123
```

### C. Login Pertama Kali
```bash
ssh root@94.237.3.164
```
Masukkan password dari email.

**PENTING**: Ganti password default!
```bash
passwd
```

---

## 3. SSH Key Setup

Agar tidak perlu password setiap login, gunakan SSH key.

### A. Generate SSH Key (di komputer local Windows)

**Buka PowerShell:**
```powershell
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Tekan Enter 3x (default location, no passphrase)
# Key akan tersimpan di: C:\Users\YourName\.ssh\id_rsa
```

### B. Copy Public Key ke Server

**Cara 1: Manual Copy**
```powershell
# Lihat public key
type C:\Users\YourName\.ssh\id_rsa.pub
```

Copy output, lalu di server:
```bash
# Di server VPS
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste public key, Ctrl+X, Y, Enter

# Set permission
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Cara 2: Otomatis (jika ssh-copy-id tersedia)**
```powershell
ssh-copy-id root@94.237.3.164
```

### C. Test SSH Key
```bash
# Logout dari server
exit

# Login lagi (seharusnya tidak perlu password)
ssh root@94.237.3.164
```

---

## 4. Server Preparation

### A. Update System
```bash
apt update && apt upgrade -y
```

### B. Set Timezone (opsional)
```bash
timedatectl set-timezone Asia/Jakarta
```

### C. Install Basic Tools
```bash
apt install -y curl wget git nano htop net-tools
```

---

## 5. Install Dependencies

### A. Install Node.js 20.x
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x
```

### B. Install FFmpeg
```bash
apt install -y ffmpeg

# Verify
ffmpeg -version
```

### C. Install PM2 (Process Manager)
```bash
npm install -g pm2

# Verify
pm2 -v
```

### D. Install NVIDIA Drivers (jika ada GPU)
```bash
# Cek GPU
lspci | grep -i nvidia

# Install driver (jika ada GPU)
apt install -y nvidia-driver-535

# Reboot
reboot

# Setelah reboot, cek
nvidia-smi
```

---

## 6. Clone & Configure StreamBro

### A. Clone Repository
```bash
# Masuk ke home directory
cd ~

# Clone project
git clone https://github.com/yourusername/streambro.git streambrovps

# Masuk ke folder
cd streambrovps
```

### B. Install Dependencies
```bash
npm install
```

### C. Configure Environment
```bash
# Copy example env
cp .env.example .env

# Edit .env
nano .env
```

**Isi .env:**
```env
# Server Configuration
PORT=7575
NODE_ENV=production

# Session Secret (generate dengan: node generate-secret.js)
SESSION_SECRET=your_generated_secret_here

# Database
DB_PATH=./db/streambro.db

# FFmpeg Path
FFMPEG_PATH=/usr/bin/ffmpeg

# Stream Limits
MAX_CONCURRENT_STREAMS_PER_USER=5
MAX_CONCURRENT_STREAMS_GLOBAL=20

# Resource Monitoring
RESOURCE_WARNING_CPU_PERCENT=80
RESOURCE_WARNING_MEMORY_MB=500
RESOURCE_MONITOR_INTERVAL_MS=30000

# Hardware Encoding
PREFER_HARDWARE_ENCODING=true
HARDWARE_ENCODER_FALLBACK=true

# Force Kill Timeout
FORCE_KILL_TIMEOUT_MS=5000

# Google OAuth (opsional - untuk YouTube)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

### D. Generate Session Secret
```bash
node generate-secret.js
```
Copy output dan paste ke `.env` di `SESSION_SECRET=`

---

## 7. Database Setup

Database SQLite akan otomatis dibuat saat pertama kali run.

### A. Verify Database Path
```bash
# Pastikan folder db ada
ls -la db/

# Database akan dibuat otomatis di: db/streambro.db
```

---

## 8. Create Admin Account

### A. Run Create Admin Script
```bash
node create-admin.js
```

**Input:**
```
Enter admin username: Admin
Enter admin password: YourStrongPassword123
```

**Output:**
```
✅ Admin account created successfully!
Username: Admin
Role: admin
Status: active
```

### B. Verify Admin Account
```bash
node check-users.js
```

---

## 9. Run with PM2

### A. Start Application
```bash
# Start dengan PM2
pm2 start app.js --name streambro

# Save PM2 configuration
pm2 save

# Setup auto-start on reboot
pm2 startup
# Copy dan jalankan command yang muncul
```

### B. Verify Running
```bash
# Check status
pm2 status

# Check logs
pm2 logs streambro --lines 50

# Monitor real-time
pm2 monit
```

### C. Access Dashboard
Buka browser:
```
http://94.237.3.164:7575
```

Login dengan:
- Username: `Admin`
- Password: `YourStrongPassword123`

---

## 10. Firewall & Security

### A. Configure UFW Firewall
```bash
# Enable firewall
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow StreamBro port
ufw allow 7575/tcp

# Check status
ufw status
```

### B. Fail2Ban (opsional - proteksi brute force)
```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### C. Change SSH Port (opsional - extra security)
```bash
nano /etc/ssh/sshd_config
# Ubah: Port 22 -> Port 2222

systemctl restart sshd

# Jangan lupa allow port baru di firewall
ufw allow 2222/tcp
```

---

## 11. Common Commands

### PM2 Management
```bash
# Start
pm2 start streambro

# Stop
pm2 stop streambro

# Restart
pm2 restart streambro

# Reload (zero-downtime)
pm2 reload streambro

# Delete
pm2 delete streambro

# Logs
pm2 logs streambro
pm2 logs streambro --lines 100
pm2 logs streambro --err  # Error logs only

# Monitor
pm2 monit
```

### Git Update
```bash
cd ~/streambrovps

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Restart
pm2 restart streambro
```

### Database Management
```bash
# Check users
node check-users.js

# Reset password
node reset-password.js Username NewPassword123

# Activate user
node activate-user.js Username

# Check streams
node check-streams.js

# Check schedules
node check-schedules.js
```

### System Monitoring
```bash
# RAM usage
free -h

# CPU usage
htop

# Disk usage
df -h

# Network usage
iftop

# Process list
ps aux | grep -E 'node|ffmpeg'
```

---

## 12. Troubleshooting

### Problem: Cannot Login
```bash
# Check if server is running
pm2 status

# Check logs for errors
pm2 logs streambro --err

# Verify admin account exists
node check-users.js

# Reset password if needed
node reset-password.js Admin NewPassword123
```

### Problem: Port Already in Use
```bash
# Check what's using port 7575
lsof -i :7575

# Kill process
kill -9 <PID>

# Or change port in .env
nano .env
# Change PORT=7575 to PORT=8080
```

### Problem: FFmpeg Not Found
```bash
# Check FFmpeg installation
which ffmpeg
ffmpeg -version

# Reinstall if needed
apt install -y ffmpeg

# Update .env with correct path
nano .env
# FFMPEG_PATH=/usr/bin/ffmpeg
```

### Problem: Database Locked
```bash
# Stop application
pm2 stop streambro

# Check database file
ls -la db/streambro.db

# Restart
pm2 start streambro
```

### Problem: High RAM Usage
```bash
# Check memory
free -h
pm2 monit

# Check FFmpeg processes
ps aux | grep ffmpeg

# Stop all streams
# (via dashboard or restart server)
pm2 restart streambro
```

### Problem: Stream Not Starting
```bash
# Check logs
pm2 logs streambro --lines 100

# Common issues:
# 1. Invalid RTMP URL/Key
# 2. Video file not found
# 3. FFmpeg error
# 4. Network issue

# Test FFmpeg manually
ffmpeg -re -i /path/to/video.mp4 -c copy -f flv rtmp://your-rtmp-url/key
```

---

## 📚 Additional Documentation

- **User Management**: See `USER_MANAGEMENT.md`
- **RAM Calculation**: See `RAM_CALCULATION_GUIDE.md`
- **Auto Recovery**: See `AUTO_RECOVERY.md`
- **Video Quality**: See `VIDEO_QUALITY_DETECTION.md`
- **Memory Optimization**: See `MEMORY_OPTIMIZATION.md`

---

## 🆘 Need Help?

1. Check logs: `pm2 logs streambro`
2. Check system: `htop` and `free -h`
3. Check processes: `ps aux | grep -E 'node|ffmpeg'`
4. Restart: `pm2 restart streambro`

---

## 🎉 Success!

Jika semua langkah berhasil, Anda sekarang memiliki:
- ✅ StreamBro running di VPS
- ✅ Admin account aktif
- ✅ PM2 auto-start on reboot
- ✅ Firewall configured
- ✅ Ready untuk streaming!

**Next Steps:**
1. Upload video pertama
2. Buat stream pertama
3. Test streaming ke YouTube/Facebook
4. Monitor RAM/CPU usage
5. Enjoy! 🚀
