'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installPromptShown, setInstallPromptShown] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration);

          // Check for updates periodically (every hour)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Handle controller change (when new SW is activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed');
      });
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Auto-show prompt after 3 seconds if user hasn't closed app yet
      if (!installPromptShown && localStorage.getItem('pwa-install-shown') !== 'true') {
        setTimeout(() => {
          showInstallPrompt();
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA was installed');
      setDeferredPrompt(null);
      setIsInstallable(false);
      localStorage.setItem('pwa-install-shown', 'true');
      localStorage.setItem('pwa-installed', 'true');

      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Skripzy Installed', {
          body: 'Aplikasi Skripzy telah berhasil diinstal!',
          icon: '/icons/icon-192x192.png',
        });
      }
    });

    // Check if app is running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      localStorage.setItem('pwa-running-standalone', 'true');
      console.log('✅ Running in standalone mode');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const showInstallPrompt = async () => {
    if (!deferredPrompt) {
      return;
    }

    setInstallPromptShown(true);
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
      localStorage.setItem('pwa-install-shown', 'true');
    }

    setDeferredPrompt(null);
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        new Notification('Notifikasi Diaktifkan', {
          body: 'Anda sekarang akan menerima notifikasi dari Skripzy',
          icon: '/icons/icon-192x192.png',
        });
      }
    }
  };

  // Clear old caches (useful for debugging)
  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('✅ All caches cleared');

      // Notify service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE',
        });
      }
    }
  };

  // Force service worker update
  const forceServiceWorkerUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registrations.forEach((registration) => {
        registration.update();
      });
      console.log('✅ Service Worker update triggered');
    }
  };

  // This component doesn't render anything, it just handles registrations
  return null;
}
