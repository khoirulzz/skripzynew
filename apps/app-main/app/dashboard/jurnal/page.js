"use client";

import { useState, useEffect } from "react";
import { d1Request } from "@/lib/d1Client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Link from "next/link";

export default function JurnalListPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!user) return;
      try {
        const response = await d1Request("workspaces");
        let fetched = response.data || [];
        
        fetched = fetched.filter(ws => ws.type === "jurnal");

        fetched.sort((a,b) => {
            const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return timeB - timeA;
        });

        fetched = fetched.map(ws => ({
            ...ws,
            updatedAt: { toMillis: () => new Date(ws.updated_at || ws.created_at || Date.now()).getTime() }
        }));
        setWorkspaces(fetched);
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
        setError("Gagal memuat workspace.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchWorkspaces();
  }, [user]);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus proyek jurnal ini? Tindakan ini tidak dapat dibatalkan.")) return;
    
    try {
      await d1Request("workspaces", { method: "DELETE", id });
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
    } catch (err) {
      console.error("Failed to delete workspace", err);
      alert("Gagal menghapus jurnal. Silakan coba lagi.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.25rem" : "1.75rem", margin: 0 }}>Proyek Jurnal Akademik</h1>
          <p className="text-muted" style={{ margin: "0.2rem 0 0 0", fontSize: isMobile ? "0.75rem" : "1rem" }}>Kelola draf manuskrip jurnal Anda</p>
        </div>
        <Link href="/dashboard/jurnal/create" className="btn btn-primary">
          <PremiumIcon name="fileText" size={18} />
          <span className="hide-mobile">Buat Jurnal Baru</span>
          <span className="show-mobile">Baru</span>
        </Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <LoadingSpinner size={32} className="text-primary" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PremiumIcon name="fileText" size={32} className="text-muted" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Belum ada draf jurnal</h3>
            <p className="text-muted" style={{ margin: "0.5rem 0 0 0" }}>Mulailah dengan mengunggah template jurnal untuk membuat workspace baru.</p>
          </div>
          <Link href="/dashboard/jurnal/create" className="btn btn-outline mt-4">
            + Buat Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ overflow: "hidden" }}>
          {workspaces.map(ws => (
            <div key={ws.id} style={{ position: "relative", borderRadius: "12px", overflow: "hidden" }}>
              <Link href={`/dashboard/jurnal/edit?id=${ws.id}`} className="glass-panel btn-ghost p-6" style={{ display: "block", textAlign: "left", borderRadius: "12px", transition: "transform 0.2s", overflow: "hidden", wordWrap: "break-word", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", minWidth: 0, paddingRight: "2rem" }}>
                  <div style={{ padding: "0.5rem", backgroundColor: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", flexShrink: 0 }}>
                    <PremiumIcon name="bookOpen" className="text-success" size={24} />
                  </div>
                  <span style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "var(--surface-hover)", borderRadius: "10px", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {ws.status || "Draft"}
                  </span>
                </div>
                <h3 style={{ fontSize: isMobile ? "0.95rem" : "1.1rem", margin: "0 0 0.5rem 0", color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                  {ws.title || "Tanpa Judul"}
                </h3>
                <p style={{ fontSize: isMobile ? "0.75rem" : "0.875rem", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", height: isMobile ? "2.2rem" : "2.6rem", wordWrap: "break-word" }}>
                  {ws.topic || "Belum ada topik..."}
                </p>
                <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Update: {ws.updatedAt ? new Date(ws.updatedAt.toMillis()).toLocaleDateString('id-ID') : "Baru saja"}
                </div>
              </Link>
              <button 
                onClick={(e) => handleDelete(ws.id, e)}
                className="btn btn-ghost" 
                style={{ 
                  position: "absolute", 
                  top: "1rem", 
                  right: "1rem", 
                  padding: "0.5rem", 
                  color: "var(--danger)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  zIndex: 10,
                  cursor: "pointer",
                  pointerEvents: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                }}
                title="Hapus Jurnal"
              >
                <PremiumIcon name="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
