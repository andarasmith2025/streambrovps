# 🚀 Deploy StreamBro di GitHub Codespaces

GitHub Codespaces adalah environment development berbasis cloud yang bisa digunakan sebagai VPS trial gratis untuk testing StreamBro.

## 📋 Keuntungan GitHub Codespaces

- ✅ **Gratis 60 jam/bulan** untuk akun GitHub gratis
- ✅ **120 jam/bulan** untuk GitHub Pro
- ✅ 2-core CPU, 8GB RAM, 32GB storage
- ✅ Akses via browser atau VS Code
- ✅ Setup cepat tanpa konfigurasi server
- ✅ Port forwarding otomatis

## ⚠️ Keterbatasan

- ❌ URL berubah setiap kali membuat Codespace baru
- ❌ Tidak cocok untuk production (hanya testing/development)
- ❌ Data hilang jika Codespace dihapus
- ❌ Perlu update Google OAuth redirect URI setiap kali URL berubah

---

## 🎯 Langkah-Langkah Deployment

### 1. Persiapan Repository

Pastikan repository Anda sudah di GitHub:
```
https://github.com/Andara2025/streambrovps.git
```

### 2. Buat GitHub Codespace

1. Buka repository di GitHub: https://github.com/Andara2025/streambrovps
2. Klik tombol hijau **"Code"**
3. Pilih tab **"Codespaces"**
4. Klik **"Create codespace on main"**
5. Tunggu beberapa menit sampai environment siap

### 3. Setup Aplikasi di Codespace

Setelah Codespace terbuka, jalankan di terminal:

```bash
# Install dependencies
npm install

# Generate secret key untuk session
node generate-secret.js
```

### 4. Konfigurasi Environment

Buat file `.env`:
```bash
cp .env.example .env
```

Edit file `.env`:
```bash
nano .env
```

Isi dengan konfigurasi berikut:
```env
PORT=7575
SESSION_SECRET=hasil_dari_generate_secret_js
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-codespace-url.github.dev/oauth2/callback
```

**Cara mendapatkan Codespace URL:**
- Setelah menjalankan aplikasi, lihat tab **"PORTS"** di VS Code
- Copy URL yang muncul untuk port 7575
- Format: `https://username-repo-xxxxx.github.dev`

### 5. Setup Google OAuth (Opsional)

Jika ingin menggunakan Google Drive integration:

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih existing project
3. Enable **Google Drive API**
4. Buat **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-codespace-url.github.dev/oauth2/callback`
5. Copy **Client ID** dan **Client Secret** ke file `.env`

### 6. Jalankan Aplikasi

```bash
npm run dev
```

### 7. Akses Aplikasi

1. Setelah aplikasi running, lihat notifikasi **"Open in Browser"**
2. Atau buka tab **"PORTS"** di VS Code
3. Klik icon globe di sebelah port 7575
4. Aplikasi akan terbuka di browser

URL format: `https://username-streambrovps-xxxxx.github.dev`

### 8. Setup Akun Admin

1. Buka aplikasi di browser
2. Klik **"Register"** untuk membuat akun pertama
3. Login dengan akun yang baru dibuat
4. Akun pertama otomatis menjadi admin

---

## 🔧 Tips & Tricks

### Membuat Port Public

Secara default, port di Codespaces bersifat private. Untuk testing dengan teman:

1. Buka tab **"PORTS"**
2. Klik kanan pada port 7575
3. Pilih **"Port Visibility"** → **"Public"**

### Menjaga Codespace Tetap Aktif

Codespace akan otomatis sleep setelah 30 menit tidak aktif:
- Buka tab browser secara berkala
- Atau set timeout lebih lama di Settings

### Menyimpan Data

Data akan hilang jika Codespace dihapus. Untuk backup:

```bash
# Backup database
cp db/streambro.db ~/backup-streambro.db

# Commit ke repository (jangan commit .env!)
git add .
git commit -m "Backup data"
git push
```

### Update Google OAuth Redirect URI

Setiap kali membuat Codespace baru, URL berubah:

1. Dapatkan URL baru dari tab PORTS
2. Update di Google Cloud Console → OAuth 2.0 Client IDs
3. Update di file `.env`
4. Restart aplikasi: `Ctrl+C` lalu `npm run dev`

---

## 🐛 Troubleshooting

### Port 7575 Tidak Muncul

```bash
# Cek apakah aplikasi running
ps aux | grep node

# Restart aplikasi
npm run dev
```

### Permission Error

```bash
# Fix permission untuk upload folder
chmod -R 755 public/uploads/
```

### Database Error

```bash
# Reset database (PERINGATAN: menghapus semua data)
rm db/*.db

# Restart aplikasi
npm run dev
```

### Session/Login Error

- Pastikan `NODE_ENV=development` di file `.env`
- Pastikan `SESSION_SECRET` sudah di-generate
- Clear browser cookies dan coba lagi

### FFmpeg Not Found

FFmpeg sudah terinstall di Codespaces. Jika error:

```bash
# Cek FFmpeg
ffmpeg -version

# Jika belum ada, install
sudo apt update
sudo apt install ffmpeg -y
```

---

## 📊 Monitoring Resource

### Cek CPU & Memory Usage

```bash
# Monitor real-time
htop

# Atau
top
```

### Cek Disk Space

```bash
df -h
```

### Cek Logs Aplikasi

```bash
# Lihat logs
tail -f logs/app.log

# Atau lihat di console terminal
```

---

## 🔄 Update Aplikasi

Jika ada update di repository:

```bash
# Pull latest changes
git pull origin main

# Install dependencies baru (jika ada)
npm install

# Restart aplikasi
# Tekan Ctrl+C untuk stop, lalu
npm run dev
```

---

## 💰 Upgrade ke Production VPS

Jika sudah siap untuk production, migrate ke VPS proper:

### Rekomendasi VPS Gratis/Murah:

1. **Oracle Cloud Always Free**
   - 2 VM gratis selamanya
   - 1GB RAM, 1 Core CPU
   - Tutorial: Lihat `DEPLOYMENT.md`

2. **Google Cloud Platform**
   - $300 credit untuk 90 hari
   - e2-micro gratis selamanya (dengan batasan)

3. **AWS Free Tier**
   - t2.micro gratis 12 bulan
   - 750 jam/bulan

4. **Contabo**
   - Mulai dari €4.99/bulan
   - 4GB RAM, 2 Core CPU

### Export Data dari Codespace

```bash
# Backup database
# Download via browser: Klik kanan file db/streamflow.db → Download

# Atau gunakan GitHub CLI untuk commit dan push
git add db/streamflow.db
git commit -m "Backup database"
git push
```

---

## 📞 Support

- **Repository Issues**: https://github.com/Andara2025/streambrovps/issues
- **Original StreamBro**: https://github.com/bangtutorial/streambro
- **GitHub Codespaces Docs**: https://docs.github.com/en/codespaces

---

**Selamat mencoba! 🎉**

Jika ada pertanyaan atau masalah, silakan buat issue di repository.
