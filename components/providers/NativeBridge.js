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

          // Cleanup any existing listener just to be safe
          await App.removeAllListeners('backButton');

          App.addListener('backButton', ({ canGoBack }) => {
            // Check jika sedang di dalam workspace yang belum disimpan
            if (window.isSkripzyWorkspaceDirty) {
              if (!window.confirm("Ada perubahan yang belum disimpan. Anda yakin ingin keluar?")) {
                return;
              }
              window.isSkripzyWorkspaceDirty = false;
            }

            const currentPath = window.location.pathname;
            const isRoot = currentPath === '/dashboard' || currentPath === '/' || currentPath === '/login';

            // Jika ada riwayat web dan BUKAN di halaman utama, mundur ke sebelumnya
            if (!isRoot && (canGoBack || window.history.length > 1)) {
              router.back();
            } else {
              // Jika ini adalah halaman awal (root), minta double tap untuk keluar
              if (window.backButtonTapTimeout) {
                App.exitApp();
              } else {
                // Buat elemen Toast sederhana
                const toast = document.createElement("div");
                toast.innerText = "Tekan kembali sekali lagi untuk keluar aplikasi";
                toast.style.position = "fixed";
                toast.style.bottom = "40px";
                toast.style.left = "50%";
                toast.style.transform = "translateX(-50%)";
                toast.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                toast.style.color = "#fff";
                toast.style.padding = "10px 16px";
                toast.style.borderRadius = "8px";
                toast.style.fontSize = "14px";
                toast.style.zIndex = "99999";
                toast.style.transition = "opacity 0.3s ease";
                document.body.appendChild(toast);

                window.backButtonTapTimeout = setTimeout(() => {
                  window.backButtonTapTimeout = null;
                  toast.style.opacity = "0";
                  setTimeout(() => {
                    if (document.body.contains(toast)) {
                      document.body.removeChild(toast);
                    }
                  }, 300);
                }, 2000);
              }
            }
          });
          
          // Simpan referensi ke global window agar bisa dibersihkan
          window.skripzyBackButtonListener = true;
        } catch (error) {
          console.error("NativeBridge init failed:", error);
        }
      }
    };

    initBridge();

    return () => {
      // Cleanup listener if component unmounts
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App }) => {
          App.removeAllListeners('backButton').catch(e => console.error(e));
        });
      }
    };
  }, [router]);

  return null;
}
