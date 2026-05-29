"use client";

import { useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function FormRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function syncAndRedirect() {
      if (!auth.currentUser) {
        // Jika belum login, ke halaman login
        router.push("/login?redirect=http://localhost:3002");
        return;
      }
      
      try {
        const token = await auth.currentUser.getIdToken();
        // Set cookie yang bisa dibaca oleh localhost (atau .skripzy.id di production)
        document.cookie = `skripzy_token=${token}; path=/; max-age=3600; SameSite=Lax`;
        
        // Redirect ke form app
        window.location.href = "http://localhost:3002";
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
      <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>Mempersiapkan Form Kuesioner...</p>
    </div>
  );
}
