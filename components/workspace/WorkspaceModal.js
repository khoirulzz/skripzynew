"use client";

import { useState } from "react";
import { d1Request } from "@/lib/d1Client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { createWorkspacePayload } from "@/lib/workspaceDefaults";

export function WorkspaceModal({ onClose, type = "skripsi" }) {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({ 
    title: "", 
    topic: type === "data-analysis" ? "100" : "" 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const id = crypto.randomUUID();
      
      const body = {
          id,
          title: formData.title,
          description: type === "data-analysis" ? `Target: ${formData.topic} Responden` : formData.topic,
          type,
          status: "Draft",
          topic: formData.topic,
          progress: 0
      };

      await d1Request("workspaces", {
        method: "POST",
        body
      });
      
      onClose();
      if (type === "data-analysis") {
        router.push(`/dashboard/tools/data-analysis/kuesioner?id=${id}`);
      } else {
        router.push(`/dashboard/${type}/edit?id=${id}`);
      }
    } catch (err) {
      console.error("Gagal membuat workspace:", err);
      setError(err.message || "Gagal membuat workspace. Periksa koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div className="glass-panel p-8 animate-fade-in" style={{ width: "100%", maxWidth: "500px", backgroundColor: "var(--background)" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          {type === "data-analysis" ? "Tambah Kuesioner Baru" : "Buat Workspace Baru"}
        </h2>
        <p className="text-muted mb-6">
          {type === "data-analysis" 
            ? "Tentukan judul penelitian dan target responden untuk kuesioner kuantitatif Anda."
            : `Tentukan judul dan topik awal untuk proyek ${type} Anda.`}
        </p>
        
        {error && (
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", fontSize: "0.875rem", marginBottom: "1.5rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {type === "data-analysis" ? "Judul Penelitian / Kuesioner" : (type === "skripsi" ? "Judul Penelitian" : "Judul Jurnal")}
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder={type === "data-analysis" ? "Contoh: Pengaruh AI terhadap Produktivitas Belajar Mahasiswa..." : "Contoh: Pengaruh AI terhadap Produktivitas..."}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          {type === "data-analysis" ? (
            <div className="form-group">
              <label className="form-label">Target Responden (Jumlah Pengisi)</label>
              <input 
                type="number" 
                min="1"
                step="1"
                className="form-input" 
                placeholder="Contoh: 100"
                value={formData.topic}
                onChange={e => setFormData({...formData, topic: e.target.value})}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Latar Belakang Singkat / Topik</label>
              <textarea 
                className="form-input" 
                placeholder="Ceritakan sedikit tentang ide Anda agar AI Helper bisa membantu dengan pemahaman konteks yang lebih baik..."
                rows={4}
                value={formData.topic}
                onChange={e => setFormData({...formData, topic: e.target.value})}
                required
              />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Menyiapkan..." : (type === "data-analysis" ? "Buat Kuesioner" : "Buat Workspace")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
