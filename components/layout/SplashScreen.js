"use client";

import { useEffect, useState } from "react";

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
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Kosong sesuai permintaan agar tidak ada double loader */}
      </div>
    </div>
  );
}
