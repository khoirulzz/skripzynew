/**
 * PWA Hooks dan Utilities untuk Skripzy
 * Menyediakan fungsi-fungsi untuk berinteraksi dengan PWA features
 */

import { useEffect, useState } from 'react';

/**
 * Hook untuk mendeteksi dan mengelola PWA installation
 */
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed =
      localStorage.getItem('pwa-installed') === 'true' ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(installed);

    // Check if installable
    const beforeInstallPrompt = (e) => {
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', beforeInstallPrompt);
  }, []);

  return { canInstall, isInstalled };
};

/**
 * Hook untuk mendeteksi status online/offline
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('❌ Now offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Hook untuk mengelola cache
 */
export const useCacheManagement = () => {
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheInfo, setCacheInfo] = useState({});

  useEffect(() => {
    if ('caches' in window) {
      updateCacheInfo();
    }
  }, []);

  const updateCacheInfo = async () => {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    const info = {};

    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      info[name] = keys.length;
      totalSize += keys.length;
    }

    setCacheInfo(info);
    setCacheSize(totalSize);
  };

  const clearCache = async (cacheName = null) => {
    if (!('caches' in window)) return;

    if (cacheName) {
      await caches.delete(cacheName);
    } else {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    await updateCacheInfo();
  };

  const clearOldCaches = async () => {
    if (!('caches' in window)) return;

    const cacheNames = await caches.keys();
    const oldPattern = /v\d+/;
    const toDelete = cacheNames.filter((name) => {
      const match = name.match(/v(\d+)/);
      return match && match[1] < 1; // Keep v1 and higher
    });

    await Promise.all(toDelete.map((name) => caches.delete(name)));
    await updateCacheInfo();
  };

  return {
    cacheSize,
    cacheInfo,
    clearCache,
    clearOldCaches,
    updateCacheInfo,
  };
};

/**
 * Hook untuk mengelola service worker
 */
export const useServiceWorker = () => {
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistration(registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });
    }
  }, []);

  const updateServiceWorker = () => {
    if (swRegistration) {
      swRegistration.unregister();
      window.location.reload();
    }
  };

  const skipWaiting = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    swRegistration,
    updateAvailable,
    updateServiceWorker,
    skipWaiting,
  };
};

/**
 * Hook untuk notifikasi push
 */
export const usePushNotification = () => {
  const [notificationPermission, setNotificationPermission] = useState(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission === 'granted';
  };

  const showNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          ...options,
        });
      }
    }
  };

  return {
    notificationPermission,
    requestPermission,
    showNotification,
  };
};

/**
 * Hook untuk mendeteksi mode standalone
 */
export const useStandalone = () => {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => setIsStandalone(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isStandalone;
};

/**
 * Utility untuk menyimpan data ke IndexedDB untuk offline support
 */
export const indexedDBUtils = {
  async openDB(dbName, version = 1) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveData(dbName, data) {
    const db = await this.openDB(dbName);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('data', 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getData(dbName) {
    const db = await this.openDB(dbName);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('data', 'readonly');
      const store = transaction.objectStore('data');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteData(dbName, id) {
    const db = await this.openDB(dbName);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('data', 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};

/**
 * Utility untuk mendeteksi ukuran storage
 */
export const getStorageInfo = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
  return null;
};

/**
 * Utility untuk merequest persistent storage
 */
export const requestPersistentStorage = async () => {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${persistent ? 'granted' : 'denied'}`);
      return persistent;
    } catch (error) {
      console.error('Error requesting persistent storage:', error);
      return false;
    }
  }
  return false;
};
