# User Management Guide

Panduan lengkap untuk mengelola user di StreamFlow VPS.

## 1. Cek Semua User

Untuk melihat semua user yang ada di database:

```bash
node check-users.js
```

Output akan menampilkan:
- Username
- Role (admin/member)
- Status (active/inactive)
- Tanggal dibuat

## 2. Membuat Admin Baru

Jika belum ada user admin atau ingin membuat admin baru:

```bash
node create-admin.js <username> <password>
```

Contoh:
```bash
node create-admin.js admin mypassword123
```

## 3. Reset Password User

Untuk reset password user yang sudah ada:

```bash
node reset-password.js <username> <new-password>
```

Contoh:
```bash
node reset-password.js "Bang Teguh" newpassword123
```

**Note:** Jika username mengandung spasi, gunakan tanda kutip.

## 4. Aktivasi User

Untuk mengaktifkan user yang statusnya inactive:

```bash
node activate-user.js <username>
```

Contoh:
```bash
node activate-user.js johndoe
```

## 5. Setup Account Pertama Kali

Jika database kosong (belum ada user sama sekali), akses:

```
http://your-server-ip:7575/setup-account
```

Halaman ini hanya bisa diakses jika belum ada user di database.

## Troubleshooting

### "Too many login attempts"

Jika terlalu banyak percobaan login gagal, tunggu 15 menit atau restart server:

```bash
# Jika menggunakan PM2
pm2 restart app

# Jika manual
# Tekan Ctrl+C untuk stop, lalu jalankan lagi
node app.js
```

### "Your account is not active"

User perlu diaktifkan oleh admin. Gunakan script:

```bash
node activate-user.js <username>
```

### "User not found"

Cek dulu apakah user ada di database:

```bash
node check-users.js
```

Jika tidak ada, buat user baru dengan `create-admin.js`.

## Database Location

Database SQLite ada di:
```
db/streamflow.db
```

Untuk backup database:
```bash
cp db/streamflow.db db/streamflow.db.backup
```

## Auto-Activation untuk Member

Sejak update terbaru, user dengan role `member` (gratis) akan otomatis aktif saat registrasi.
Hanya user dengan role `admin` yang perlu approval manual.

## Keamanan

- Gunakan password yang kuat (minimal 6 karakter)
- Jangan share kredensial admin
- Backup database secara berkala
- Gunakan HTTPS jika di production
