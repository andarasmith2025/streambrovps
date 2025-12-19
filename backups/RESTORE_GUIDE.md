# StreamBro Backup & Restore Guide

## 📦 Backup Contents

### 1. Git Bundle (Full Source Code)
- **File**: `streambro-full-backup-YYYYMMDD-HHMMSS.bundle`
- **Size**: ~850 KB
- **Contains**: All source code, commits, branches, and history

### 2. Database
- **File**: `vps-backup-YYYYMMDD/streambro.db`
- **Contains**: 
  - All users and credentials
  - Stream configurations
  - Schedules
  - Templates
  - Settings

### 3. Configuration Files
- **File**: `vps-backup-YYYYMMDD/.env`
- **Contains**: Environment variables (SESSION_SECRET, PORT, etc.)

---

## 🔄 How to Restore

### Option 1: Restore from Git Bundle (Recommended)

```bash
# 1. Clone from bundle
git clone streambro-full-backup-20251219-143513.bundle streambro-restored

# 2. Enter directory
cd streambro-restored

# 3. Add remote (optional, for future updates)
git remote add origin https://github.com/YOUR_USERNAME/streambrovps.git

# 4. Install dependencies
npm install

# 5. Copy database
cp ../vps-backup-20251219/streambro.db ./streambro.db

# 6. Copy .env
cp ../vps-backup-20251219/.env ./.env

# 7. Start server
npm start
```

### Option 2: Restore to Existing VPS

```bash
# 1. Upload bundle to VPS
scp streambro-full-backup-20251219-143513.bundle root@YOUR_VPS_IP:/root/

# 2. SSH to VPS
ssh root@YOUR_VPS_IP

# 3. Clone from bundle
cd /root
git clone streambro-full-backup-20251219-143513.bundle streambrovps-restored

# 4. Copy to production directory
cd streambrovps-restored
cp -r * /root/streambrovps/

# 5. Restart PM2
pm2 restart streambro
```

### Option 3: Restore Database Only

```bash
# 1. Stop server
pm2 stop streambro

# 2. Backup current database
cp streambro.db streambro.db.backup

# 3. Upload new database
scp vps-backup-20251219/streambro.db root@YOUR_VPS_IP:/root/streambrovps/

# 4. Start server
pm2 start streambro
```

---

## 📋 What's NOT Backed Up

- ❌ Video files (`public/uploads/videos/`)
- ❌ Thumbnail files (`public/uploads/thumbnails/`)
- ❌ Avatar files (`public/uploads/avatars/`)
- ❌ Log files (`logs/`)
- ❌ Temporary files (`temp/`)
- ❌ Node modules (`node_modules/`)

**Why?** These files are large and can be re-uploaded or regenerated.

---

## 🛡️ Backup Strategy

### Regular Backups (Recommended)

**Daily Database Backup:**
```bash
# Create backup script
nano ~/backup-streambro-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR

# Backup database
cp /root/streambrovps/streambro.db $BACKUP_DIR/streambro-$DATE.db

# Keep only last 7 days
find $BACKUP_DIR -name "streambro-*.db" -mtime +7 -delete

echo "Database backup completed: $DATE"
```

```bash
# Make executable
chmod +x ~/backup-streambro-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add this line:
```
0 2 * * * /root/backup-streambro-db.sh >> /root/backup.log 2>&1
```

**Weekly Git Bundle:**
```bash
# Create git bundle backup script
nano ~/backup-streambro-git.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="$HOME/backups"
mkdir -p $BACKUP_DIR

cd /root/streambrovps
git bundle create $BACKUP_DIR/streambro-git-$DATE.bundle --all

# Keep only last 4 weeks
find $BACKUP_DIR -name "streambro-git-*.bundle" -mtime +28 -delete

echo "Git backup completed: $DATE"
```

```bash
# Make executable
chmod +x ~/backup-streambro-git.sh

# Add to crontab (weekly on Sunday at 3 AM)
crontab -e
```

Add this line:
```
0 3 * * 0 /root/backup-streambro-git.sh >> /root/backup.log 2>&1
```

---

## 📥 Download Backups from VPS

```bash
# Download database
scp root@YOUR_VPS_IP:/root/backups/streambro-YYYYMMDD.db ./

# Download git bundle
scp root@YOUR_VPS_IP:/root/backups/streambro-git-YYYYMMDD.bundle ./

# Download all backups
scp -r root@YOUR_VPS_IP:/root/backups ./backups-from-vps
```

---

## 🚨 Emergency Recovery

If VPS crashes or expires:

1. **You have locally:**
   - ✅ Git bundle (full source code)
   - ✅ Database (all data)
   - ✅ .env (configuration)

2. **Get new VPS**

3. **Restore everything:**
   ```bash
   # Upload bundle
   scp streambro-full-backup-20251219-143513.bundle root@NEW_VPS_IP:/root/
   
   # SSH to new VPS
   ssh root@NEW_VPS_IP
   
   # Install dependencies
   apt update && apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs ffmpeg git
   npm install -g pm2
   
   # Clone from bundle
   cd /root
   git clone streambro-full-backup-20251219-143513.bundle streambrovps
   cd streambrovps
   
   # Install npm packages
   npm install --production
   
   # Upload database and .env
   # (from local machine)
   scp vps-backup-20251219/streambro.db root@NEW_VPS_IP:/root/streambrovps/
   scp vps-backup-20251219/.env root@NEW_VPS_IP:/root/streambrovps/
   
   # Start with PM2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Done!** Your StreamBro is back online.

---

## 📊 Backup File Sizes

| Item | Size | Frequency |
|------|------|-----------|
| Git Bundle | ~850 KB | Weekly |
| Database | ~500 KB - 5 MB | Daily |
| .env | ~1 KB | Once |
| **Total** | **~1-6 MB** | - |

**Storage needed for 1 month:**
- Daily DB: 7 days × 5 MB = 35 MB
- Weekly Git: 4 weeks × 850 KB = 3.4 MB
- **Total: ~40 MB**

Very efficient! No video files = minimal storage.

---

## ✅ Verification

After restore, verify:

```bash
# Check database
sqlite3 streambro.db "SELECT COUNT(*) FROM users;"

# Check git
git log --oneline -5

# Check server
pm2 status
pm2 logs streambro --lines 20

# Test website
curl http://localhost:7575
```

---

## 📝 Notes

- Git bundle contains **ALL commits and branches**
- Database contains **ALL user data and settings**
- Videos need to be re-uploaded manually
- YouTube OAuth tokens may need re-authorization
- SSL certificates need to be regenerated on new VPS

---

## 🔗 Related Documentation

- `DEPLOYMENT.md` - Full VPS deployment guide
- `INSTALLATION_GUIDE.md` - Local installation
- `USER_MANAGEMENT.md` - User management

---

**Last Updated**: December 19, 2025
**Backup Created**: 2025-12-19 14:35:13
