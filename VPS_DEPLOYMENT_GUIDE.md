# VPS Deployment Guide - Streambro

Panduan deployment sederhana untuk VPS baru.

---

## 📋 Persiapan

### Info Server Saat Ini:
- **Server:** UpCloud NYC
- **IP VPS:** `85.9.195.103`
- **Username:** `root`
- **SSH Key:** `id_rsa_upcloud_nyc` (lokasi: `~/.ssh/id_rsa_upcloud_nyc`)
- **Domain:** `streambro.nivarastudio.site` (opsional)
- **App Path:** `/root/streambrovps`

### Old Server (Archived):
- IP: `94.237.3.164` (tidak digunakan lagi)

---

## 🔐 Setup SSH Key (Recommended)

### Windows (PowerShell):

```powershell
# 1. Generate SSH Key khusus untuk UpCloud NYC
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc
# Tekan Enter 2x (no passphrase)

# 2. Copy public key ke VPS
type $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc.pub | ssh root@85.9.195.103 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
# Masukkan password VPS

# 3. Test koneksi (tidak perlu password lagi)
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103
```

### Linux/Mac:

```bash
# 1. Generate SSH Key khusus untuk UpCloud NYC
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_upcloud_nyc
# Tekan Enter 2x (no passphrase)

# 2. Copy public key ke VPS
ssh-copy-id -i ~/.ssh/id_rsa_upcloud_nyc.pub root@85.9.195.103
# Masukkan password VPS

# 3. Test koneksi
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103
```

---

## 🚀 Quick Deploy Commands (PowerShell)

### Upload File & Restart (Tanpa Git)
```powershell
# Upload single file
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc views/dashboard.ejs root@85.9.195.103:/root/streambrovps/views/

# Upload + Restart sekaligus
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc views/dashboard.ejs root@85.9.195.103:/root/streambrovps/views/ ; ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 restart streambro"
```

### Deploy dengan Git Pull
```powershell
# Pull latest code + restart
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && git pull && pm2 restart streambro"
```

### Check Status & Logs
```powershell
# Check PM2 status
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 status"

# View logs (last 50 lines)
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --lines 50 --nostream"

# Check disk space & memory
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "df -h && free -h"
```

### Backup Database
```powershell
# Create backup on server
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && cp db/streambro.db db/backup_$(date +%Y%m%d_%H%M%S).db"

# Download backup to local
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103:/root/streambrovps/db/streambro.db ./backups/streambro_$(Get-Date -Format 'yyyyMMdd_HHmmss').db
```

---

## 🚀 Deploy ke VPS Baru

### 1. Login ke VPS

**Dengan Password:**
```bash
ssh root@85.9.195.103
```

**Dengan SSH Key:**
```bash
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103
# Langsung masuk tanpa password
```

---

### 2. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install FFmpeg
apt install -y ffmpeg

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git

# Verify installations
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x
ffmpeg -version
pm2 -v
```

---

### 2.1. Setup Timezone ke WIB (Untuk User Indonesia)

**PENTING:** Jika user Anda di Indonesia, set timezone ke WIB agar jadwal stream sesuai waktu lokal.

```bash
# Cek timezone saat ini
timedatectl

# Set timezone ke WIB (Asia/Jakarta)
timedatectl set-timezone Asia/Jakarta

# Verify timezone sudah berubah
timedatectl
# Output: Time zone: Asia/Jakarta (WIB, +0700)

# Cek waktu sekarang
date
# Output: Mon Dec 23 10:30:00 WIB 2024
```

**Timezone Options untuk Indonesia:**
```bash
# WIB (Waktu Indonesia Barat) - Jakarta, Sumatra
timedatectl set-timezone Asia/Jakarta

# WITA (Waktu Indonesia Tengah) - Bali, Kalimantan
timedatectl set-timezone Asia/Makassar

# WIT (Waktu Indonesia Timur) - Papua, Maluku
timedatectl set-timezone Asia/Jayapura
```

**Restart PM2 setelah ganti timezone:**
```bash
# Jika aplikasi sudah running
pm2 restart streambro

# Atau restart semua
pm2 restart all
```

---

### 3. Clone Repository

```bash
# Clone dari GitHub
cd /root
git clone https://github.com/andarasmith2025/streambrovps.git
cd streambrovps

# Install dependencies
npm install
```

---

### 4. Setup Environment Variables

```bash
# Copy .env.example ke .env
cp .env.example .env

# Edit .env
nano .env
```

**Isi .env:**
```env
# Server
PORT=7575
NODE_ENV=production

# Session
SESSION_SECRET=your-random-secret-here-change-this

# Database
DATABASE_PATH=./db/streambro.db

# Domain (opsional)
DOMAIN=streambro.nivarastudio.site

# YouTube API (per-user, diisi di dashboard)
# YOUTUBE_CLIENT_ID=
# YOUTUBE_CLIENT_SECRET=
# YOUTUBE_REDIRECT_URI=
```

**Save:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 5. Setup Database

```bash
# Create database directory
mkdir -p db

# Initialize database (otomatis saat start pertama kali)
# Atau manual:
node -e "require('./db/database').db"
```

---

### 6. Start Application

```bash
# Start dengan PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 auto-start on reboot
pm2 startup
# Copy-paste command yang muncul, lalu jalankan
```

---

### 7. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs streambro --lines 50

# Check if app is running
curl http://localhost:7575

# Check from outside
curl http://94.237.3.164:7575
```

---

## 🌐 Setup Domain (Opsional)

### Install Nginx

```bash
apt install -y nginx
```

### Configure Nginx

```bash
nano /etc/nginx/sites-available/streambro
```

**Isi file:**
```nginx
server {
    listen 80;
    server_name streambro.nivarastudio.site;

    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

### Setup SSL (HTTPS)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d streambro.nivarastudio.site

# Auto-renewal (already setup by certbot)
certbot renew --dry-run
```

---

## 🔄 Update Application

### Dari Local (Windows):

```bash
# Push changes ke GitHub
git add .
git commit -m "Update feature"
git push origin main

# Deploy ke VPS
ssh root@94.237.3.164 "cd /root/streambrovps && git pull && pm2 restart streambro"
```

### Dari VPS:

```bash
# Login ke VPS
ssh root@94.237.3.164

# Update code
cd /root/streambrovps
git pull

# Restart app
pm2 restart streambro

# Check logs
pm2 logs streambro --lines 50
```

---

## 📊 Monitoring Commands

### PM2 Commands:

```bash
# Status
pm2 status

# Logs (real-time)
pm2 logs streambro

# Logs (last 100 lines)
pm2 logs streambro --lines 100

# Monitor (CPU, Memory)
pm2 monit

# Restart
pm2 restart streambro

# Stop
pm2 stop streambro

# Delete
pm2 delete streambro
```

### System Commands:

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top
# Press 'q' to quit

# Check running processes
ps aux | grep node

# Check port 7575
netstat -tulpn | grep 7575
```

---

## 🔧 Troubleshooting

### App tidak start:

```bash
# Check logs
pm2 logs streambro --lines 100

# Check if port already used
netstat -tulpn | grep 7575

# Kill process on port 7575
kill -9 $(lsof -t -i:7575)

# Restart
pm2 restart streambro
```

### Database error:

```bash
# Check database file
ls -lh db/streambro.db

# Backup database
cp db/streambro.db db/streambro_backup_$(date +%Y%m%d).db

# Check database integrity
sqlite3 db/streambro.db "PRAGMA integrity_check;"
```

### FFmpeg not found:

```bash
# Check FFmpeg
which ffmpeg
ffmpeg -version

# Reinstall if needed
apt install -y ffmpeg
```

### Out of memory:

```bash
# Check memory
free -h

# Restart PM2
pm2 restart streambro

# Add swap if needed (2GB)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Timezone/Jadwal tidak sesuai:

```bash
# Cek timezone VPS
timedatectl

# Jika timezone salah, set ke WIB
timedatectl set-timezone Asia/Jakarta

# Verify
date
# Harus muncul: WIB (bukan UTC)

# Restart aplikasi
pm2 restart streambro

# Cek jadwal di database
sqlite3 db/streambro.db "SELECT id, title, schedule_time FROM streams WHERE status='scheduled' LIMIT 5"
```

**Penjelasan Timezone:**
- **UTC** = Waktu Universal (0 offset)
- **WIB** = UTC+7 (Jakarta, Sumatra)
- **WITA** = UTC+8 (Bali, Kalimantan)
- **WIT** = UTC+9 (Papua, Maluku)

**Contoh:**
- Jadwal: 10:00 WIB
- Di database tersimpan: 03:00 UTC (10:00 - 7 jam)
- VPS timezone WIB → Scheduler trigger jam 10:00 WIB ✅
- VPS timezone UTC → Scheduler trigger jam 03:00 UTC (salah!) ❌

---

## 🔐 Security Best Practices

### 1. Change SSH Port (Opsional):

```bash
nano /etc/ssh/sshd_config
# Change: Port 22 → Port 2222
systemctl restart sshd

# Login dengan port baru:
ssh -p 2222 root@94.237.3.164
```

### 2. Setup Firewall:

```bash
# Install UFW
apt install -y ufw

# Allow SSH
ufw allow 22/tcp
# Or custom port: ufw allow 2222/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow app port (if not using nginx)
ufw allow 7575/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### 3. Disable Root Login (Opsional):

```bash
# Create new user
adduser streambro
usermod -aG sudo streambro

# Copy SSH key
mkdir -p /home/streambro/.ssh
cp ~/.ssh/authorized_keys /home/streambro/.ssh/
chown -R streambro:streambro /home/streambro/.ssh

# Disable root login
nano /etc/ssh/sshd_config
# Change: PermitRootLogin yes → PermitRootLogin no
systemctl restart sshd

# Login dengan user baru:
ssh streambro@94.237.3.164
```

---

## 📦 Backup & Restore

### Backup:

```bash
# Backup database
cp db/streambro.db db/streambro_backup_$(date +%Y%m%d_%H%M%S).db

# Backup .env
cp .env .env.backup

# Backup uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Download backup ke local
scp root@94.237.3.164:/root/streambrovps/db/streambro_backup_*.db ./backups/
```

### Restore:

```bash
# Stop app
pm2 stop streambro

# Restore database
cp db/streambro_backup_20241222.db db/streambro.db

# Restart app
pm2 restart streambro
```

---

## 🚀 Quick Deploy Script

Buat file `deploy.sh` di local:

```bash
#!/bin/bash
# deploy.sh - Quick deploy script

echo "🚀 Deploying to VPS..."

# Push to GitHub
git add .
git commit -m "Deploy: $(date +%Y%m%d_%H%M%S)"
git push origin main

# Deploy to VPS
ssh root@94.237.3.164 << 'EOF'
cd /root/streambrovps
git pull
npm install --production
pm2 restart streambro
pm2 logs streambro --lines 20
EOF

echo "✅ Deployment complete!"
```

**Usage:**
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 Cheat Sheet

### One-liner Commands:

```bash
# Quick deploy
ssh root@94.237.3.164 "cd /root/streambrovps && git pull && pm2 restart streambro"

# Check status
ssh root@94.237.3.164 "pm2 status && pm2 logs streambro --lines 20"

# Backup database
ssh root@94.237.3.164 "cd /root/streambrovps && cp db/streambro.db db/backup_$(date +%Y%m%d).db"

# Check disk space
ssh root@94.237.3.164 "df -h && free -h"

# Restart everything
ssh root@94.237.3.164 "pm2 restart all"
```

---

## ✅ Deployment Checklist

- [ ] VPS ready (Ubuntu 20.04+)
- [ ] SSH key setup (opsional)
- [ ] Node.js 20.x installed
- [ ] FFmpeg installed
- [ ] PM2 installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] .env configured
- [ ] Database initialized
- [ ] PM2 started
- [ ] PM2 auto-start enabled
- [ ] Nginx configured (opsional)
- [ ] SSL certificate installed (opsional)
- [ ] Firewall configured
- [ ] Backup strategy setup
- [ ] Monitoring setup

---

## 🎯 Summary

**Minimal Setup (5 menit):**
```bash
ssh root@94.237.3.164
apt update && apt install -y nodejs npm ffmpeg git
npm install -g pm2
git clone https://github.com/andarasmith2025/streambrovps.git
cd streambrovps
npm install
cp .env.example .env
nano .env  # Edit SESSION_SECRET

# Set timezone ke WIB (untuk user Indonesia)
timedatectl set-timezone Asia/Jakarta
date  # Verify timezone

pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Deploy Update:**
```bash
ssh root@94.237.3.164 "cd /root/streambrovps && git pull && pm2 restart streambro"
```

**Check Status:**
```bash
ssh root@94.237.3.164 "pm2 logs streambro --lines 50"
```

**Check Timezone:**
```bash
ssh root@94.237.3.164 "timedatectl && date"
```

Selesai! 🎉
