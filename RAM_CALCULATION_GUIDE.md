# RAM Calculation Guide - StreamBro

## 📊 Cara Melihat RAM di Dashboard

Dashboard sekarang menampilkan RAM dalam format:
```
RAM: 119 / 4096 MB
```
- **119 MB** = RAM yang sedang digunakan (Used)
- **4096 MB** = Total RAM yang tersedia (Total)
- **Sisa RAM** = 4096 - 119 = **3977 MB** (tersedia untuk streaming)

---

## 🔍 Perhitungan RAM - Apakah Sudah Benar?

### Sumber Data RAM
File: `services/systemMonitor.js`

```javascript
const memData = await si.mem();

memory: {
  total: formatMemory(memData.total),      // Total RAM fisik
  used: formatMemory(memData.active),      // RAM aktif yang digunakan
  free: formatMemory(memData.available),   // RAM yang tersedia
  usagePercent: Math.round((memData.active / memData.total) * 100)
}
```

### ✅ Perhitungan BENAR karena:
1. **`memData.active`** = RAM yang benar-benar digunakan oleh aplikasi aktif
2. **`memData.total`** = Total RAM fisik di sistem
3. **`memData.available`** = RAM yang tersedia untuk aplikasi baru

### Perbedaan dengan `free -h`:
- Linux `free` command menunjukkan:
  - **used** = total - free - buffers - cache
  - **available** = free + buffers + cache (yang bisa digunakan)
- Kita menggunakan **`active`** yang lebih akurat untuk RAM yang benar-benar terpakai

---

## 🧮 Kalkulasi RAM: Idle vs Streaming

### 1. Cek RAM Idle (Tanpa Streaming)

**Di SSH Server:**
```bash
# Cek RAM saat idle
free -h

# Atau lebih detail
ps aux --sort=-%mem | head -10

# Cek RAM Node.js saja
ps aux | grep node
```

**Contoh Output:**
```
              total        used        free      shared  buff/cache   available
Mem:          3.8Gi       119Mi       3.2Gi       1.0Mi       500Mi       3.5Gi
```

**Interpretasi:**
- **Total**: 3.8 GB (4096 MB)
- **Used**: 119 MB (aplikasi aktif)
- **Available**: 3.5 GB (3584 MB) - ini yang bisa dipakai untuk streaming

### 2. Cek RAM Saat Streaming

**Start 1 stream, lalu cek:**
```bash
# Cek RAM setelah start stream
free -h

# Cek proses FFmpeg
ps aux | grep ffmpeg

# Cek RAM per proses
ps aux --sort=-%mem | grep -E 'node|ffmpeg'
```

**Contoh Output Saat 1 Stream Aktif (Streamcopy Mode):**
```
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root      1234  0.5  0.5  786000 18800 ?       Ssl  10:00   0:01 node app.js
root      5678  2.0  0.3  125000 12000 ?       Sl   10:05   0:10 ffmpeg -re -i video.mp4 ...
```

**Interpretasi:**
- **Node.js**: 18.8 MB (VSZ = Virtual, RSS = Real)
- **FFmpeg (streamcopy)**: ~12 MB per stream
- **Total per stream**: ~30-35 MB

### 3. Kalkulasi Kapasitas Streaming

**Formula:**
```
Available RAM = Total RAM - System RAM - Node.js Base

Streamcopy Mode:
Max Streams = Available RAM / 30 MB

Re-encode Mode (Advanced Settings ON):
Max Streams = Available RAM / 150 MB
```

**Contoh untuk VPS 4GB:**
```
Total RAM: 4096 MB
System RAM: ~300 MB (OS + services)
Node.js Base: ~20 MB
Available: 4096 - 300 - 20 = 3776 MB

Streamcopy Mode:
Max Streams = 3776 / 30 = ~125 streams

Re-encode Mode:
Max Streams = 3776 / 150 = ~25 streams
```

**TAPI** dibatasi oleh CPU dan Network juga!

---

## 📈 Monitoring RAM Real-Time

### 1. Di Dashboard
- Lihat indicator: `RAM: 119 / 4096 MB`
- Auto-refresh setiap 5 detik

### 2. Di SSH dengan PM2
```bash
# Monitor real-time
pm2 monit

# Atau dengan htop (lebih visual)
htop
```

### 3. Script Monitoring Custom

Buat file `check-ram.sh`:
```bash
#!/bin/bash
echo "=== RAM Usage ==="
free -h
echo ""
echo "=== Top Memory Processes ==="
ps aux --sort=-%mem | head -10
echo ""
echo "=== FFmpeg Processes ==="
ps aux | grep ffmpeg | grep -v grep
```

Jalankan:
```bash
chmod +x check-ram.sh
./check-ram.sh
```

---

## 🎯 Rekomendasi untuk VPS 4GB

### Streamcopy Mode (Recommended):
- **RAM per stream**: ~30 MB
- **Max streams (RAM limit)**: ~125 streams
- **Max streams (CPU limit)**: ~14 streams (2 CPU cores)
- **Max streams (Network limit)**: ~10 streams (100 Mbps upload)
- **Bottleneck**: CPU dan Network, bukan RAM ✅

### Re-encode Mode:
- **RAM per stream**: ~150 MB
- **Max streams (RAM limit)**: ~25 streams
- **Max streams (CPU limit)**: ~2 streams (2 CPU cores)
- **Bottleneck**: CPU ❌

---

## 🔧 Troubleshooting RAM

### Jika RAM Penuh:
```bash
# 1. Cek proses yang makan RAM
ps aux --sort=-%mem | head -20

# 2. Restart aplikasi
pm2 restart streambro

# 3. Clear cache (hati-hati!)
sync; echo 3 > /proc/sys/vm/drop_caches
```

### Jika RAM Tidak Akurat di Dashboard:
```bash
# Cek apakah systeminformation package terinstall
npm list systeminformation

# Reinstall jika perlu
npm install systeminformation --save
```

---

## 📝 Summary

✅ **Perhitungan RAM sudah BENAR**
- Menggunakan `memData.active` untuk RAM terpakai
- Menggunakan `memData.total` untuk total RAM
- Format baru: `Used / Total MB` lebih jelas

✅ **Cara Kalkulasi:**
1. **Idle**: Cek dengan `free -h` atau `ps aux`
2. **Streaming**: Start stream, cek lagi dengan `ps aux | grep ffmpeg`
3. **Per Stream**: ~30 MB (streamcopy) atau ~150 MB (re-encode)

✅ **Monitoring:**
- Dashboard: Auto-refresh setiap 5 detik
- SSH: `pm2 monit` atau `htop`
- Custom: Buat script monitoring sendiri

🎯 **Untuk VPS 4GB**: Streamcopy mode bisa handle 10-14 streams (dibatasi CPU/Network, bukan RAM)
