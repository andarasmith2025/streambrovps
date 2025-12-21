# Solusi Permanen: Fix "deleted_client" Error

## 🔴 Masalah
Error "deleted_client" terjadi karena **OAuth Client ID di Google Cloud Console dihapus atau diganti**, bukan karena token expired.

## 🎯 Root Cause
1. User membuat OAuth Client ID baru di Google Cloud Console
2. Connect YouTube dengan Client ID tersebut
3. **Client ID kemudian dihapus/diganti** di Google Cloud Console
4. Token menjadi invalid karena Client ID-nya sudah tidak ada
5. Setiap kali disconnect/reconnect, masalah terulang

## ✅ Solusi Permanen

### Langkah 1: Pastikan OAuth Client ID STABIL di Google Cloud Console

1. **Buka Google Cloud Console:**
   - https://console.cloud.google.com/
   - Pilih project: **StreamBro** (atau project yang digunakan)

2. **Cek OAuth Client ID yang ADA:**
   - Menu: **APIs & Services** → **Credentials**
   - Lihat di bagian **OAuth 2.0 Client IDs**
   - **JANGAN HAPUS** Client ID yang sudah ada!

3. **Jika Client ID sudah dihapus, buat BARU dan JANGAN HAPUS LAGI:**
   - Klik **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Application type: **Web application**
   - Name: **StreamBro Production** (atau nama yang mudah diingat)
   - Authorized redirect URIs:
     ```
     https://streambro.nivarastudio.site/oauth2/callback
     ```
   - Klik **CREATE**
   - **SIMPAN** Client ID dan Client Secret

### Langkah 2: Update .env dengan Client ID yang STABIL

**Di VPS, edit file .env:**

```bash
cd /root/streambrovps
nano .env
```

**Update dengan Client ID BARU (jika dibuat baru):**

```env
GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=https://streambro.nivarastudio.site/oauth2/callback
```

**Simpan dan restart PM2:**

```bash
pm2 restart streambro
```

### Langkah 3: Reconnect YouTube Channel

1. Buka dashboard: https://streambro.nivarastudio.site/dashboard
2. Klik **"Disconnect"** (jika sudah connected)
3. Klik **"Connect YouTube"**
4. Login dan authorize
5. Token baru akan dibuat dengan Client ID yang STABIL

### Langkah 4: JANGAN HAPUS Client ID Lagi!

**⚠️ PENTING:**
- **JANGAN HAPUS** OAuth Client ID di Google Cloud Console
- **JANGAN BUAT** Client ID baru kecuali benar-benar perlu
- Jika perlu buat baru, **UPDATE .env** dan **reconnect semua user**

## 🔧 Cara Cek Client ID Masih Valid

**Jalankan script ini di VPS:**

```bash
cd /root/streambrovps
node check-youtube-token-health.js
```

**Jika muncul "deleted_client" error:**
- Client ID di .env sudah dihapus di Google Cloud Console
- Buat Client ID baru (Langkah 1)
- Update .env (Langkah 2)
- Reconnect YouTube (Langkah 3)

## 📋 Checklist Pencegahan

- [ ] OAuth Client ID di Google Cloud Console **TIDAK DIHAPUS**
- [ ] File .env berisi Client ID yang **VALID dan STABIL**
- [ ] Semua user sudah **reconnect** dengan Client ID yang sama
- [ ] Test schedule berjalan normal tanpa "deleted_client" error

## 🎯 Kesimpulan

Masalah "deleted_client" **BUKAN** karena token refresh, tapi karena:
1. OAuth Client ID dihapus di Google Cloud Console
2. Atau .env berisi Client ID yang sudah tidak valid

**Solusi:** Pastikan Client ID di Google Cloud Console **STABIL** dan **TIDAK DIHAPUS**.

## 📞 Troubleshooting

**Q: Kenapa Client ID saya terhapus?**
A: Kemungkinan:
- Dihapus manual saat testing/cleanup
- Project Google Cloud dihapus/reset
- Credentials direset karena security issue

**Q: Apakah token perlu di-refresh manual?**
A: TIDAK. Token akan auto-refresh selama Client ID masih valid.

**Q: Berapa lama token valid?**
A: Access token valid 1 jam, tapi akan auto-refresh menggunakan refresh token (valid selamanya selama Client ID tidak dihapus).

**Q: Apakah perlu reconnect setiap hari?**
A: TIDAK. Sekali connect, token akan auto-refresh selamanya (selama Client ID tidak dihapus).
