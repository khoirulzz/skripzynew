# 🎯 Default Spinner Implementation Guide - Skripzy

## ✨ Apa Itu DefaultSpinner?

**DefaultSpinner** adalah komponen spinner premium yang baru untuk Skripzy, menggantikan `LoadingSpinner` lama. Spinner ini memiliki animasi yang lebih smooth dan professional.

### Fitur Utama:
- ✅ Animasi smooth dengan dual-layer animation
- ✅ Ukuran responsif (tiny → xlarge)
- ✅ Warna customizable (hex color support)
- ✅ Drop shadow effect untuk depth
- ✅ Performance optimized dengan CSS animations
- ✅ Proportional untuk berbagai konteks

---

## 📍 Akses Demo

Lihat preview spinner dalam berbagai ukuran dan konteks:

**URL Demo:** `/demo-spinner`

Navigasi ke: `http://localhost:3000/demo-spinner` (atau sesuaikan dengan domain Anda)

Demo menunjukkan:
- 6 variasi ukuran (tiny, small, medium, large, xlarge, custom)
- 5+ konteks penggunaan (page loading, buttons, inputs, modals, badges)
- 4 variasi warna
- Contoh kode lengkap untuk setiap use case

---

## 🚀 Quick Start

### 1. Import
```javascript
import DefaultSpinner from '@/components/ui/DefaultSpinner';
```

### 2. Basic Usage
```javascript
// Default size (medium)
<DefaultSpinner />

// Dengan size preset
<DefaultSpinner size="large" />

// Dengan custom pixel
<DefaultSpinner sizePixel={36} />

// Dengan warna custom
<DefaultSpinner size="large" color="#10b981" />
```

---

## 📏 Size System

### Preset Sizes (Recommended)

| Size | Pixel | Use Case | Example |
|------|-------|----------|---------|
| `tiny` | 20px | Inline badges, mini indicators | `<DefaultSpinner size="tiny" />` |
| `small` | 32px | Button loaders, form fields | `<DefaultSpinner size="small" />` |
| `medium` | 48px | Modal loading, normal content | `<DefaultSpinner size="medium" />` (default) |
| `large` | 64px | Full page loading | `<DefaultSpinner size="large" />` |
| `xlarge` | 100px | Splash screens, hero sections | `<DefaultSpinner size="xlarge" />` |

### Custom Pixel Size
Untuk ukuran yang tidak ada di preset, gunakan `sizePixel`:

```javascript
// Ukuran custom 36px
<DefaultSpinner sizePixel={36} />

// Ukuran custom 128px
<DefaultSpinner sizePixel={128} />
```

---

## 🎨 Color Variations

### Default Color
```javascript
<DefaultSpinner />  // #037ef3 (Blue Primary)
```

### Custom Colors
```javascript
// Success Green
<DefaultSpinner color="#10b981" />

// Warning Yellow
<DefaultSpinner color="#f59e0b" />

// Danger Red
<DefaultSpinner color="#ef4444" />

// White (untuk dark backgrounds)
<DefaultSpinner color="#ffffff" />
```

---

## 💡 Konteks Penggunaan

### 1. Page Loading
```javascript
if (loading) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <DefaultSpinner size="large" />
    </div>
  );
}
```

### 2. Button Loading
```javascript
<button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <DefaultSpinner size="small" color="white" />
      Memproses...
    </>
  ) : (
    'Submit'
  )}
</button>
```

### 3. Input Search Loading
```javascript
<div style={{ position: 'relative' }}>
  <input
    type="text"
    placeholder="Cari..."
    disabled={isSearching}
  />
  {isSearching && (
    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
      <DefaultSpinner size="small" />
    </div>
  )}
</div>
```

### 4. Modal/Dialog Loading
```javascript
{isLoading ? (
  <div style={{ textAlign: 'center', padding: '2rem' }}>
    <DefaultSpinner size="medium" />
    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
      Menyiapkan data...
    </p>
  </div>
) : (
  // Modal content
)}
```

### 5. Inline Status Badge
```javascript
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  backgroundColor: 'rgba(79, 70, 229, 0.1)',
  borderRadius: '4px'
}}>
  <DefaultSpinner size="tiny" color="#4F46E5" />
  <span style={{ fontSize: '0.75rem' }}>Mengekstraksi...</span>
</div>
```

### 6. Full Page Loading (Auth/Redirect)
```javascript
<div style={{
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  gap: '1rem'
}}>
  <DefaultSpinner size="large" />
  <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
    Memuat sesi...
  </p>
</div>
```

---

## 📋 Props Reference

```typescript
interface DefaultSpinnerProps {
  // Preset size (recommended untuk consistency)
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
  
  // Custom pixel size (override preset)
  sizePixel?: number;
  
  // Warna spinner (hex format)
  color?: string; // default: '#037ef3'
  
  // Tailwind/custom CSS classes
  className?: string;
  
  // Inline styles
  style?: React.CSSProperties;
}
```

---

## 📁 File Locations

### Component
- **File:** `components/ui/DefaultSpinner.js`
- **Impor dari:** `@/components/ui/DefaultSpinner`

### Demo Page
- **File:** `apps/app-main/app/demo-spinner/page.js`
- **Akses:** `/demo-spinner`

### Implementation Guide
- **File:** `SPINNER_IMPLEMENTATION_GUIDE.js` (referensi)

---

## 🔄 Migration Checklist

Untuk menggunakan DefaultSpinner di seluruh aplikasi, ikuti checklist ini:

### ✅ Sudah Diupdate:
- [x] `components/auth/AuthGuard.js`
- [x] `apps/app-main/app/page.js`
- [x] `apps/app-main/app/form/PublicFormPageClient.js`

### 🔲 Perlu Diupdate:
- [ ] `components/workspace/AnimatedLoadingScreen.js` - Update import LoadingSpinner → DefaultSpinner
- [ ] `apps/app-main/app/dashboard/tools/simulasi-sidang/page.js` - Update usage
- [ ] `apps/app-main/app/dashboard/tools/referensi/page.js` - Update usage
- [ ] `apps/app-main/app/dashboard/tools/notebook/detail/NotebookDetail.js` - Update usage
- [ ] `apps/app-main/app/dashboard/jurnal/page.js` - Update usage
- [ ] `apps/app-main/app/dashboard/skripsi/page.js` - Update usage
- [ ] Semua custom components yang masih menggunakan `LoadingSpinner`

### Cara Update:
1. **Find & Replace** dalam file:
   - Cari: `import LoadingSpinner from`
   - Ganti: `import DefaultSpinner from`
   - Dan ubah: `LoadingSpinner` → `DefaultSpinner`

2. **Update props** dari pixel size ke size preset:
   - Lama: `<LoadingSpinner size={48} className="text-primary" />`
   - Baru: `<DefaultSpinner size="large" />`

---

## 🎯 Best Practices

### 1. Konsistensi Ukuran
```javascript
// ✅ BAIK - Gunakan preset sizes
<DefaultSpinner size="large" />

// ❌ HINDARI - Custom pixel untuk standard use cases
<DefaultSpinner sizePixel={64} />
```

### 2. Warna Konteks
```javascript
// ✅ BAIK - Warna sesuai konteks
<DefaultSpinner size="small" color="white" />  // On colored button
<DefaultSpinner size="small" color="#ef4444" /> // Error state

// ❌ HINDARI - Warna random
<DefaultSpinner color="#abcdef" />
```

### 3. Spacing & Layout
```javascript
// ✅ BAIK - Proper spacing
<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
  <DefaultSpinner size="small" />
  <span>Loading...</span>
</div>

// ❌ HINDARI - Cramped layout
<DefaultSpinner size="small" /> Loading...
```

### 4. State Management
```javascript
// ✅ BAIK - Clear loading state
{isLoading && <DefaultSpinner size="large" />}

// ❌ HINDARI - Always rendering
<DefaultSpinner />
```

---

## 🧪 Testing

Untuk memverifikasi spinner bekerja di semua halaman:

1. **Buka demo:** `http://localhost:3000/demo-spinner`
2. **Verifikasi semua ukuran:** Lihat apakah animasi smooth
3. **Cek responsivitas:** Buka di mobile dan desktop
4. **Test dark mode:** Spinner harus terlihat jelas di dark/light theme
5. **Performance:** Tidak ada lag saat rendering multiple spinners

---

## 🎓 Reference

### Animasi Detail
```css
@keyframes spinnerRotate {
  from { transform: scale(0.8) rotate(0deg); }
  to { transform: scale(0.8) rotate(360deg); }
}

@keyframes spinnerDash {
  0% { stroke-dashoffset: 0; }
  50% { stroke-dashoffset: 192.44; }
  100% { stroke-dashoffset: 384.88; }
}
```

### Default Styling
- **Color:** `#037ef3` (Primary Blue)
- **Duration:** 1.5s (smooth animation)
- **Shadow:** `drop-shadow(0 0 2px rgba(3, 126, 243, 0.3))`
- **Rendering:** `shape-rendering: auto`

---

## 📞 Support

Jika ada pertanyaan atau issue:
1. Lihat demo page di `/demo-spinner`
2. Cek `SPINNER_IMPLEMENTATION_GUIDE.js` untuk contoh
3. Referensi file component: `components/ui/DefaultSpinner.js`

---

**Last Updated:** 2024  
**Component Version:** 1.0  
**Status:** ✅ Production Ready
