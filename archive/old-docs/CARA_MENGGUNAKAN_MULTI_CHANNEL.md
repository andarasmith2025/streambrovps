# 🎯 Cara Menggunakan Multi-Channel YouTube - Panduan Praktis

## 🚀 Quick Start

### 1. Restart Server
```bash
# Stop server yang sedang berjalan (Ctrl+C)
# Kemudian restart:
npm start
# atau
node app.js
```

### 2. Buka Dashboard
```
http://localhost:3000/dashboard
```

## 📱 Step-by-Step Usage

### **STEP 1: Connect YouTube Channel Pertama**

1. **Di Dashboard**, klik tombol **"Connect YouTube"** (warna merah dengan icon YouTube)
2. **Browser akan redirect** ke Google OAuth
3. **Login dengan akun YouTube pertama** yang ingin digunakan
4. **Klik "Allow"** untuk authorize StreamBro
5. **Redirect kembali ke dashboard** → Channel pertama sudah connected!

**Hasil**: 
- Status berubah jadi "Connected as [Channel Name]"
- Channel ini otomatis jadi **default channel**

---

### **STEP 2: Connect YouTube Channel Kedua (Opsional)**

1. **Di Dashboard**, lihat status YouTube yang sudah connected
2. **Klik tanda panah dropdown** (▼) di sebelah nama channel
3. **Dropdown akan muncul** menampilkan:
   - List connected channels
   - Tombol "Connect Another Channel"
4. **Klik "Connect Another Channel"**
5. **Login dengan akun YouTube kedua** (bisa akun Google yang berbeda)
6. **Authorize StreamBro** untuk akun kedua
7. **Channel kedua akan muncul** dalam dropdown

**Hasil**:
- Sekarang punya 2+ channels dalam dropdown
- Channel pertama masih jadi default
- Bisa switch antar channels

---

### **STEP 3: Manage Multiple Channels**

#### **Lihat Semua Connected Channels:**
1. **Klik dropdown arrow** di dashboard header
2. **Akan muncul popup** dengan:
   - ✅ List semua connected channels
   - ✅ Avatar dan nama channel
   - ✅