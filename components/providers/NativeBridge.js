"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    const initBridge = async () => {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
          const { App } = await import('@capacitor/app');

          App.addListener('backButton', ({ canGoBack }) => {
            // Jika ada riwayat web (Bukan root url), mundur ke sebelumnya
            if (canGoBack || window.history.length > 1) {
              router.back();
            } else {
              // Jika ini adalah halaman awal (root), tutup aplikasi
              App.exitApp();
            }
          });
        } catch (error) {
          console.error("NativeBridge init failed:", error);
        }
      }
    };

    initBridge();
  }, [router]);

  return null;
}
