# YouTube API Setup Guide

## Overview

StreamBro menggunakan sistem **per-user YouTube API credentials**. Setiap user harus membuat dan mengkonfigurasi YouTube Data API v3 mereka sendiri di Google Cloud Console.

## Keuntungan Per-User API

✅ **10,000 quota units per hari** - Khusus untuk Anda  
✅ **Unlimited scalability** - Tidak ada bottleneck antar user  
✅ **100% GRATIS** - Tidak perlu bayar atau cicil  
✅ **Full control** - Kelola quota Anda sendiri  

## Langkah-Langkah Setup

### Step 1: Buat Google Cloud Project (5 menit)

1. Kunjungi [Google Cloud Console](https://console.cloud.google.com)
2. Klik **"Select a project"** di bagian atas
3. Klik **"New Project"**
4. Masukkan nama project (contoh: "StreamBro YouTube API")
5. Klik **"Create"**
6. Tunggu beberapa detik sampai project dibuat

💡 **Tip**: Ini 100% GRATIS, tidak perlu kartu kredit!

---

### Step 2: Enable YouTube Data API v3 (3 menit)

1. Pastikan project Anda sudah terpilih (cek di bagian atas)
2. Di menu kiri, klik **"APIs & Services"** → **"Library"**
3. Di search box, ketik: `YouTube Data API v3`
4. Klik pada hasil pencarian **"YouTube Data API v3"**
5. Klik tombol **"Enable"**
6. Tunggu beberapa detik sampai API aktif

---

### Step 3: Configure OAuth Consent Screen (7 menit)

1. Di menu kiri, klik **"APIs & Services"** → **"OAuth consent screen"**
2. Pilih **"External"** sebagai User Type
3. Klik **"Create"**

**Halaman 1 - App Information:**
- **App name**: Masukkan nama aplikasi Anda (contoh: "StreamBro")
- **User support email**: Pilih email Anda dari dropdown
- **App logo**: (Optional) Upload logo jika ada
- **Developer contact information**: Masukkan email Anda
- Klik **"Save and Continue"**

**Halaman 2 - Scopes:**
- Klik **"Add or Remove Scopes"**
- Cari dan centang: `https://www.googleapis.com/auth/youtube`
- Klik **"Update"**
- Klik **"Save and Continue"**

**Halaman 3 - Test Users:**
- Klik **"Add Users"**
- Masukkan email akun YouTube Anda (yang akan digunakan untuk streaming)
- Klik **"Add"**
- Klik **"Save and Continue"**

**Halaman 4 - Summary:**
- Review informasi Anda
- Klik **"Back to Dashboard"**

⚠️ **Penting**: Tambahkan email YouTube Anda sebagai test user, jika tidak Anda tidak bisa login!

---

### Step 4: Buat OAuth 2.0 Credentials (5 menit)

1. Di menu kiri, klik **"APIs & Services"** → **"Credentials"**
2. Klik **"Create Credentials"** di bagian atas
3. Pilih **"OAuth client ID"**
4. **Application type**: Pilih **"Web application"**
5. **Name**: Masukkan nama (contoh: "StreamBro Web Client")

**Authorized redirect URIs:**
6. Klik **"Add URI"**
7. Masukkan URL redirect Anda:
   ```
   https://yourdomain.com/oauth2/callback
   ```
   Ganti `yourdomain.com` dengan domain StreamBro Anda
   
   Contoh:
   - `https://streambro.nivarastudio.site/oauth2/callback`
   - `http://localhost:7575/oauth2/callback` (untuk development)

8. Klik **"Create"**

**Copy Credentials:**
9. Setelah dibuat, akan muncul popup dengan:
   - **Client ID**: Mulai dengan angka, diakhiri `.apps.googleusercontent.com`
   - **Client Secret**: Mulai dengan `GOCSPX-`
10. **COPY KEDUA NILAI INI** - Anda akan memasukkannya di StreamBro

💡 **Tip**: Jangan share Client Secret dengan siapapun!

---

### Step 5: Konfigurasi di StreamBro (2 menit)

1. Login ke StreamBro
2. Klik **Settings** di menu
3. Klik **"Configure API"** di bagian YouTube API Configuration
4. Paste **Client ID** dan **Client Secret** yang Anda copy
5. **Redirect URI** sudah otomatis terisi
6. Klik **"Save Configuration"**

✅ **Selesai!** Anda sekarang bisa menggunakan fitur YouTube di StreamBro

---

## Cara Menggunakan

### 1. Connect YouTube Account

Setelah API dikonfigurasi:
1. Klik **"Connect YouTube"** di Settings
2. Login dengan akun Google/YouTube Anda
3. Klik **"Allow"** untuk memberikan akses
4. Anda akan diarahkan kembali ke StreamBro

### 2. Buat Live Stream

1. Buka Dashboard
2. Klik **"New Stream"**
3. Pilih video
4. Pilih platform **"YouTube"**
5. Masukkan RTMP URL dan Stream Key dari YouTube Studio
6. Klik **"Start Stream"**

---

## Quota Information

### Apa itu Quota?

Quota adalah limit penggunaan API per hari. Setiap operasi menggunakan sejumlah "units".

### Quota Gratis: 10,000 Units/Hari

| Operasi | Units | Max per Hari |
|---------|-------|--------------|
| Create live stream | 1,600 | ~6 streams |
| Update stream | 50 | 200 updates |
| List streams | 1 | 10,000 lists |
| Delete stream | 50 | 200 deletes |

### Contoh Penggunaan Normal:

- Buat 3 live stream: 4,800 units
- Update 20 kali: 1,000 units
- List streams 100 kali: 100 units
- **Total**: 5,900 units (masih ada 4,100 units tersisa)

### Jika Quota Habis:

1. **Tunggu sampai besok** - Quota reset setiap hari pukul 00:00 PST
2. **Request quota increase** (gratis) - Isi form di Google Cloud Console
3. **Enable billing** (bayar sesuai pemakaian) - Hanya jika butuh lebih dari 10,000 units

---

## Troubleshooting

### Error: "Access blocked: This app's request is invalid"

**Solusi:**
- Pastikan Redirect URI di Google Cloud Console **SAMA PERSIS** dengan yang di StreamBro
- Harus include `https://` atau `http://`
- Tidak boleh ada spasi atau karakter tambahan

### Error: "The OAuth client was not found"

**Solusi:**
- Pastikan Client ID dan Client Secret yang Anda paste **benar**
- Copy ulang dari Google Cloud Console
- Pastikan tidak ada spasi di awal/akhir

### Error: "Access denied: You don't have permission"

**Solusi:**
- Tambahkan email YouTube Anda sebagai **Test User** di OAuth consent screen
- Tunggu 5-10 menit setelah menambahkan test user
- Coba login lagi

### Error: "Quota exceeded"

**Solusi:**
- Tunggu sampai besok (quota reset setiap hari)
- Atau request quota increase di Google Cloud Console
- Atau enable billing untuk quota unlimited

### Tidak bisa connect YouTube account

**Solusi:**
1. Pastikan API sudah dikonfigurasi di Settings
2. Pastikan YouTube Data API v3 sudah di-enable
3. Pastikan email Anda sudah ditambahkan sebagai test user
4. Clear browser cache dan cookies
5. Coba browser lain (Chrome/Firefox)

---

## FAQ

### Q: Apakah ini gratis?
**A:** Ya, 100% gratis sampai 10,000 units per hari. Cukup untuk penggunaan normal.

### Q: Apakah perlu kartu kredit?
**A:** Tidak, setup API gratis tanpa kartu kredit.

### Q: Berapa lama setup?
**A:** Total sekitar 20-25 menit untuk pertama kali.

### Q: Apakah aman?
**A:** Ya, credentials disimpan terenkripsi di database. Client Secret tidak pernah ditampilkan setelah disimpan.

### Q: Bisa pakai API orang lain?
**A:** Tidak disarankan. Setiap user harus punya API sendiri untuk menghindari quota conflict.

### Q: Quota habis, gimana?
**A:** Tunggu sampai besok (reset otomatis) atau request quota increase (gratis).

### Q: Bisa upgrade quota?
**A:** Ya, bisa request quota increase di Google Cloud Console (gratis, biasanya disetujui).

### Q: Apakah bisa untuk multiple YouTube channel?
**A:** Ya, satu API bisa digunakan untuk semua channel yang Anda miliki.

---

## Support

Jika masih ada masalah:
1. Cek tutorial di atas sekali lagi
2. Pastikan semua langkah sudah diikuti dengan benar
3. Cek error message di browser console (F12)
4. Contact admin untuk bantuan

---

## Checklist Setup

Gunakan checklist ini untuk memastikan setup Anda benar:

- [ ] Google Cloud Project sudah dibuat
- [ ] YouTube Data API v3 sudah di-enable
- [ ] OAuth consent screen sudah dikonfigurasi
- [ ] Email YouTube sudah ditambahkan sebagai test user
- [ ] OAuth 2.0 credentials sudah dibuat
- [ ] Redirect URI sudah ditambahkan di Google Cloud Console
- [ ] Client ID dan Client Secret sudah di-copy
- [ ] Credentials sudah di-paste di StreamBro Settings
- [ ] Test connection berhasil
- [ ] YouTube account sudah terconnect

---

**Selamat streaming! 🎥🚀**
