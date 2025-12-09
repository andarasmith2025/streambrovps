# Cara Menjalankan StreamBro Server

## ⚠️ PENTING: Stream Jadi Offline Saat Browser Ditutup?

Jika stream Anda jadi offline saat browser ditutup, kemungkinan besar **Node.js server ikut mati**. Ini terjadi karena:

1. **Terminal/Command Prompt ditutup** - Node.js server akan mati
2. **Server tidak berjalan di background** - Process terikat dengan terminal

---

## 🚀 Solusi: Jalankan Server di Background

### **Opsi 1: Menggunakan PM2 (RECOMMENDED untuk Production)**

PM2 adalah process manager yang akan menjaga server tetap berjalan bahkan setelah terminal ditutup atau server restart.

#### Install PM2:
```bash
npm install -g pm2
```

#### Jalankan Server dengan PM2:
```bash
# Start server
npm run pm2:start

# atau langsung:
pm2 start ecosystem.config.js
```

#### Perintah PM2 Lainnya:
```bash
# Lihat status
npm run pm2:status
# atau: pm2 status

# Lihat logs
npm run pm2:logs
# atau: pm2 logs streambro

# Stop server
npm run pm2:stop
# atau: pm2 stop streambro

# Restart server
npm run pm2:restart
# atau: pm2 restart streambro

# Delete dari PM2
pm2 delete streambro
```

#### Auto-start saat Server Reboot:
```bash
# Save PM2 process list
pm2 save

# Setup startup script
pm2 startup

# Ikuti instruksi yang muncul (copy-paste command yang diberikan)
```

---

### **Opsi 2: Menggunakan start-server.bat (Windows)**

Untuk development/testing di Windows, gunakan batch file yang sudah disediakan:

```bash
# Double-click file ini atau jalankan di command prompt:
start-server.bat
```

File ini akan menjalankan server di background. Anda bisa menutup window command prompt tanpa menghentikan server.

**Untuk stop server:**
- Buka Task Manager (Ctrl+Shift+Esc)
- Cari process "node.exe"
- End task

---

### **Opsi 3: Menggunakan nohup (Linux/Mac)**

```bash
# Jalankan server di background
nohup node app.js > logs/server.log 2>&1 &

# Lihat process ID
echo $!

# Stop server (ganti PID dengan process ID yang muncul)
kill -9 PID
```

---

### **Opsi 4: Menggunakan screen (Linux)**

```bash
# Install screen (jika belum ada)
sudo apt-get install screen  # Ubuntu/Debian
sudo yum install screen       # CentOS/RHEL

# Buat session baru
screen -S streambro

# Jalankan server
npm start

# Detach dari screen (tekan):
Ctrl+A, lalu D

# Attach kembali ke screen
screen -r streambro

# List semua screen sessions
screen -ls

# Kill screen session
screen -X -S streambro quit
```

---

## 🔍 Cara Cek Apakah Server Masih Berjalan

### Windows:
```powershell
# Cek process Node.js
tasklist | findstr node

# Atau buka Task Manager dan cari "node.exe"
```

### Linux/Mac:
```bash
# Cek process Node.js
ps aux | grep node

# Atau gunakan PM2
pm2 status
```

---

## 📊 Monitoring Server

### Dengan PM2:
```bash
# Real-time monitoring
pm2 monit

# Logs
pm2 logs streambro --lines 100

# Flush logs
pm2 flush
```

### Manual:
```bash
# Lihat logs
tail -f logs/server.log

# Lihat error logs
tail -f logs/error.log
```

---

## ⚙️ Konfigurasi PM2 (ecosystem.config.js)

File `ecosystem.config.js` sudah dikonfigurasi dengan:
- ✅ Auto-restart on crash
- ✅ Memory limit 1GB
- ✅ Log rotation
- ✅ Detached mode (tetap jalan setelah terminal ditutup)

Anda bisa edit file ini sesuai kebutuhan.

---

## 🐛 Troubleshooting

### Stream masih offline setelah browser ditutup?

1. **Cek apakah server masih berjalan:**
   ```bash
   pm2 status
   # atau
   tasklist | findstr node
   ```

2. **Cek logs untuk error:**
   ```bash
   pm2 logs streambro
   # atau
   cat logs/server.log
   ```

3. **Cek FFmpeg process:**
   ```bash
   # Windows
   tasklist | findstr ffmpeg
   
   # Linux/Mac
   ps aux | grep ffmpeg
   ```

4. **Restart server:**
   ```bash
   pm2 restart streambro
   ```

### Port sudah digunakan?

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

---

## 📝 Best Practices

1. **Selalu gunakan PM2 untuk production**
2. **Monitor logs secara berkala**
3. **Setup auto-restart on server reboot**
4. **Backup database secara berkala**
5. **Gunakan reverse proxy (Nginx) untuk production**

---

## 🔗 Resources

- PM2 Documentation: https://pm2.keymetrics.io/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices

---

**Last Updated:** December 9, 2025
**Version:** 2.1
