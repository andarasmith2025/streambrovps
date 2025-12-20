# StreamBro - Panduan Instalasi VPS

Panduan lengkap instalasi StreamBro di VPS untuk pemula.

## 📋 Persyaratan

### VPS Minimum:
- **RAM**: 2GB (recommended 4GB)
- **Storage**: 20GB
- **OS**: Ubuntu 20.04 / 22.04 LTS
- **CPU**: 2 cores

### Yang Perlu Disiapkan:
- ✅ VPS dengan akses SSH (root atau sudo)
- ✅ Domain (opsional, bisa pakai IP)
- ✅ Koneksi internet stabil

---

## 🚀 Langkah 1: Koneksi ke VPS

### Windows (PowerShell/CMD):
```bash
ssh root@IP_VPS_ANDA
```

### Mac/Linux (Terminal):
```bash
ssh root@IP_VPS_ANDA
```

Masukkan password saat diminta.

---

## 📦 Langkah 2: Install Dependencies

Jalankan perintah berikut satu per satu:

### Update sistem:
```bash
apt update && apt upgrade -y
```

### Install Node.js 20.x:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### Install Git:
```bash
apt install -y git
```

### Install FFmpeg:
```bash
apt install -y ffmpeg
```

### Install PM2 (Process Manager):
```bash
npm install -g pm2
```

### Verifikasi instalasi:
```bash
node --version    # Harus v20.x.x
npm --version     # Harus 10.x.x
git --version     # Harus 2.x.x
ffmpeg -version   # Harus 4.x.x atau lebih
pm2 --version     # Harus 5.x.x
```

---

## 📥 Langkah 3: Clone Repository

```bash
cd /root
git clone https://github.com/andarasmith2025/streambrovps.git
cd streambrovps
```

---

## ⚙️ Langkah 4: Konfigurasi Environment

### Copy file .env.example:
```bash
cp .env.example .env
```

### Edit file .env:
```bash
nano .env
```

### Isi konfigurasi:
```env
PORT=7575
SESSION_SECRET=GANTI_DENGAN_STRING_RANDOM_PANJANG

# Google OAuth (untuk YouTube API)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://domain-anda.com/oauth2/callback

# FFmpeg paths (biasanya sudah benar)
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Hardware encoding (opsional)
PREFER_HARDWARE_ENCODING=false
HARDWARE_ENCODER_FALLBACK=true
```

**Tips Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Simpan dengan: `Ctrl + O`, `Enter`, `Ctrl + X`

---

## 📦 Langkah 5: Install Dependencies

```bash
npm install
```

Tunggu sampai selesai (5-10 menit tergantung koneksi).

---

## 🗄️ Langkah 6: Setup Database

Database SQLite akan dibuat otomatis saat pertama kali aplikasi dijalankan.

### Buat folder database:
```bash
mkdir -p db
```

---

## 👤 Langkah 7: Buat Admin User

```bash
node create-admin.js
```

Ikuti instruksi untuk membuat user admin pertama.

---

## 🚀 Langkah 8: Jalankan Aplikasi

### Start dengan PM2:
```bash
pm2 start ecosystem.config.js
```

### Simpan konfigurasi PM2:
```bash
pm2 save
pm2 startup
```

Jalankan command yang muncul (biasanya dimulai dengan `sudo env PATH=...`)

### Cek status:
```bash
pm2 status
pm2 logs streambro
```

---

## 🌐 Langkah 9: Akses Aplikasi

### Jika menggunakan IP:
```
http://IP_VPS_ANDA:7575
```

### Jika menggunakan domain:
Setup reverse proxy dengan Nginx (lihat bagian berikutnya).

---

## 🔒 Langkah 10: Setup Nginx & SSL (Opsional)

### Install Nginx:
```bash
apt install -y nginx
```

### Buat konfigurasi Nginx:
```bash
nano /etc/nginx/sites-available/streambro
```

### Isi dengan:
```nginx
server {
    listen 80;
    server_name domain-anda.com;

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

### Aktifkan konfigurasi:
```bash
ln -s /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Install SSL dengan Certbot:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d domain-anda.com
```

Ikuti instruksi untuk setup SSL.

---

## 🔄 Perintah Berguna

### Restart aplikasi:
```bash
pm2 restart streambro
```

### Stop aplikasi:
```bash
pm2 stop streambro
```

### Lihat logs:
```bash
pm2 logs streambro
pm2 logs streambro --lines 100
```

### Update aplikasi:
```bash
cd /root/streambrovps
git pull
npm install
pm2 restart streambro
```

### Cek status sistem:
```bash
pm2 status
pm2 monit
```

---

## 🐛 Troubleshooting

### Port 7575 sudah digunakan:
```bash
# Cek proses yang menggunakan port
lsof -i :7575

# Kill proses
kill -9 PID_YANG_MUNCUL
```

### FFmpeg tidak ditemukan:
```bash
# Install ulang FFmpeg
apt install -y ffmpeg

# Cek lokasi FFmpeg
which ffmpeg
which ffprobe

# Update .env dengan path yang benar
```

### PM2 tidak start otomatis setelah reboot:
```bash
pm2 startup
pm2 save
```

### Database error:
```bash
# Backup database lama
cp db/streambro.db db/streambro.db.backup

# Hapus database (akan dibuat ulang)
rm db/streambro.db

# Restart aplikasi
pm2 restart streambro

# Buat admin baru
node create-admin.js
```

### Out of memory:
```bash
# Cek memory
free -h

# Tambah swap (jika RAM < 2GB)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 📚 Dokumentasi Lainnya

- **YouTube API Setup**: Lihat `YOUTUBE_API_SETUP_GUIDE.md`
- **SSL Setup**: Lihat `SSL_SETUP_GUIDE.md`
- **Deployment**: Lihat `DEPLOYMENT.md`
- **User Management**: Lihat `USER_MANAGEMENT.md`

---

## 🆘 Butuh Bantuan?

Jika mengalami masalah:
1. Cek logs: `pm2 logs streambro`
2. Cek status: `pm2 status`
3. Restart: `pm2 restart streambro`
4. Buka issue di GitHub repository

---

## ✅ Checklist Instalasi

- [ ] VPS sudah siap dengan Ubuntu 20.04/22.04
- [ ] Node.js 20.x terinstall
- [ ] Git terinstall
- [ ] FFmpeg terinstall
- [ ] PM2 terinstall
- [ ] Repository di-clone
- [ ] File .env dikonfigurasi
- [ ] Dependencies terinstall (`npm install`)
- [ ] Admin user dibuat
- [ ] Aplikasi berjalan dengan PM2
- [ ] PM2 startup dikonfigurasi
- [ ] Nginx & SSL setup (opsional)
- [ ] Aplikasi bisa diakses via browser

Selamat! StreamBro sudah siap digunakan! 🎉
