"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Browser } from '@capacitor/browser';

export default function StatszyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function syncAndRedirect() {
      if (!auth.currentUser) {
        // Jika belum login, ke halaman login
        router.push("/login?redirect=https://stats.skripzy.id");
        return;
      }
      
      try {
        const token = await auth.currentUser.getIdToken();
        // Set cookie yang bisa dibaca oleh semua subdomain *.skripzy.id
        document.cookie = `skripzy_token=${token}; path=/; max-age=3600; domain=.skripzy.id; SameSite=Lax; Secure`;
        // Redirect ke stats app
        if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform()) {
          await Browser.open({ url: "https://stats.skripzy.id" });
          // Setelah dibuka di in-app browser, kembalikan user ke dashboard di background
          router.replace("/dashboard");
        } else {
          window.location.href = "https://stats.skripzy.id";
        }
      } catch (error) {
        console.error("Failed to sync auth token:", error);
        router.push("/dashboard");
      }
    }

    // Tunggu firebase inisialisasi state jika perlu
    const unsubscribe = auth.onAuthStateChanged((user) => {
      syncAndRedirect();
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <LoadingSpinner size={32} />
      <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Mempersiapkan StatsZy...</p>
    </div>
  );
}
