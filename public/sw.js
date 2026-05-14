// Service Worker untuk Skripzy PWA
// Versi: 1.0.0

const CACHE_NAME = 'skripzy-v1';
const RUNTIME_CACHE = 'skripzy-runtime-v1';
const IMAGE_CACHE = 'skripzy-images-v1';
const API_CACHE = 'skripzy-api-v1';

// Assets yang harus di-cache saat instalasi
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Routes yang menggunakan strategi berbeda
const CACHE_STRATEGIES = {
  // Network first untuk dokumen HTML (skripsi, pages)
  'network-first-pages': {
    pattern: /\.(html|json)$/,
    maxAge: 24 * 60 * 60 * 1000, // 24 jam
  },
  // Cache first untuk assets statis
  'cache-first-assets': {
    pattern: /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)$/,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 hari
  },
  // Stale while revalidate untuk API calls
  'stale-while-revalidate-api': {
    pattern: /^https:\/\/(.*\/api\/|firestore\.googleapis\.com|googleapis\.com)/,
    maxAge: 5 * 60 * 1000, // 5 menit
  },
};

// Event: Install - Cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Some assets failed to cache:', err);
        // Continue even if some assets fail
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Event: Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName.startsWith('skripzy-') &&
              ![CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE, API_CACHE].includes(
                cacheName
              )
            );
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Event: Fetch - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different request types
  if (request.destination === 'image') {
    event.respondWith(cacheImages(request));
  } else if (request.url.includes('/api/') || request.url.includes('googleapis.com')) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// Network First Strategy - Try network, fallback to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline fallback
    return new Response('Offline - Halaman tidak tersedia', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

// Cache First Strategy - Return from cache, update in background
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Update cache in background
    fetch(request.clone())
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response));
        }
      })
      .catch(() => {}); // Silently fail

    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline - Asset tidak tersedia', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Stale While Revalidate Strategy - Return cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  // Start fetching in the background
  const fetchPromise = fetch(request.clone()).then((response) => {
    if (response.ok) {
      // Clone the response immediately while it's still fresh
      const responseToCache = response.clone();
      caches.open(API_CACHE).then((cache) => {
        cache.put(request, responseToCache);
      });
    }
    return response;
  });

  return cached || fetchPromise.catch(() => {
    // If both cache and fetch fail, return error
    return new Response(
      JSON.stringify({
        error: 'Offline - Data tidak tersedia',
        cached: false,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      }
    );
  });
}

// Image Caching Strategy - Cache with size limit
async function cacheImages(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());

      // Cleanup old images if cache size exceeds limit
      cleanupImageCache();
    }
    return response;
  } catch (error) {
    // Return placeholder image
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect fill="#f0f0f0" width="100" height="100"/>
        <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999" font-size="12">
          Offline
        </text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
        },
      }
    );
  }
}

// Cleanup image cache if it gets too large
async function cleanupImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();

  // Keep only last 50 images
  if (keys.length > 50) {
    const toDelete = keys.slice(0, keys.length - 50);
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  }
}

// Message handling for cache control
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    });
  }
});
