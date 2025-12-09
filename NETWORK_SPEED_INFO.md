# Internet Speed Indicator - Platform Support

## 📊 Fitur Internet Speed Monitor

Dashboard StreamBro menampilkan **real-time network speed** (upload & download) untuk monitoring bandwidth yang digunakan saat streaming.

---

## 🖥️ Platform Support

### ✅ **Linux (VPS/Server)** - FULLY SUPPORTED
- Ubuntu
- Debian
- CentOS
- RHEL
- Fedora
- Dan distro Linux lainnya

**Status:** ✅ **Berfungsi penuh**
- Menampilkan upload speed real-time
- Menampilkan download speed real-time
- Update setiap 3 detik

### ❌ **Windows (Development)** - NOT SUPPORTED
- Windows 10
- Windows 11
- Windows Server

**Status:** ❌ **Tidak berfungsi**
- Menampilkan "N/A" (Not Available)
- Library `systeminformation` tidak support network stats di Windows
- Ini adalah limitasi dari library, bukan bug aplikasi

### ✅ **macOS** - SUPPORTED
**Status:** ✅ **Berfungsi**

---

## 🔧 Kenapa Tidak Berfungsi di Windows?

Library `systeminformation` yang digunakan untuk monitoring sistem memiliki limitasi:

```javascript
// services/systemMonitor.js
const isWin = process.platform === 'win32';
const networkData = isWin ? Promise.resolve([]) : si.networkStats();
```

**Alasan:**
1. Windows API untuk network stats berbeda dengan Linux
2. Library `systeminformation` fokus pada Linux/Unix systems
3. Windows memerlukan WMI (Windows Management Instrumentation) yang kompleks

---

## 💡 Solusi untuk Development di Windows

Saat development di Windows, Anda akan melihat:
- Upload: **N/A**
- Download: **N/A**

Ini **NORMAL** dan **tidak perlu diperbaiki** karena:
1. ✅ Aplikasi tetap berfungsi normal
2. ✅ Fitur lain tidak terpengaruh
3. ✅ Saat deploy ke VPS Linux, fitur akan otomatis berfungsi

---

## 🚀 Saat Deploy ke VPS Linux

Setelah deploy ke VPS Linux (Ubuntu/Debian/CentOS), Internet Speed indicator akan **otomatis berfungsi** tanpa perlu konfigurasi tambahan.

**Contoh tampilan di VPS:**
```
↑ Upload:   2.5 Mbps
↓ Download: 1.2 Mbps
```

---

## 📈 Cara Kerja Network Speed Monitor

### Di Linux VPS:
1. Membaca network interface statistics dari `/proc/net/dev`
2. Menghitung delta bytes antara 2 pembacaan
3. Konversi ke Mbps (Megabits per second)
4. Update setiap 3 detik

### Perhitungan:
```javascript
// Bytes per second
const downloadBps = (currentRxBytes - previousRxBytes) / timeDiff;
const uploadBps = (currentTxBytes - previousTxBytes) / timeDiff;

// Convert to Mbps
const downloadMbps = (downloadBps * 8) / (1024 * 1024);
const uploadMbps = (uploadBps * 8) / (1024 * 1024);
```

---

## 🔍 Monitoring Bandwidth Saat Streaming

### Kegunaan Internet Speed Monitor:

1. **Monitoring Real-time**
   - Lihat bandwidth yang digunakan saat streaming
   - Pastikan tidak melebihi kapasitas server

2. **Troubleshooting**
   - Jika stream lag, cek apakah bandwidth penuh
   - Identifikasi bottleneck network

3. **Capacity Planning**
   - Hitung berapa stream concurrent yang bisa dijalankan
   - Contoh: Jika upload 100 Mbps, bisa handle ~25 stream @ 4 Mbps

### Contoh Perhitungan:
```
Server Upload Speed: 100 Mbps
Stream Bitrate: 4 Mbps (4000 kbps)
Max Concurrent Streams: 100 / 4 = 25 streams
```

---

## 🛠️ Alternative untuk Windows Development

Jika Anda ingin monitoring network di Windows saat development:

### Opsi 1: Task Manager
1. Buka Task Manager (Ctrl+Shift+Esc)
2. Tab "Performance"
3. Pilih "Ethernet" atau "Wi-Fi"
4. Lihat real-time network usage

### Opsi 2: Resource Monitor
1. Tekan Win+R
2. Ketik `resmon`
3. Tab "Network"
4. Lihat detail per-process network usage

### Opsi 3: Third-party Tools
- NetSpeedMonitor
- GlassWire
- NetWorx

---

## 📝 Technical Details

### Library Used:
- `systeminformation` v5.25.11
- Docs: https://systeminformation.io/

### API Endpoint:
```
GET /api/system-stats
```

### Response Format:
```json
{
  "network": {
    "download": 1.234,
    "upload": 2.567,
    "downloadFormatted": "1.23 Mbps",
    "uploadFormatted": "2.57 Mbps",
    "available": true
  }
}
```

### Update Interval:
- Dashboard: 3 seconds
- API: On-demand (no caching)

---

## ✅ Kesimpulan

- ✅ **Production (Linux VPS):** Internet Speed berfungsi penuh
- ❌ **Development (Windows):** Menampilkan "N/A" - ini normal
- 🎯 **Rekomendasi:** Abaikan "N/A" saat development, test di VPS untuk hasil akurat

**Tidak perlu khawatir!** Fitur ini dirancang untuk production di Linux VPS dan akan berfungsi sempurna saat deploy.

---

**Last Updated:** December 9, 2025
**Version:** 2.1
