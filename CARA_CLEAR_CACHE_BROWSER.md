# Cara Clear Cache Browser - Fix Jadwal Hilang

## Masalah
Jadwal hilang ketika diklik di browser biasa, tapi normal di incognito mode.

## Penyebab
Browser menyimpan versi lama dari halaman dashboard (cache). Versi lama tidak punya logging dan fix terbaru.

## Solusi: Clear Cache Browser

### Cara 1: Hard Refresh (Coba Dulu)
1. Buka halaman dashboard
2. Tekan **Ctrl + Shift + R** (atau **Ctrl + F5**)
3. Tunggu halaman reload

### Cara 2: Clear Semua Data Browser (Recommended)
1. Tekan **Ctrl + Shift + Delete**
2. Pilih **"All time"** atau **"Sepanjang waktu"**
3. Centang SEMUA kotak:
   - ✅ Browsing history
   - ✅ Download history  
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - ✅ Hosted app data
4. Klik **"Clear data"** atau **"Hapus data"**
5. Tutup dan buka ulang browser
6. Buka `https://streambro.nivarastudio.site/dashboard`

### Cara 3: Developer Tools
1. Tekan **F12** untuk buka Developer Tools
2. Klik kanan tombol **Refresh** (di samping address bar)
3. Pilih **"Empty Cache and Hard Reload"**

## Cara Cek Berhasil

Setelah clear cache, buka Console (F12 → Console tab).

Kamu harus lihat log seperti ini:
```
[loadStreams] Fetching streams with cache buster: ?_=1734712345678
[loadStreams] Response status: 200
[loadStreams] Got 3 streams
[displayStreams] Called with 3 streams
```

Ketika klik jadwal, harus muncul:
```
[CLICK DEBUG] Clicked inside stream row: 123
[CLICK DEBUG] Target element: BUTTON btn-stop
```

## Langkah Setelah Clear Cache

1. **Restart PM2** dulu:
   ```bash
   pm2 restart ecosystem.config.js
   ```

2. **Clear cache browser** (Cara 2 di atas)

3. **Test**:
   - Buka dashboard
   - Cek console ada log atau tidak
   - Klik jadwal, lihat apakah masih hilang

## Jika Masih Bermasalah

### Cek Extension Browser
Beberapa extension bisa ganggu JavaScript:
1. Disable semua extension
2. Test lagi
3. Enable satu-satu untuk cari yang bermasalah

### Clear localStorage
Buka Console (F12) dan jalankan:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Coba Browser Lain
- Chrome
- Firefox
- Edge
- Brave

## Yang Sudah Diperbaiki

1. ✅ **Cache Control Headers** - Server sekarang kirim header supaya browser tidak cache halaman dashboard
2. ✅ **Service Worker Disabled** - Sudah dimatikan dan auto-unregister
3. ✅ **Logging Lengkap** - Semua klik dan load stream ada log nya

## Kenapa di Incognito Normal?

Incognito mode:
- ❌ Tidak ada cache
- ❌ Tidak ada extension (biasanya)
- ❌ Tidak ada localStorage
- ✅ JavaScript fresh/baru

Browser biasa:
- ✅ Ada cache (versi lama)
- ✅ Ada extension (bisa ganggu)
- ✅ Ada localStorage
- ❌ JavaScript lama (sebelum fix)

## Kesimpulan

**Masalahnya bukan di code, tapi di browser cache!**

Setelah:
1. Restart PM2
2. Clear cache browser
3. Reload halaman

Seharusnya sudah normal seperti di incognito mode.
