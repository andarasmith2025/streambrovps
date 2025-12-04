# 🚀 Deploy StreamBro di Oracle Cloud (Always Free)

Oracle Cloud menyediakan **2 VM gratis SELAMANYA** dengan spesifikasi yang cukup untuk menjalankan StreamBro.

## 📋 Spesifikasi Always Free

- **2 VM Instances** (AMD atau ARM)
- **1 GB RAM** per VM
- **1 Core CPU** per VM (ARM bisa sampai 4 core)
- **100 GB Storage** total
- **10 TB Bandwidth** per bulan
- **Gratis SELAMANYA** (tidak ada expired)

---

## 🎯 Langkah-Langkah Deployment

### 1. Daftar Oracle Cloud

1. Buka https://www.oracle.com/cloud/free/
2. Klik **"Start for free"**
3. Isi data:
   - Email
   - Negara (pilih Indonesia)
   - Nama lengkap
4. Verifikasi email
5. Isi informasi billing:
   - **PENTING**: Butuh kartu kredit untuk verifikasi (tidak akan dicharge)
   - Atau gunakan virtual credit card (Jenius, dll)
6. Tunggu approval (biasanya 5-10 menit)

### 2. Buat VM Instance

1. **Login ke Oracle Cloud Console**
   - https://cloud.oracle.com/

2. **Buat Compute Instance**
   - Klik **"Create a VM Instance"** atau menu **Compute → Instances → Create Instance**

3. **Konfigurasi Instance**
   - **Name**: `streambro-server`
   - **Compartment**: Pilih root compartment
   - **Placement**: Pilih availability domain yang tersedia
   
4. **Image and Shape**
   - **Image**: Ubuntu 22.04 (Canonical)
   - **Shape**: 
     - VM.Standard.E2.1.Micro (AMD) - 1 Core, 1GB RAM
     - Atau VM.Standard.A1.Flex (ARM) - bisa sampai 4 Core, 24GB RAM (lebih bagus!)

5. **Networking**
   - **VCN**: Buat baru atau pilih existing
   - **Subnet**: Public subnet
   - **Assign public IP**: ✅ **Centang ini!**

6. **Add SSH Keys**
   - **Generate SSH key pair**: Download private key (.key file)
   - Atau upload public key Anda sendiri
   - **PENTING**: Simpan private key dengan aman!

7. **Boot Volume**
   - Default 50GB sudah cukup
   - Bisa ditambah sampai 100GB (gratis)

8. **Klik "Create"**
   - Tunggu 2-3 menit sampai status **"Running"**
   - Catat **Public IP Address**

### 3. Konfigurasi Firewall Oracle Cloud

1. **Buka Instance Details**
   - Klik instance yang baru dibuat

2. **Buka Security List**
   - Klik **Subnet** → **Security Lists** → **Default Security List**

3. **Tambah Ingress Rules**
   - Klik **"Add Ingress Rules"**
   
   **Rule 1: SSH**
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port: `22`
   - Description: SSH Access
   
   **Rule 2: HTTP**
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port: `80`
   - Description: HTTP
   
   **Rule 3: HTTPS**
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port: `443`
   - Description: HTTPS
   
   **Rule 4: StreamBro App**
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port: `7575`
   - Description: StreamBro Application

4. **Klik "Add Ingress Rules"**

### 4. Connect ke Server via SSH

**Windows (PowerShell):**
```powershell
# Ganti path ke private key dan IP address Anda
ssh -i C:\path\to\private-key.key ubuntu@YOUR_PUBLIC_IP
```

**Linux/Mac:**
```bash
# Set permission private key
chmod 400 ~/path/to/private-key.key

# Connect
ssh -i ~/path/to/private-key.key ubuntu@YOUR_PUBLIC_IP
```

**Atau gunakan PuTTY (Windows):**
1. Download PuTTY: https://www.putty.org/
2. Convert .key ke .ppk dengan PuTTYgen
3. Connect dengan PuTTY menggunakan .ppk file

### 5. Setup Server

Setelah connect via SSH:

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi
node --version
npm --version

# Install FFmpeg
sudo apt install ffmpeg -y

# Verifikasi
ffmpeg -version

# Install Git
sudo apt install git -y

# Install PM2
sudo npm install -g pm2
```

### 6. Clone dan Setup StreamBro

```bash
# Clone repository
git clone https://github.com/Andara2025/streambrovps.git
cd streambrovps

# Install dependencies
npm install

# Install ffprobe (penting!)
npm install @ffprobe-installer/ffprobe

# Generate secret key
node generate-secret.js

# Copy dan edit environment file
cp .env.example .env
nano .env
```

**Edit .env:**
```env
PORT=7575
SESSION_SECRET=hasil_dari_generate_secret_js
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://YOUR_PUBLIC_IP:7575/oauth2/callback
```

Simpan dengan **Ctrl+X**, tekan **Y**, lalu **Enter**.

### 7. Konfigurasi Firewall Ubuntu

```bash
# PENTING: Buka SSH dulu!
sudo ufw allow ssh
sudo ufw allow 22

# Buka port aplikasi
sudo ufw allow 7575

# Buka HTTP/HTTPS (opsional, untuk Nginx nanti)
sudo ufw allow 80
sudo ufw allow 443

# Verifikasi rules
sudo ufw status verbose

# Enable firewall
sudo ufw enable

# Cek status
sudo ufw status
```

### 8. Jalankan Aplikasi

```bash
# Start dengan PM2
pm2 start app.js --name streambro

# Setup auto-restart saat server reboot
pm2 startup
# Jalankan command yang muncul (biasanya dengan sudo)

# Save konfigurasi PM2
pm2 save

# Monitor aplikasi
pm2 logs streambro
```

### 9. Akses Aplikasi

Buka browser:
```
http://YOUR_PUBLIC_IP:7575
```

**Setup akun admin pertama:**
1. Klik **"Register"**
2. Buat username dan password
3. Login
4. Akun pertama otomatis jadi admin

---

## 🌐 Setup Domain (Opsional)

### 1. Install Nginx

```bash
sudo apt install nginx -y
```

### 2. Konfigurasi Nginx

```bash
sudo nano /etc/nginx/sites-available/streambro
```

**Isi dengan:**
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
        
        # Timeout untuk upload file besar
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/streambro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Setup SSL dengan Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

**Update .env:**
```env
NODE_ENV=production
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth2/callback
```

**Restart aplikasi:**
```bash
pm2 restart streambro
```

---

## 🔧 Maintenance & Monitoring

### Perintah PM2 Berguna

```bash
# Lihat status
pm2 status

# Lihat logs
pm2 logs streambro

# Restart aplikasi
pm2 restart streambro

# Stop aplikasi
pm2 stop streambro

# Monitor resource
pm2 monit

# Lihat info detail
pm2 info streambro
```

### Update Aplikasi

```bash
cd streambrovps

# Pull latest code
git pull origin main

# Install dependencies baru (jika ada)
npm install

# Restart aplikasi
pm2 restart streambro
```

### Backup Database

```bash
# Backup manual
cp db/streamflow.db db/streamflow.db.backup-$(date +%Y%m%d)

# Backup otomatis dengan cron
crontab -e

# Tambahkan (backup setiap hari jam 2 pagi):
0 2 * * * cp /home/ubuntu/streambrovps/db/streamflow.db /home/ubuntu/backups/streamflow-$(date +\%Y\%m\%d).db
```

### Monitor Resource

```bash
# CPU & Memory
htop

# Disk space
df -h

# Network
sudo iftop
```

---

## 🐛 Troubleshooting

### Instance Tidak Bisa Diakses

1. **Cek Security List** di Oracle Cloud Console
2. **Cek UFW firewall** di Ubuntu: `sudo ufw status`
3. **Cek aplikasi running**: `pm2 status`
4. **Cek logs**: `pm2 logs streambro`

### Out of Memory

Oracle Cloud Free Tier hanya 1GB RAM. Kalau aplikasi crash:

```bash
# Tambah swap memory
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Upload File Gagal

```bash
# Cek disk space
df -h

# Cek permission
ls -la public/uploads/
chmod -R 755 public/uploads/
```

### FFmpeg Error

```bash
# Install ulang FFmpeg
sudo apt install --reinstall ffmpeg -y

# Cek versi
ffmpeg -version
```

---

## 💰 Upgrade ke Paid (Opsional)

Kalau butuh resource lebih:

**VM.Standard.E4.Flex:**
- 1 Core, 16GB RAM: ~$15/bulan
- 2 Core, 32GB RAM: ~$30/bulan

**VM.Standard.A1.Flex (ARM - Lebih murah):**
- 4 Core, 24GB RAM: ~$6/bulan
- 8 Core, 48GB RAM: ~$12/bulan

---

## 📞 Support

- **Oracle Cloud Docs**: https://docs.oracle.com/en-us/iaas/
- **Repository Issues**: https://github.com/Andara2025/streambrovps/issues
- **Original StreamBro**: https://github.com/bangtutorial/streambro

---

**Selamat streaming! 🎉**

VPS Oracle Cloud Always Free ini cocok untuk:
- ✅ Production 24/7
- ✅ Streaming ke multiple platform
- ✅ Gratis selamanya
- ✅ Performa stabil
