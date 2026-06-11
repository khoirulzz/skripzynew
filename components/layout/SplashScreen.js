"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Mengecek apakah aplikasi berjalan di Capacitor
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
    
    // Mulai memudarkan (fade out) splash screen setelah 2 detik
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Menghapus komponen dari DOM setelah transisi fade out selesai (2.5 detik total)
    const removeTimer = setTimeout(() => {
      setShow(false);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Logo Utama */}
        <div className="relative z-10 flex items-center justify-center">
          <Image
            src="/logo-skripzy.webp"
            alt="Skripzy Logo"
            width={120}
            height={120}
            className="rounded-2xl shadow-lg"
            priority
          />
        </div>
      </div>
    </div>
  );
}
