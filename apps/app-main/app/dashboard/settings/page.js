"use client";

import { useAuth } from "@/components/providers/AuthProvider";

export default function SettingsPage() {
  const { userData } = useAuth();

  return (
    <div className="animate-fade-in" style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Pengaturan</h1>
      
      <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>Nama Lengkap</label>
          <div style={{ padding: "0.75rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            {userData?.namaLengkap || "N/A"}
          </div>
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>Email</label>
          <div style={{ padding: "0.75rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            {userData?.email || "N/A"}
          </div>
        </div>
        
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1rem" }}>
          Fitur pengaturan profil lengkap akan segera hadir.
        </p>
      </div>
    </div>
  );
}
