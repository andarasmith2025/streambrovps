# StreamBro Git Backup - Restore Instructions

## Backup Info
- **Date**: 2025-12-19
- **Type**: Full Git Bundle (all branches, all commits)
- **Size**: ~857 KB
- **File**: `streambro-full-backup-20251219-143513.bundle`

---

## What's Included

✅ **All source code** (complete git history)
✅ **All branches** (main, backup branches, etc.)
✅ **All commits** (full history)
✅ **All tags**

❌ **NOT included**:
- Video files (`public/uploads/videos/`)
- Database file (`streambro.db`)
- Environment variables (`.env`)
- Node modules (`node_modules/`)
- Logs (`logs/`)

---

## How to Restore

### Option 1: Clone from Bundle (Fresh Start)

```bash
# Create new directory
mkdir streambro-restored
cd streambro-restored

# Clone from bundle
git clone /path/to/streambro-full-backup-20251219-143513.bundle .

# Verify
git log --oneline -10
git branch -a
```

### Option 2: Add as Remote (Existing Repo)

```bash
# Go to your existing repo
cd /path/to/streambro

# Add bundle as remote
git remote add backup /path/to/streambro-full-backup-20251219-143513.bundle

# Fetch from backup
git fetch backup

# List all branches from backup
git branch -r | grep backup

# Checkout specific branch from backup
git checkout -b restored-main backup/main
```

### Option 3: Restore Specific File

```bash
# Extract specific file from bundle
git bundle unbundle streambro-full-backup-20251219-143513.bundle

# Or use git show
git --git-dir=streambro-full-backup-20251219-143513.bundle show main:app.js > app.js
```

---

## After Restore - Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
nano .env
```

Required variables:
```env
PORT=7575
SESSION_SECRET=your-random-secret-here
NODE_ENV=production
```

### 3. Create Required Directories

```bash
mkdir -p public/uploads/videos
mkdir -p public/uploads/thumbnails
mkdir -p public/uploads/avatars
mkdir -p logs
mkdir -p temp
```

### 4. Initialize Database

Database will be created automatically on first run.

### 5. Start Application

```bash
# Development
npm start

# Production with PM2
pm2 start ecosystem.config.js
```

---

## Verify Backup Integrity

```bash
# Verify bundle is valid
git bundle verify streambro-full-backup-20251219-143513.bundle

# List contents
git bundle list-heads streambro-full-backup-20251219-143513.bundle
```

---

## Important Commits in This Backup

```
42e866d - fix: Add null check for newStreamForm in selectYouTubeStreamKey
520b381 - feat: Add YouTube API testing and verification tools
e0974b9 - feat: Add YouTube API testing and verification tools
b7f4218 - feat: Implement YouTube API additional settings (audience, thumbnail, synthetic content)
f65ba9e - Fix YouTube broadcast transition - Add testing state before live
```

---

## Backup Strategy Recommendation

### Regular Backups

Create git bundle backup:
```bash
# Weekly backup
git bundle create backup-$(date +%Y%m%d).bundle --all
```

### Database Backup (Separate)

```bash
# Backup database
cp streambro.db backups/streambro-$(date +%Y%m%d).db

# Or with compression
tar -czf backups/streambro-$(date +%Y%m%d).tar.gz streambro.db
```

### Full Backup (Code + Data)

```bash
# Exclude large files
tar -czf streambro-full-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='public/uploads/videos' \
  --exclude='logs' \
  --exclude='temp' \
  .
```

---

## Storage Recommendations

1. **Local Storage**: Keep on external drive
2. **Cloud Storage**: Upload to Google Drive, Dropbox, etc.
3. **Git Remote**: Push to GitHub/GitLab (private repo)
4. **Multiple Copies**: 3-2-1 rule (3 copies, 2 different media, 1 offsite)

---

## Restore to New VPS

### Quick Deploy Script

```bash
#!/bin/bash

# 1. Clone from bundle
git clone /path/to/streambro-full-backup-20251219-143513.bundle streambro
cd streambro

# 2. Install dependencies
npm install --production

# 3. Setup environment
cp .env.example .env
# Edit .env with your settings

# 4. Create directories
mkdir -p public/uploads/{videos,thumbnails,avatars} logs temp

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

---

## Troubleshooting

### Bundle Verification Failed

```bash
# Check file integrity
md5sum streambro-full-backup-20251219-143513.bundle

# Try to list heads
git bundle list-heads streambro-full-backup-20251219-143513.bundle
```

### Missing Commits

```bash
# Check what's in the bundle
git bundle unbundle streambro-full-backup-20251219-143513.bundle | head -20
```

### Corrupted Bundle

If bundle is corrupted, use the backup branch:
```bash
git checkout backup-before-testing-20251219-142145
```

---

## Contact & Support

For issues or questions about this backup, refer to:
- `DEPLOYMENT.md` - VPS deployment guide
- `INSTALLATION_GUIDE.md` - Local installation
- `README.md` - General documentation

---

**Backup Created**: 2025-12-19 14:35:13
**Git Commit**: 42e866d
**Branch**: main
**Total Size**: 857 KB (code only)
