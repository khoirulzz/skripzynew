"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

export function WorkspaceModal({ onClose, type = "skripsi" }) {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({ title: "", topic: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, "workspaces"), {
        userId: user.uid,
        type: type, // "skripsi" or "jurnal"
        title: formData.title,
        topic: formData.topic,
        status: "Draft",
        contentBab1: "", 
        contentBab2: "",
        contentBab3: "",
        contentBab4: "",
        contentBab5: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      onClose();
      router.push(`/dashboard/${type}/edit?id=${docRef.id}`);
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
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Buat Workspace Baru</h2>
        <p className="text-muted mb-6">Tentukan judul dan topik awal untuk proyek {type} Anda.</p>
        
        {error && (
          <div style={{ padding: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", fontSize: "0.875rem", marginBottom: "1.5rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Judul {type === "skripsi" ? "Penelitian" : "Jurnal"}</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Contoh: Pengaruh AI terhadap Produktivitas..."
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "2rem" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Menyiapkan..." : "Buat Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
