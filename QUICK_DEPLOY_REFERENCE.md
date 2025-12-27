# Quick Deploy Reference - StreamBro

Panduan cepat untuk deploy dan manage server dari PowerShell lokal.

---

## 📋 Server Info

- **Server:** UpCloud NYC
- **IP:** `85.9.195.103`
- **SSH Key:** `id_rsa_upcloud_nyc`
- **Path:** `/root/streambrovps`
- **PM2 App:** `streambro`

---

## 🚀 Deploy Commands (Copy-Paste Ready)

### 1. Upload File & Restart
```powershell
# Upload dashboard.ejs + restart
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc views/dashboard.ejs root@85.9.195.103:/root/streambrovps/views/ ; ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 restart streambro"

# Upload multiple files
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc views/*.ejs root@85.9.195.103:/root/streambrovps/views/
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc public/js/*.js root@85.9.195.103:/root/streambrovps/public/js/
```

### 2. Git Pull & Restart
```powershell
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && git pull && pm2 restart streambro"
```

### 3. Check Status
```powershell
# PM2 status
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 status"

# View logs
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --lines 50 --nostream"

# System resources
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "df -h && free -h && pm2 status"
```

### 4. Restart Services
```powershell
# Restart app
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 restart streambro"

# Restart all PM2 apps
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 restart all"

# Stop app
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 stop streambro"

# Start app
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 start streambro"
```

### 5. Database Backup
```powershell
# Backup on server
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && cp db/streambro.db db/backup_$(date +%Y%m%d_%H%M%S).db"

# Download backup to local
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103:/root/streambrovps/db/streambro.db ./backups/streambro_$(Get-Date -Format 'yyyyMMdd_HHmmss').db

# List backups
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "ls -lh /root/streambrovps/db/backup_*.db"
```

### 6. Login SSH
```powershell
# Interactive login
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103
```

---

## 🔧 Troubleshooting

### Permission Denied (publickey)
```powershell
# Cek SSH key ada atau tidak
ls $env:USERPROFILE\.ssh\

# Kalau tidak ada id_rsa_upcloud_nyc, generate dulu:
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc

# Copy ke server (masukkan password):
type $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc.pub | ssh root@85.9.195.103 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### PM2 Not Found
```powershell
# Install PM2
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "npm install -g pm2"
```

### App Not Running
```powershell
# Check PM2 status
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 status"

# Start app
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && pm2 start ecosystem.config.js"

# View error logs
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --err --lines 100"
```

### Disk Full
```powershell
# Check disk usage
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "df -h"

# Clean PM2 logs
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 flush"

# Clean old backups (keep last 7 days)
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "find /root/streambrovps/db/backup_*.db -mtime +7 -delete"
```

---

## 📝 Common Workflows

### Deploy Bug Fix
```powershell
# 1. Edit file locally (e.g., views/dashboard.ejs)
# 2. Upload & restart
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc views/dashboard.ejs root@85.9.195.103:/root/streambrovps/views/ ; ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 restart streambro"
# 3. Check logs
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --lines 20 --nostream"
```

### Deploy New Feature (Git)
```powershell
# 1. Commit & push to git
git add .
git commit -m "Add new feature"
git push

# 2. Pull on server & restart
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && git pull && pm2 restart streambro"

# 3. Verify
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 status && pm2 logs streambro --lines 20 --nostream"
```

### Emergency Rollback
```powershell
# 1. Restore from backup
scp -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc ./backups/streambro_backup.db root@85.9.195.103:/root/streambrovps/db/streambro.db

# 2. Git rollback (if needed)
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && git reset --hard HEAD~1"

# 3. Restart
ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 restart streambro"
```

---

## 💡 Tips

1. **Alias untuk PowerShell** - Tambahkan ke `$PROFILE`:
```powershell
# Edit profile
notepad $PROFILE

# Tambahkan alias:
function ssh-streambro { ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 }
function deploy-streambro { ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "cd /root/streambrovps && git pull && pm2 restart streambro" }
function logs-streambro { ssh -i $env:USERPROFILE\.ssh\id_rsa_upcloud_nyc root@85.9.195.103 "pm2 logs streambro --lines 50 --nostream" }

# Reload profile
. $PROFILE

# Sekarang bisa pakai:
ssh-streambro
deploy-streambro
logs-streambro
```

2. **Backup Otomatis** - Setup cron job di server:
```bash
# Login ke server
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103

# Edit crontab
crontab -e

# Tambahkan (backup setiap hari jam 3 pagi):
0 3 * * * cd /root/streambrovps && cp db/streambro.db db/backup_$(date +\%Y\%m\%d).db

# Cleanup old backups (keep 30 days):
0 4 * * * find /root/streambrovps/db/backup_*.db -mtime +30 -delete
```

3. **Monitor Resources** - Install htop:
```bash
ssh -i ~/.ssh/id_rsa_upcloud_nyc root@85.9.195.103 "apt install -y htop"
```

---

## 🔗 Related Docs

- [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md) - Full deployment guide
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Initial setup
- [SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md) - SSL certificate setup
