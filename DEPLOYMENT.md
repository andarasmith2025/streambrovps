# 🚀 Panduan Deploy StreamBro ke 8labs.id

## Persiapan

### 1. Akun 8labs
- Daftar di https://cloud.8labs.id/
- Login ke dashboard

### 2. Install 8labs CLI (Opsional)
Jika 8labs menyediakan CLI tool, install terlebih dahulu.

## Metode Deployment

### Metode 1: Deploy via Docker (Recommended)

#### Langkah 1: Push ke Git Repository
```bash
# Inisialisasi git (jika belum)
git init

# Add remote repository (jika belum)
git remote add origin https://github.com/Andara2025/streambrovps.git

# Commit semua perubahan
git add .
git commit -m "Ready for 8labs deployment"

# Push ke repository
git push -u origin main
```

#### Langkah 2: Setup di 8labs Dashboard

1. **Login ke 8labs Dashboard**
   - Buka https://cloud.8labs.id/
   - Login dengan akun Anda

2. **Buat Project Baru**
   - Klik "New Project" atau "Create Application"
   - Pilih "Deploy from Git" atau "Docker"

3. **Connect Repository**
   - Connect ke GitHub/GitLab repository Anda
   - Pilih repository `streambrovps`
   - Pilih branch `main`

4. **Konfigurasi Build**
   - Build Method: **Docker**
   - Dockerfile Path: `./Dockerfile`
   - Docker Compose (jika support): `./docker-compose.yml`

5. **Environment Variables**
   Tambahkan environment variables berikut:
   ```
   PORT=7575
   SESSION_SECRET=your_random_secret_here
   NODE_ENV=production
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=https://your-app-name.8labs.id/oauth2/callback
   ```
   
   ⚠️ **PENTING**: 
   - Ganti semua nilai dengan credentials Anda sendiri
   - Generate SESSION_SECRET dengan: `node generate-secret.js`
   - Ganti `your-app-name` dengan nama aplikasi Anda di 8labs

6. **Persistent Storage (Volume)**
   Tambahkan volume untuk data persistence:
   ```
   /app/db          -> Database SQLite
   /app/logs        -> Application logs
   /app/public/uploads -> Uploaded videos & thumbnails
   ```

7. **Port Configuration**
   - Internal Port: `7575`
   - External Port: `80` atau `443` (HTTPS)

8. **Deploy**
   - Klik "Deploy" atau "Create"
   - Tunggu proses build selesai (5-10 menit)

#### Langkah 3: Verifikasi Deployment

1. Akses URL yang diberikan 8labs (contoh: `https://streambro.8labs.id`)
2. Setup akun admin pertama kali
3. Test upload video dan streaming

---

### Metode 2: Deploy Manual via VPS 8labs

Jika 8labs menyediakan VPS/VM:

#### 1. Buat VM Instance
- OS: Ubuntu 22.04 LTS
- RAM: Minimal 2GB (recommended 4GB untuk streaming)
- Storage: Minimal 20GB
- CPU: Minimal 2 Core

#### 2. Connect ke Server
```bash
ssh root@your-server-ip
```

#### 3. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt install ffmpeg -y

# Install Git
sudo apt install git -y

# Install PM2
sudo npm install -g pm2
```

#### 4. Clone & Setup Project
```bash
# Clone repository
git clone https://github.com/Andara2025/streambrovps.git
cd streambrovps

# Install dependencies
npm install

# Copy environment file
cp .env.production .env

# Edit .env dengan nano/vim
nano .env
# Update GOOGLE_REDIRECT_URI dengan domain Anda
```

#### 5. Setup Firewall
```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow aplikasi port (jika direct access)
sudo ufw allow 7575

# Enable firewall
sudo ufw enable
```

#### 6. Jalankan Aplikasi
```bash
# Start dengan PM2
pm2 start app.js --name streambro

# Setup auto-restart
pm2 startup
pm2 save

# Monitor
pm2 logs streambro
```

#### 7. Setup Nginx Reverse Proxy (Opsional)
```bash
# Install Nginx
sudo apt install nginx -y

# Buat konfigurasi
sudo nano /etc/nginx/sites-available/streambro
```

Isi dengan:
```nginx
server {
    listen 80;
    server_name your-domain.com;

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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/

# Test konfigurasi
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 8. Setup SSL dengan Certbot (Opsional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### Build Failed
- Cek logs di 8labs dashboard
- Pastikan Dockerfile valid
- Pastikan semua dependencies ada di package.json

### Database Error
- Pastikan volume/persistent storage sudah di-mount
- Cek permission folder `db/`

### FFmpeg Not Found
- Pastikan Dockerfile sudah install FFmpeg
- Cek dengan: `docker exec -it container_name ffmpeg -version`

### Port Already in Use
- Pastikan PORT di environment variables sesuai
- Cek apakah ada konflik dengan service lain

### Session/Login Error
- Pastikan SESSION_SECRET tidak berubah
- Untuk production, pastikan akses via HTTPS
- Set `NODE_ENV=production`

---

## Monitoring & Maintenance

### Cek Logs
```bash
# Via PM2
pm2 logs streambro

# Via Docker
docker logs -f container_name

# Via 8labs Dashboard
Lihat di section "Logs" atau "Monitoring"
```

### Update Aplikasi
```bash
# Pull latest code
git pull origin main

# Rebuild (Docker)
docker-compose down
docker-compose up --build -d

# Restart (PM2)
pm2 restart streambro
```

### Backup Database
```bash
# Backup manual
cp db/streambro.db db/streambro.db.backup

# Backup otomatis (cron)
crontab -e
# Tambahkan:
# 0 2 * * * cp /path/to/streambro/db/streambro.db /path/to/backup/streambro-$(date +\%Y\%m\%d).db
```

---

## Kontak Support

- 8labs Support: https://cloud.8labs.id/support
- Repository Issues: https://github.com/Andara2025/streambrovps/issues
- Original StreamBro: https://github.com/bangtutorial/streambro

---

**Good luck with your deployment! 🚀**
