"use client";

import { useEffect } from "react";

export default function OTAUpdater() {
  useEffect(() => {
    // Hanya jalankan jika berada di dalam Capacitor (Android/iOS)
    const initOTA = async () => {
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
          // Import plugin secara dinamis agar tidak error di web biasa
          const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

          // Beritahu sistem native bahwa web berhasil dimuat
          // (Ini penting agar Capgo tahu aplikasi tidak crash)
          await CapacitorUpdater.notifyAppReady();

          // 1. Cek versi terbaru dari GitHub
          // Pastikan file version.json ter-cache-busting
          const response = await fetch(`https://raw.githubusercontent.com/khoirulzz/skripzynew/main/version.json?t=${new Date().getTime()}`);
          
          if (!response.ok) return;
          
          const data = await response.json();
          const { version, url } = data;

          // Dapatkan versi aplikasi yang sedang berjalan
          const currentVersionRes = await CapacitorUpdater.current();
          const currentVersion = currentVersionRes.id || "1.0.0"; // id adalah versi

          if (version !== currentVersion) {
            console.log(`Update tersedia: ${version}. Mengunduh dari: ${url}`);
            
            // 2. Download ZIP update dari GitHub Releases
            const downloadRes = await CapacitorUpdater.download({
              url: url,
              version: version
            });

            // 3. Terapkan update (Aplikasi akan otomatis memakai versi baru pada pembukaan selanjutnya)
            await CapacitorUpdater.set({
              id: downloadRes.id
            });
            console.log("Update berhasil diunduh dan disiapkan untuk startup berikutnya.");
          }

        } catch (error) {
          console.error("Gagal melakukan OTA update:", error);
        }
      }
    };

    initOTA();
  }, []);

  return null; // Komponen ini tidak me-render UI apapun
}
