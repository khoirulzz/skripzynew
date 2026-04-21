"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import { WorkspaceModal } from "@/components/workspace/WorkspaceModal";

export default function SkripsiListPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!user) return;
      try {
        const q = query(
          collection(db, "workspaces"), 
          where("userId", "==", user.uid),
          where("type", "==", "skripsi")
          // orderBy dihapus – membutuhkan composite index. Sort dilakukan di memori.
        );
        const querySnapshot = await getDocs(q);
        const fetched = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        // Sort by updatedAt descending in memory
        fetched.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
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
    <div className="animate-fade-in">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Proyek Skripsi</h1>
          <p className="text-muted" style={{ margin: 0 }}>Kelola dokumen penelitian Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <PremiumIcon name="fileText" size={18} />
          <span className="hide-mobile">Buat Skripsi Baru</span>
          <span className="show-mobile">Baru</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <PremiumIcon name="zap" size={32} className="text-primary animate-pulse" />
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
            <Link key={ws.id} href={`/dashboard/skripsi/${ws.id}`} className="glass-panel btn-ghost p-6" style={{ display: "block", textAlign: "left", borderRadius: "12px", transition: "transform 0.2s", overflow: "hidden", wordWrap: "break-word", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", minWidth: 0 }}>
                <div style={{ padding: "0.5rem", backgroundColor: "rgba(79, 70, 229, 0.1)", borderRadius: "8px", flexShrink: 0 }}>
                  <PremiumIcon name="fileText" className="text-primary" size={24} />
                </div>
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", backgroundColor: "var(--surface-hover)", borderRadius: "10px", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", marginLeft: "0.5rem", flexShrink: 0 }}>
                  {ws.status || "Draft"}
                </span>
              </div>
              <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0", color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {ws.title || "Tanpa Judul"}
              </h3>
              <p style={{ fontSize: "0.875rem", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", height: "2.6rem", wordWrap: "break-word" }}>
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
