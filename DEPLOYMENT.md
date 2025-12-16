# StreamBro - VPS Deployment Guide

Complete guide for deploying StreamBro to a fresh VPS.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [VPS Requirements](#vps-requirements)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Domain & SSL Setup](#domain--ssl-setup)
5. [YouTube OAuth Setup](#youtube-oauth-setup)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need:
- ✅ VPS with Ubuntu 20.04+ or Debian 11+
- ✅ Domain name (optional but recommended)
- ✅ SSH access to VPS
- ✅ Basic Linux command knowledge

### Recommended VPS Specs:
```
Minimum:
- CPU: 2 cores
- RAM: 2 GB
- Storage: 20 GB SSD
- Bandwidth: 1 TB/month

Recommended:
- CPU: 4 cores
- RAM: 4 GB
- Storage: 50 GB SSD
- Bandwidth: 2 TB/month
```

---

## VPS Requirements

### Operating System:
- Ubuntu 20.04 LTS or newer
- Debian 11 or newer
- CentOS 8+ (with adjustments)

### Ports to Open:
```
22    - SSH
80    - HTTP (for SSL certificate)
443   - HTTPS (production)
7575  - StreamBro (development)
```

---

## Step-by-Step Deployment

### 1. Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Node.js 18+

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

### 4. Install FFmpeg

```bash
apt install -y ffmpeg

# Verify installation
ffmpeg -version
```

### 5. Install PM2 (Process Manager)

```bash
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you
```

### 6. Install Git

```bash
apt install -y git
```

### 7. Clone StreamBro Repository

```bash
cd /root
git clone https://github.com/YOUR_USERNAME/streambrovps.git
cd streambrovps
```

### 8. Install Dependencies

```bash
npm install --production
```

### 9. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

**Required variables:**
```env
PORT=7575
SESSION_SECRET=your-random-secret-here-change-this
NODE_ENV=production

# Optional: YouTube OAuth (setup later)
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
# GOOGLE_REDIRECT_URI=
```

**Generate secure SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 10. Create Required Directories

```bash
mkdir -p public/uploads/videos
mkdir -p public/uploads/thumbnails
mkdir -p public/uploads/avatars
mkdir -p logs
mkdir -p temp
```

### 11. Set Permissions

```bash
chmod -R 755 public/uploads
chmod -R 755 logs
chmod -R 755 temp
```

### 12. Start StreamBro with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
```

### 13. Verify Installation

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs streambro --lines 50

# Test access
curl http://localhost:7575
```

### 14. Configure Firewall

```bash
# Install UFW (if not installed)
apt install -y ufw

# Allow SSH (IMPORTANT!)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow StreamBro port (development)
ufw allow 7575/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## Domain & SSL Setup

### 1. Point Domain to VPS

In your domain registrar (Namecheap, GoDaddy, etc.):

**Add DNS Records:**
```
Type: A Record
Host: @
Value: YOUR_VPS_IP
TTL: Automatic

Type: A Record
Host: streambro
Value: YOUR_VPS_IP
TTL: Automatic

Type: CNAME Record
Host: www
Value: yourdomain.com
TTL: Automatic
```

**Wait 30-60 minutes for DNS propagation.**

### 2. Install Nginx

```bash
apt install -y nginx
```

### 3. Install Certbot (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
```

### 4. Get SSL Certificate

```bash
# Stop Nginx temporarily
systemctl stop nginx

# Get certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d streambro.yourdomain.com

# Start Nginx
systemctl start nginx
```

### 5. Configure Nginx

```bash
nano /etc/nginx/sites-available/streambro
```

**Paste this configuration:**
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com streambro.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Main Domain
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to StreamBro
    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    # Increase upload size for videos
    client_max_body_size 10G;
    client_body_timeout 600s;
}

# HTTPS - Subdomain
server {
    listen 443 ssl http2;
    server_name streambro.yourdomain.com;
    
    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to StreamBro
    location / {
        proxy_pass http://localhost:7575;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
    
    # Increase upload size for videos
    client_max_body_size 10G;
    client_body_timeout 600s;
}
```

**Enable site:**
```bash
# Create symlink
ln -s /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 6. Setup Auto-Renewal for SSL

```bash
# Test renewal
certbot renew --dry-run

# Crontab is automatically setup by certbot
```

---

## YouTube OAuth Setup

### 1. Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Create new project: "StreamBro"
3. Enable APIs:
   - YouTube Data API v3
   - YouTube Live Streaming API

### 2. Create OAuth 2.0 Credentials

1. Go to: **APIs & Services** → **Credentials**
2. Click: **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "StreamBro Production"
5. Authorized redirect URIs:
   ```
   https://yourdomain.com/oauth2/callback
   https://streambro.yourdomain.com/oauth2/callback
   ```
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

### 3. Add to Environment Variables

```bash
nano /root/streambrovps/.env
```

Add these lines:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://streambro.yourdomain.com/oauth2/callback
```

### 4. Restart StreamBro

```bash
pm2 restart streambro
```

---

## Post-Deployment

### 1. Create Admin Account

Access: `https://streambro.yourdomain.com`

First user will be admin automatically.

### 2. Test Features

- ✅ Login/Logout
- ✅ Upload video
- ✅ Create stream
- ✅ Schedule stream
- ✅ Connect YouTube (if OAuth setup)
- ✅ Start/Stop stream

### 3. Monitor Logs

```bash
# Real-time logs
pm2 logs streambro

# Last 100 lines
pm2 logs streambro --lines 100

# Error logs only
pm2 logs streambro --err
```

### 4. Setup Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 5. Backup Strategy

**Database backup:**
```bash
# Create backup script
nano /root/backup-streambro.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp /root/streambrovps/db/streambro.db $BACKUP_DIR/streambro_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /root/streambrovps/public/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "streambro_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /root/backup-streambro.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add this line:
```
0 2 * * * /root/backup-streambro.sh >> /root/backup.log 2>&1
```

---

## Troubleshooting

### StreamBro Not Starting

```bash
# Check logs
pm2 logs streambro --lines 50

# Check if port is in use
netstat -tulpn | grep 7575

# Restart
pm2 restart streambro

# Full restart
pm2 delete streambro
pm2 start ecosystem.config.js
```

### SSL Certificate Issues

```bash
# Check certificate
certbot certificates

# Renew manually
certbot renew --force-renewal

# Check Nginx config
nginx -t
```

### Domain Not Resolving

```bash
# Check DNS
nslookup yourdomain.com
dig yourdomain.com

# Flush DNS cache (on your computer)
# Windows: ipconfig /flushdns
# Mac: sudo dscacheutil -flushcache
# Linux: sudo systemd-resolve --flush-caches
```

### Upload Issues

```bash
# Check permissions
ls -la /root/streambrovps/public/uploads

# Fix permissions
chmod -R 755 /root/streambrovps/public/uploads
chown -R root:root /root/streambrovps/public/uploads
```

### High CPU/Memory Usage

```bash
# Check resource usage
pm2 monit

# Check active streams
pm2 logs streambro | grep "active"

# Restart if needed
pm2 restart streambro
```

---

## Maintenance

### Update StreamBro

```bash
cd /root/streambrovps
git pull origin main
npm install --production
pm2 restart streambro
```

### Update System

```bash
apt update && apt upgrade -y
pm2 update
```

### Clean Up

```bash
# Clean old logs
pm2 flush

# Clean temp files
rm -rf /root/streambrovps/temp/*

# Clean old uploads (optional)
# Be careful with this!
```

---

## Security Recommendations

### 1. Change SSH Port

```bash
nano /etc/ssh/sshd_config
```

Change:
```
Port 22
```

To:
```
Port 2222  # Or any port you prefer
```

Restart SSH:
```bash
systemctl restart sshd
```

Update firewall:
```bash
ufw allow 2222/tcp
ufw delete allow 22/tcp
```

### 2. Disable Root Login

```bash
# Create new user
adduser admin
usermod -aG sudo admin

# Disable root login
nano /etc/ssh/sshd_config
```

Change:
```
PermitRootLogin yes
```

To:
```
PermitRootLogin no
```

### 3. Setup Fail2Ban

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. Regular Updates

```bash
# Setup automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## Performance Optimization

### 1. Enable Nginx Caching

Add to Nginx config:
```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Enable Gzip Compression

Add to Nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
```

### 3. Optimize PM2

```bash
# Set max memory restart
pm2 start ecosystem.config.js --max-memory-restart 1G

# Save configuration
pm2 save
```

---

## Support

### Documentation:
- Installation Guide: `INSTALLATION_GUIDE.md`
- Quick Reference: `QUICK_REFERENCE.md`
- User Management: `USER_MANAGEMENT.md`
- YouTube API: `YOUTUBE_API_ANALYSIS.md`

### Logs Location:
```
PM2 Logs:     ~/.pm2/logs/
App Logs:     /root/streambrovps/logs/
Nginx Logs:   /var/log/nginx/
```

### Useful Commands:
```bash
# PM2
pm2 status
pm2 logs streambro
pm2 restart streambro
pm2 monit

# Nginx
nginx -t
systemctl status nginx
systemctl restart nginx

# System
htop
df -h
free -h
```

---

## Conclusion

Your StreamBro instance should now be fully deployed and running!

**Access URLs:**
- Main: `https://yourdomain.com`
- Subdomain: `https://streambro.yourdomain.com`

**Next Steps:**
1. Create admin account
2. Upload videos
3. Test streaming
4. Setup YouTube OAuth (optional)
5. Invite users

**Happy Streaming!** 🚀
