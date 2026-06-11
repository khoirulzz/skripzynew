"use client";

import { useEffect, useState } from "react";

export default function NetworkObserver() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.Capacitor || !window.Capacitor.isNativePlatform()) {
      return;
    }

    let networkListener;

    const initNetwork = async () => {
      try {
        const { Network } = await import('@capacitor/network');
        
        // Initial check
        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        // Listen for changes
        networkListener = await Network.addListener('networkStatusChange', status => {
          setIsOffline(!status.connected);
        });
      } catch (error) {
        console.error("Network observer init failed:", error);
      }
    };

    initNetwork();

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-center py-2 z-[99999] shadow-md text-sm font-medium animate-in slide-in-from-top duration-300">
      Koneksi internet terputus. Menunggu sinyal...
    </div>
  );
}
