"use client";

import { useState, useEffect } from "react";
import { d1Request } from "@/lib/d1Client";

import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import DefaultSpinner from "@/components/ui/DefaultSpinner";
import Link from "next/link";
import { WorkspaceModal } from "@/components/workspace/WorkspaceModal";

export default function SkripsiListPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        
        // Filter by type "skripsi" (case insensitive logic or strict equality)
        fetched = fetched.filter(ws => ws.type === "skripsi");

        // Sort by updatedAt descending in memory
        fetched.sort((a,b) => {
            const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return timeB - timeA;
        });
        
        // Map updated_at to updatedAt for compatibility with UI components
        fetched = fetched.map(ws => ({
            ...ws,
            updatedAt: { toMillis: () => new Date(ws.updated_at || ws.created_at || Date.now()).getTime() }
        }));
        
        setWorkspaces(fetched);
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
        setError("Gagal memuat workspace. Pastikan Index Firestore sudah dibuat atau periksa koneksi.");
      } finally {
        setLoading(false);
      }
    }
    
    // Fetch only if the modal is NOT open, to reload list after returning from modal
    if (!isModalOpen) fetchWorkspaces();
  }, [user, isModalOpen]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? "2rem" : 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "1.5rem" : "2rem", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.25rem" : "1.75rem", margin: 0 }}>Proyek Skripsi</h1>
          <p className="text-muted" style={{ margin: "0.2rem 0 0 0", fontSize: isMobile ? "0.75rem" : "1rem" }}>Kelola dokumen penelitian Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ padding: isMobile ? "0.5rem 0.75rem" : "0.6rem 1rem", fontSize: isMobile ? "0.85rem" : "1rem" }}>
          <PremiumIcon name="fileText" size={isMobile ? 16 : 18} />
          <span className="hide-mobile">Buat Skripsi Baru</span>
          <span className="show-mobile">Baru</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <DefaultSpinner size="small" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PremiumIcon name="fileText" size={32} className="text-muted" />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Belum ada skripsi</h3>
            <p className="text-muted" style={{ margin: "0.5rem 0 0 0" }}>Mulailah dengan membuat workspace skripsi baru.</p>
          </div>
          <button className="btn btn-outline mt-4" onClick={() => setIsModalOpen(true)}>
            + Buat Sekarang
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ overflow: "hidden" }}>
          {workspaces.map(ws => (
            <Link key={ws.id} href={`/dashboard/skripsi/edit?id=${ws.id}`} className="glass-panel btn-ghost p-6" style={{ display: "block", textAlign: "left", borderRadius: "12px", transition: "transform 0.2s", overflow: "hidden", wordWrap: "break-word", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", minWidth: 0 }}>
                <div style={{ padding: "0.5rem", backgroundColor: "rgba(79, 70, 229, 0.1)", borderRadius: "8px", flexShrink: 0 }}>
                  <PremiumIcon name="fileText" className="text-primary" size={24} />
                </div>
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "var(--surface-hover)", borderRadius: "10px", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", marginLeft: "0.5rem", flexShrink: 0 }}>
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
          ))}
        </div>
      )}

      {isModalOpen && <WorkspaceModal onClose={() => setIsModalOpen(false)} type="skripsi" />}
    </div>
  );
}
