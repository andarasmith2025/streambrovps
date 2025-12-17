# Schedule Highlight Feature

## ✅ IMPLEMENTED - Active Schedule Visual Indicator

Fitur highlight untuk menampilkan jadwal yang sedang aktif/berjalan di dashboard telah berhasil diimplementasikan.

---

## 🎯 Fitur

### Visual Indicators untuk Jadwal Aktif:

1. **Background Hijau** - Jadwal aktif memiliki background hijau transparan
2. **Border Hijau** - Border kiri hijau untuk membedakan dari jadwal lain
3. **Text Hijau** - Semua text (waktu, durasi, hari) berubah menjadi hijau
4. **Badge "ACTIVE"** - Label hijau "ACTIVE" muncul di jadwal yang sedang berjalan
5. **Icon Hijau** - Icon clock dan repeat berubah warna hijau
6. **Font Bold** - Text jadwal aktif menjadi bold/tebal

---

## 📊 Tampilan Visual

### Jadwal Normal (Tidak Aktif):
```
┌─────────────────────────────────────┐
│ 🔄 Every Day                        │
│ 🕐 07:50                            │
│ 🕐 08:50 (60m)                      │
└─────────────────────────────────────┘
```

### Jadwal Aktif (Sedang Berjalan):
```
┌─────────────────────────────────────┐
│ ║ 🔄 Every Day [ACTIVE]             │ ← Border hijau kiri
│ ║ 🕐 19:15                          │ ← Background hijau
│ ║ 🕐 20:15 (60m)                    │ ← Text hijau bold
└─────────────────────────────────────┘
```

---

## 🔍 Logika Deteksi Jadwal Aktif

### Untuk Recurring Schedule:
```javascript
1. Cek apakah stream status = 'live'
2. Cek apakah hari ini termasuk dalam recurring_days
3. Cek apakah waktu sekarang berada di antara start_time dan end_time
4. Jika semua TRUE → Jadwal AKTIF
```

### Untuk One-Time Schedule:
```javascript
1. Cek apakah stream status = 'live'
2. Cek apakah waktu sekarang >= schedule_time
3. Cek apakah waktu sekarang < end_time (start + duration)
4. Jika semua TRUE → Jadwal AKTIF
```

---

## 💻 Implementasi Teknis

### File Modified:
- `views/dashboard.ejs` (lines 1643-1730)

### Kode Highlight:

```javascript
// Check if this schedule is currently active
const now = new Date();
const schStart = parseScheduleTime(sch.schedule_time);
const schEnd = new Date(schStart.getTime() + (parseInt(sch.duration) * 60 * 1000));
let isActive = false;

if (stream.status === 'live') {
  if (sch.is_recurring && sch.recurring_days) {
    const currentDay = now.getDay();
    const allowedDays = sch.recurring_days.split(',').map(d => parseInt(d));
    if (allowedDays.includes(currentDay)) {
      const nowTime = now.getHours() * 60 + now.getMinutes();
      const startTime = schStart.getHours() * 60 + schStart.getMinutes();
      const endTime = schEnd.getHours() * 60 + schEnd.getMinutes();
      isActive = nowTime >= startTime && nowTime < endTime;
    }
  } else {
    isActive = now >= schStart && now < schEnd;
  }
}
```

### CSS Classes Applied:

**Untuk Container:**
```html
<div class="bg-green-500/10 -mx-2 px-2 py-1 rounded border-l-2 border-green-500">
```

**Untuk Text:**
```html
<span class="text-green-400 font-semibold">
```

**Untuk Badge:**
```html
<span class="ml-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">ACTIVE</span>
```

**Untuk Icon:**
```html
<i class="ti ti-clock text-green-400">
```

---

## 🎨 Color Scheme

| Element | Normal | Active |
|---------|--------|--------|
| Background | Transparent | `bg-green-500/10` (hijau 10% opacity) |
| Border | None | `border-l-2 border-green-500` (hijau solid) |
| Text | `text-gray-400` | `text-green-400 font-semibold` |
| Icon | `text-gray-400` | `text-green-400` |
| Badge | None | `bg-green-500/20 text-green-400` |

---

## 📱 Responsive Design

Fitur highlight bekerja di semua ukuran layar:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

---

## 🔄 Real-Time Update

### Auto-Refresh:
Dashboard secara otomatis refresh setiap 5 detik untuk update:
- Status stream (live/offline)
- Highlight jadwal aktif
- Durasi stream

### Manual Refresh:
User bisa refresh manual dengan:
- Klik tombol refresh
- Reload page (F5)
- Hard refresh (Ctrl+Shift+R)

---

## 📊 Contoh Use Case

### Scenario 1: Stream dengan Multiple Schedules

**Stream**: "TES 1"  
**Status**: Live  
**Schedules**:
1. 07:50 - 08:50 (Every Day) ← Tidak aktif (sudah lewat)
2. 19:15 - 20:15 (Every Day) ← **AKTIF** (sedang berjalan)
3. 22:00 - 23:00 (Every Day) ← Tidak aktif (belum dimulai)

**Tampilan**:
- Schedule #1: Warna normal (abu-abu)
- Schedule #2: **Hijau dengan badge ACTIVE** ✅
- Schedule #3: Warna normal (abu-abu)

### Scenario 2: Stream Offline

**Stream**: "TES 2"  
**Status**: Offline  
**Schedules**: Ada 3 jadwal

**Tampilan**:
- Semua jadwal warna normal (abu-abu)
- Tidak ada highlight (karena stream offline)

---

## 🧪 Testing Checklist

- [x] Highlight muncul saat stream live dan dalam window jadwal
- [x] Highlight tidak muncul saat stream offline
- [x] Highlight tidak muncul saat di luar window jadwal
- [x] Recurring schedule: cek hari yang benar
- [x] One-time schedule: cek tanggal dan waktu
- [x] Multiple schedules: hanya yang aktif di-highlight
- [x] Badge "ACTIVE" muncul
- [x] Warna hijau konsisten (text, icon, border, background)
- [x] Font bold untuk jadwal aktif
- [x] Responsive di semua device
- [x] Auto-refresh bekerja

---

## 🎯 Benefits

### Untuk User:
✅ **Visual clarity** - Langsung tahu jadwal mana yang sedang berjalan  
✅ **Easy monitoring** - Tidak perlu cek manual waktu vs jadwal  
✅ **Multiple schedules** - Mudah track saat ada banyak jadwal  
✅ **Real-time** - Update otomatis setiap 5 detik  

### Untuk Admin:
✅ **Better UX** - User experience lebih baik  
✅ **Less support** - User tidak bingung jadwal mana yang aktif  
✅ **Professional look** - Dashboard terlihat lebih modern  

---

## 🚀 Future Enhancements (Optional)

### Possible Improvements:
1. **Countdown Timer** - Tampilkan sisa waktu jadwal aktif
2. **Progress Bar** - Visual progress bar untuk durasi
3. **Next Schedule** - Highlight jadwal berikutnya dengan warna berbeda
4. **Animation** - Pulse animation untuk jadwal aktif
5. **Sound Alert** - Notifikasi suara saat jadwal mulai/selesai
6. **Desktop Notification** - Browser notification untuk jadwal

---

## 📝 Code Location

**File**: `views/dashboard.ejs`  
**Lines**: 1643-1730  
**Function**: Stream table rendering  

**Key Sections**:
- Date/Recurring column (lines 1643-1680)
- Start Time column (lines 1681-1705)
- End Time column (lines 1706-1730)

---

## 🔧 Troubleshooting

### Highlight tidak muncul?

**Check:**
1. Stream status harus 'live'
2. Waktu sekarang harus dalam window jadwal
3. Untuk recurring: hari ini harus ada di recurring_days
4. Browser timezone harus benar (Asia/Jakarta)

### Highlight muncul di jadwal yang salah?

**Check:**
1. Server timezone: `timedatectl` (harus Asia/Jakarta)
2. Schedule time format: tidak boleh ada 'Z' suffix
3. Browser time: harus sync dengan server

### Warna tidak konsisten?

**Check:**
1. Tailwind CSS loaded
2. Class names benar: `text-green-400`, `bg-green-500/10`
3. Hard refresh browser (Ctrl+Shift+R)

---

## 📊 Deployment Status

**Deployed**: December 17, 2025  
**Commit**: 91535cf  
**Status**: ✅ LIVE di Production  
**URL**: https://streambro.nivarastudio.site/dashboard

---

## ✅ Verification

Test di dashboard:
1. Buka dashboard
2. Lihat stream yang sedang live
3. Cek apakah jadwal yang sedang berjalan memiliki:
   - Background hijau
   - Border hijau kiri
   - Text hijau bold
   - Badge "ACTIVE"
   - Icon hijau

---

## 🎉 Kesimpulan

Fitur schedule highlight telah berhasil diimplementasikan dengan:
- ✅ Visual indicator yang jelas (hijau)
- ✅ Badge "ACTIVE" untuk jadwal yang berjalan
- ✅ Support untuk recurring dan one-time schedules
- ✅ Real-time update setiap 5 detik
- ✅ Responsive design
- ✅ Deployed dan tested

User sekarang bisa dengan mudah melihat jadwal mana yang sedang aktif tanpa perlu cek manual!
