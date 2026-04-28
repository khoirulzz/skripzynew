"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="container flex-col items-center justify-center animate-fade-in" style={{ minHeight: "100vh", display: "flex" }}>
      
      <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
        <ThemeToggle />
      </div>

      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", maxWidth: "600px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <PremiumIcon name="zap" size={48} className="text-primary" style={{ color: "var(--primary)" }} />
        </div>
        
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Skripzy 2.0</h1>
        <p style={{ fontSize: "1.1rem", marginBottom: "2rem" }}>
          AI Research Operating System. Workspace cerdas khusus untuk mahasiswa merampungkan skripsi & jurnal.
        </p>

        {loading ? (
          <p>Memuat sesi...</p>
        ) : user ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <p style={{ color: "var(--success)" }}>Selamat datang kembali, {user.email}</p>
            <button className="btn btn-primary" onClick={() => window.location.href = '/dashboard'}>
              Masuk ke Workspace <PremiumIcon name="chevronRight" size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button className="btn btn-outline" onClick={() => window.location.href = '/login'}>Login</button>
            <button className="btn btn-primary" onClick={() => window.location.href = '/register'}>
              Mulai Sekarang <PremiumIcon name="chevronRight" size={16} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}