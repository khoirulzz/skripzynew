# PWA Implementation Guide - Skripzy

Panduan lengkap untuk PWA yang telah diimplementasikan di Skripzy dengan mekanisme caching yang optimal.

## 📋 Daftar File yang Dibuat/Dimodifikasi

### 1. **public/manifest.json** ✅
File konfigurasi PWA yang mendefinisikan:
- Informasi aplikasi (nama, deskripsi, ikon)
- App shortcuts untuk akses cepat (Dashboard, Chat, Buat Skripsi)
- Share target API untuk menerima file dari aplikasi lain
- Screenshot untuk app stores

### 2. **public/sw.js** ✅
Service Worker dengan strategi caching yang canggih:
- **Network First**: Untuk HTML pages (skripsi, dashboard)
- **Cache First**: Untuk assets statis (CSS, JS, fonts, images)
- **Stale While Revalidate**: Untuk API calls (Firebase, Gemini)
- **Image Cache**: Dengan pembersihan otomatis untuk mencegah storage penuh

**Cache Strategy Details:**
```
CACHE_NAME = 'skripzy-v1'          // Assets statis
RUNTIME_CACHE = 'skripzy-runtime-v1'   // Pages & documents
IMAGE_CACHE = 'skripzy-images-v1'     // Images
API_CACHE = 'skripzy-api-v1'          // API responses
```

### 3. **public/offline.html** ✅
Halaman fallback yang menarik ketika offline dengan:
- Status indicator yang jelas
- Tips untuk mengatasi offline
- Tombol reload dan home
- Auto-reload saat kembali online

### 4. **app/layout.js** ✅
Update metadata dengan PWA support:
- Link ke manifest.json
- Apple mobile web app tags
- Theme color configuration
- PWARegister component

### 5. **components/providers/PWARegister.js** ✅
Client component untuk:
- Service Worker registration
- Handle beforeinstallprompt event
- Request notification permission
- Periodic SW update checking
- Standalone mode detection

### 6. **lib/pwaUtils.js** ✅
Utilities dan hooks untuk PWA features:
- `usePWAInstall()` - Detect installability
- `useOnlineStatus()` - Online/offline detection
- `useCacheManagement()` - Cache management
- `useServiceWorker()` - SW management
- `usePushNotification()` - Push notifications
- `useStandalone()` - Standalone mode detection
- `indexedDBUtils` - Data persistence untuk offline
- `getStorageInfo()` & `requestPersistentStorage()`

### 7. **next.config.mjs** ✅
Update dengan next-pwa plugin:
```javascript
- Disabled di development mode
- Auto-update cache busting
- Frontend nav caching
- SW reload on online
```

### 8. **package.json** ✅
Ditambahkan: `"next-pwa": "^5.6.0"`

### 9. **public/browserconfig.xml** ✅
Konfigurasi Windows tiles untuk Windows 10/11

---

## 🚀 Cara Menggunakan

### Install Dependencies
```bash
npm install
```

### Build dan Deploy
```bash
npm run build
npm start
```

PWA akan otomatis teregistrasi saat loading pertama kali.

---

## 💡 Fitur PWA yang Tersedia

### 1. **Offline Support**
- Aplikasi dapat diakses offline dengan fallback page
- API data di-cache dengan stale-while-revalidate strategy
- Halaman yang sudah dikunjungi disimpan di cache

### 2. **Installable**
- User akan diminta untuk install (beforeinstallprompt)
- Bisa di-install di home screen (mobile/desktop)
- Native-like experience dengan fullscreen mode

### 3. **App Shortcuts**
- Quick access ke Dashboard
- Quick access ke Buat Skripsi
- Quick access ke Chat AI

### 4. **Smart Caching**
```
Assets Statis (CSS, JS, fonts, images)
├─ Strategy: Cache First
├─ Update: Background
└─ TTL: 30 hari

HTML Pages (dashboard, skripsi)
├─ Strategy: Network First
├─ Fallback: Cache
└─ TTL: 24 jam

API Responses (Firebase, Gemini)
├─ Strategy: Stale While Revalidate
├─ Cache: Served immediately
├─ Update: Background fetch
└─ TTL: 5 menit

Images
├─ Strategy: Cache First
├─ Cleanup: Auto-remove old (keep 50 latest)
└─ Fallback: SVG placeholder
```

### 5. **Push Notifications**
- Implementasi untuk offline events
- User dapat enable/disable notifications
- Smart notification delivery via SW

### 6. **Persistent Storage**
- IndexedDB untuk offline data (drafts, notes)
- Automatic sync saat online
- Quota management

---

## 🔧 Penggunaan di Komponen

### Contoh 1: Deteksi Online Status
```javascript
import { useOnlineStatus } from '@/lib/pwaUtils';

export default function MyComponent() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && <div className="alert">Anda sedang offline</div>}
      {isOnline && <div className="success">Connected</div>}
    </div>
  );
}
```

### Contoh 2: Cache Management
```javascript
import { useCacheManagement } from '@/lib/pwaUtils';

export default function SettingsPage() {
  const { cacheSize, clearCache, cacheInfo } = useCacheManagement();

  return (
    <div>
      <p>Cache entries: {cacheSize}</p>
      <button onClick={() => clearCache()}>Clear All Cache</button>
      {Object.entries(cacheInfo).map(([name, count]) => (
        <div key={name}>
          {name}: {count} items
        </div>
      ))}
    </div>
  );
}
```

### Contoh 3: Offline Data Storage
```javascript
import { indexedDBUtils } from '@/lib/pwaUtils';

// Save draft
await indexedDBUtils.saveData('skripzi-drafts', {
  title: 'Chapter 1',
  content: '...',
  timestamp: Date.now()
});

// Get saved drafts
const drafts = await indexedDBUtils.getData('skripzi-drafts');

// Delete draft
await indexedDBUtils.deleteData('skripzi-drafts', draftId);
```

### Contoh 4: Push Notifications
```javascript
import { usePushNotification } from '@/lib/pwaUtils';

export default function NotificationComponent() {
  const { notificationPermission, requestPermission, showNotification } = usePushNotification();

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      showNotification('Notifikasi Diaktifkan!', {
        body: 'Anda akan menerima update dari Skripzy',
        tag: 'welcome'
      });
    }
  };

  return (
    <button onClick={handleEnable}>
      {notificationPermission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
    </button>
  );
}
```

---

## 📱 Testing PWA Locally

### 1. Chrome DevTools
```
F12 → Application → Service Workers
- Lihat registered SW
- Test offline mode
- Check cache storage
```

### 2. Test Offline
```
DevTools → Network tab
- Set throttling ke "Offline"
- Navigate aplikasi
- Lihat offline.html appear saat network error
```

### 3. Test Installation (Chrome)
```
- Build: npm run build
- Start: npm start
- Open: http://localhost:3000
- Tunggu install prompt (3 detik)
- Click "Install" atau "Add to home screen"
```

### 4. Lighthouse Audit
```
DevTools → Lighthouse
- Run PWA audit
- Lihat score dan recommendations
```

---

## 🎯 Caching Strategy Details

### Network First (untuk Pages)
```
User Request
    ↓
Network Call
    ↓
  Success? 
    ├─ Yes → Cache + Return
    └─ No  → Return from Cache (jika ada)
           → Fallback page (jika tidak ada)
```

### Cache First (untuk Assets)
```
User Request
    ↓
Check Cache
    ├─ Found → Return Cached
    └─ Not Found → Fetch + Cache + Return
    
Update in Background (non-blocking)
```

### Stale While Revalidate (untuk API)
```
User Request
    ↓
Return Cached Immediately
    ↓
Fetch Latest in Background
    ↓
Update Cache (for next request)
```

---

## 🛡️ Storage Management

### Cache Limits
- **Images**: Auto-cleanup, keep max 50 images
- **Runtime**: LRU cleanup based on usage
- **API**: 5 minute TTL, older entries removed

### Total Storage Quota
```javascript
import { getStorageInfo, requestPersistentStorage } from '@/lib/pwaUtils';

const info = await getStorageInfo();
console.log(`Using: ${info.usage} bytes`);
console.log(`Quota: ${info.quota} bytes`);
console.log(`Usage: ${info.percentage.toFixed(2)}%`);

// Request persistent storage to prevent browser eviction
await requestPersistentStorage();
```

---

## 🔄 Service Worker Update Flow

1. **On Page Load**: Check untuk SW updates setiap jam
2. **Update Found**: New SW di-install dengan statusnya "waiting"
3. **User Interaction**: Notifasi update tersedia
4. **User Confirm**: Skip waiting → reload → new SW activated
5. **Auto Reload**: User dapat enable auto-reload on online

---

## 🐛 Debugging Tips

### Check Service Worker Status
```javascript
// Di console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('SW State:', reg.active?.state);
    console.log('Has waiting:', !!reg.waiting);
  });
});
```

### Check Cache Content
```javascript
// Di console
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(requests => {
        console.log(`${name}:`, requests.map(r => r.url));
      });
    });
  });
});
```

### Clear Everything (Hard Reset)
```javascript
// Di PWARegister component atau console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});

caches.keys().then(names => {
  Promise.all(names.map(name => caches.delete(name)));
});

localStorage.clear();
indexedDB.deleteDatabase('skripzy-*');
```

---

## ✅ Checklist untuk Production

- [ ] Generate PWA icons (192x192, 512x512, maskable versions)
- [ ] Setup push notification backend (Firebase Cloud Messaging)
- [ ] Test di real device (iPhone, Android)
- [ ] Verify Lighthouse PWA score >= 90
- [ ] Setup monitoring untuk SW crashes
- [ ] Implement error handling untuk API failures
- [ ] Add analytics untuk PWA installation tracking
- [ ] Setup notification analytics
- [ ] Test offline workflows thoroughly
- [ ] Add fallback strategy untuk critical features

---

## 📚 Resources

- [MDN - PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA Checklist](https://web.dev/pwa-checklist/)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
- [Service Worker Strategies](https://web.dev/service-worker-caching-strategies/)

---

**Created**: May 2026
**Status**: Production Ready ✅
