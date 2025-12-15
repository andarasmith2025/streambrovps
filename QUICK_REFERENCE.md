# ⚡ StreamBro - Quick Reference

Cheat sheet untuk command yang sering digunakan.

---

## 🚀 Installation (VPS Ubuntu)

```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. Install FFmpeg & PM2
apt install -y ffmpeg
npm install -g pm2

# 4. Clone & setup
git clone https://github.com/yourusername/streambro.git streambrovps
cd streambrovps
npm install
cp .env.example .env

# 5. Generate secret & create admin
node generate-secret.js  # Copy to .env
node create-admin.js

# 6. Run with PM2
pm2 start app.js --name streambro
pm2 save
pm2 startup
```

---

## 🔑 SSH Key Setup (Windows)

```powershell
# Generate key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# View public key
type C:\Users\YourName\.ssh\id_rsa.pub

# Copy to server
ssh root@your-vps-ip
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys  # Paste key
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## 👤 User Management

```bash
# Check all users
node check-users.js

# Create admin
node create-admin.js

# Reset password
node reset-password.js Username NewPassword123

# Activate user
node activate-user.js Username
```

---

## 🎬 Stream Management

```bash
# Check active streams
node check-streams.js

# Check schedules
node check-schedules.js

# Check stream status
node check-stream-status.js

# Fix stream status
node fix-stream-status.js
```

---

## 🔄 PM2 Commands

```bash
# Status
pm2 status

# Start
pm2 start streambro

# Stop
pm2 stop streambro

# Restart
pm2 restart streambro

# Reload (zero-downtime)
pm2 reload streambro

# Logs
pm2 logs streambro
pm2 logs streambro --lines 100
pm2 logs streambro --err

# Monitor
pm2 monit

# Delete
pm2 delete streambro

# Save config
pm2 save

# Auto-start on reboot
pm2 startup
```

---

## 🔄 Git Update

```bash
cd ~/streambrovps

# Pull latest
git pull origin main

# Install dependencies
npm install

# Restart
pm2 restart streambro
```

---

## 📊 System Monitoring

```bash
# RAM usage
free -h

# CPU & processes
htop

# Disk usage
df -h

# Network usage
iftop

# Check Node.js & FFmpeg processes
ps aux | grep -E 'node|ffmpeg'

# Check specific port
lsof -i :7575

# Network speed test
speedtest-cli
```

---

## 🔥 Firewall (UFW)

```bash
# Enable
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow StreamBro
ufw allow 7575/tcp

# Status
ufw status

# Delete rule
ufw delete allow 7575/tcp
```

---

## 🗄️ Database

```bash
# Location
ls -la db/streambro.db

# Backup
cp db/streambro.db db/streambro.db.backup

# Restore
cp db/streambro.db.backup db/streambro.db
```

---

## 🐛 Troubleshooting

### Cannot Login
```bash
pm2 logs streambro --err
node check-users.js
node reset-password.js Admin NewPassword123
pm2 restart streambro
```

### Port Already in Use
```bash
lsof -i :7575
kill -9 <PID>
# Or change PORT in .env
```

### FFmpeg Not Found
```bash
which ffmpeg
ffmpeg -version
apt install -y ffmpeg
# Update FFMPEG_PATH in .env
```

### High RAM
```bash
free -h
ps aux | grep ffmpeg
pm2 restart streambro
```

### Stream Not Starting
```bash
pm2 logs streambro --lines 100
# Check: RTMP URL, video file, FFmpeg errors
```

---

## 📁 Important Files

```
streambrovps/
├── app.js                    # Main application
├── .env                      # Configuration
├── db/streambro.db          # Database
├── public/uploads/videos/   # Video storage
├── logs/                    # Application logs
├── create-admin.js          # Create admin script
├── reset-password.js        # Reset password script
├── check-users.js           # Check users script
└── check-streams.js         # Check streams script
```

---

## 🌐 Access Points

```
Dashboard: http://your-vps-ip:7575
API: http://your-vps-ip:7575/api/*
```

---

## 📝 .env Template

```env
PORT=7575
NODE_ENV=production
SESSION_SECRET=your_generated_secret_here
DB_PATH=./db/streambro.db
FFMPEG_PATH=/usr/bin/ffmpeg
MAX_CONCURRENT_STREAMS_PER_USER=5
MAX_CONCURRENT_STREAMS_GLOBAL=20
PREFER_HARDWARE_ENCODING=true
HARDWARE_ENCODER_FALLBACK=true
```

---

## 🎯 Performance Tips

1. **Use Streamcopy Mode** - No re-encoding, low RAM
2. **Pre-encode Videos** - Proper bitrate & GOP
3. **Monitor Resources** - Use `pm2 monit`
4. **Limit Concurrent Streams** - Based on CPU/RAM
5. **Use Hardware Encoding** - If GPU available

---

## 📞 Quick Help

- **Logs**: `pm2 logs streambro`
- **Restart**: `pm2 restart streambro`
- **Monitor**: `pm2 monit` or `htop`
- **Docs**: See `INSTALLATION_GUIDE.md`

---

Made with ❤️ by StreamBro Team
