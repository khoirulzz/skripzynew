"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { d1Request } from "@/lib/d1Client";

const MAX_NOTEBOOKS_FREE = 5;
const MAX_JOURNALS_PER_NOTEBOOK = 10;

export default function NotebookDashboardPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const plan = userData?.plan || "free";

  const [notebooks, setNotebooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [docCounts, setDocCounts] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (user) fetchNotebooks();
  }, [user]);

  const fetchNotebooks = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch notebooks from D1
      const nbRes = await d1Request("notebooks");
      if (nbRes && nbRes.data) {
        // Sort by created_at desc locally
        const sorted = nbRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setNotebooks(sorted);
      } else {
        setNotebooks([]);
      }

      // 2. Fetch document counts per notebook from D1 document_metadata
      const docRes = await d1Request("document_metadata");
      if (docRes && docRes.data) {
        const counts = {};
        docRes.data.forEach(d => {
          const nbId = d.notebook_id;
          if (!nbId) return;
          if (!counts[nbId]) counts[nbId] = 0;
          counts[nbId]++;
        });
        setDocCounts(counts);
      }
    } catch (err) {
      console.error("Error fetching notebooks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    if (plan === "free" && notebooks.length >= MAX_NOTEBOOKS_FREE) {
      alert(`Pengguna gratis hanya bisa membuat maksimal ${MAX_NOTEBOOKS_FREE} notebook. Upgrade ke Pro untuk unlimited!`);
      return;
    }
    setIsCreating(true);
    try {
      await d1Request("notebooks", {
        method: "POST",
        body: {
          id: `nb_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: newTitle.trim(),
          description: newDesc.trim() || "Notebook referensi penelitian",
        }
      });
      setNewTitle("");
      setNewDesc("");
      setShowCreateModal(false);
      fetchNotebooks();
    } catch (err) {
      console.error("Error creating notebook:", err);
      alert("Gagal membuat notebook: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // IDEALNYA: Hapus dari vectorize & dokumennya juga.
      // Untuk sekarang, kita hapus notebook-nya dari D1.
      await d1Request("notebooks", { method: "DELETE", id: deleteTarget.id });
      setDeleteTarget(null);
      fetchNotebooks();
    } catch (err) {
      console.error("Error deleting notebook:", err);
      alert("Gagal menghapus notebook: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const canCreate = plan !== "free" || notebooks.length < MAX_NOTEBOOKS_FREE;

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1080px", margin: "0 auto", color: "var(--text-main)", paddingBottom: isMobile ? "2rem" : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", marginBottom: isMobile ? "1.5rem" : "2rem", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)" }}>
            <PremiumIcon name="arrowLeft" size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: isMobile ? "1.25rem" : "1.5rem", fontWeight: 700, margin: 0 }}>Notebook Referensi</h1>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
              Kelola projek referensi RAG
            </p>
          </div>
        </div>
        <button
          onClick={() => canCreate ? setShowCreateModal(true) : alert(`Maksimal ${MAX_NOTEBOOKS_FREE} notebook untuk plan gratis.`)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: isMobile ? "0.5rem 1rem" : "0.6rem 1.25rem", borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "white",
            border: "none", cursor: "pointer", fontWeight: 600, fontSize: isMobile ? "0.8rem" : "0.875rem",
            transition: "all 0.2s", boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
            opacity: canCreate ? 1 : 0.5,
            width: isMobile ? "100%" : "auto", justifyContent: "center"
          }}
          onMouseOver={e => { if (canCreate && !isMobile) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseOut={e => { if (canCreate && !isMobile) e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <PremiumIcon name="plus" size={16} /> Buat Notebook
        </button>
      </div>

      {/* Limit Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <PremiumIcon name="layers" size={14} />
        <span>{notebooks.length}{plan === "free" ? ` / ${MAX_NOTEBOOKS_FREE}` : ""} Notebook</span>
        <span style={{ margin: "0 0.25rem" }}>•</span>
        <span>Maks. {MAX_JOURNALS_PER_NOTEBOOK} jurnal per notebook</span>
        <span style={{ margin: "0 0.25rem" }}>•</span>
        <span>PDF &lt; 3MB</span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? "0.75rem" : "1.25rem" }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel animate-pulse" style={{ height: "180px", borderRadius: "var(--radius-md)", margin: 0 }} />
          ))}
        </div>
      ) : notebooks.length === 0 ? (
        <div className="glass-panel" style={{ padding: isMobile ? "2rem 1rem" : "4rem 2rem", textAlign: "center", margin: 0 }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "rgba(79,70,229,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
            <PremiumIcon name="bookMarked" size={36} style={{ color: "var(--primary)" }} />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>Belum ada Notebook</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1.5rem", maxWidth: "360px", marginLeft: "auto", marginRight: "auto" }}>
            Buat notebook baru untuk mulai mengunggah jurnal referensi.
          </p>
          <button onClick={() => setShowCreateModal(true)} style={{
            padding: "0.6rem 1.5rem", borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "white",
            border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
          }}>
            <PremiumIcon name="plus" size={16} /> Buat Notebook Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? "0.75rem" : "1.25rem" }}>
          {notebooks.map(nb => {
            const journalCount = docCounts[nb.id] || 0;
            return (
              <div
                key={nb.id}
                className="glass-panel"
                style={{
                  padding: "1.25rem", cursor: "pointer", transition: "all 0.2s",
                  display: "flex", flexDirection: "column", gap: "1rem", position: "relative",
                  margin: 0
                }}
                onClick={() => router.push(`/dashboard/tools/notebook/detail?id=${nb.id}`)}
                onMouseEnter={e => { if (!isMobile) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; } }}
                onMouseLeave={e => { if (!isMobile) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = ""; } }}
              >
                {/* Icon & Delete */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "10px",
                    backgroundColor: "rgba(79,70,229,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PremiumIcon name="bookMarked" size={22} style={{ color: "#4F46E5" }} />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(nb); }}
                    style={{ padding: "0.35rem", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", borderRadius: "var(--radius-sm)", transition: "all 0.2s" }}
                    onMouseOver={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
                    title="Hapus notebook"
                  >
                    <PremiumIcon name="trash" size={14} />
                  </button>
                </div>

                {/* Title & Desc */}
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.25rem", color: "var(--text-main)" }}>
                    {nb.title}
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {nb.description}
                  </p>
                </div>

                {/* Footer Stats */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <PremiumIcon name="fileText" size={12} /> {journalCount} / {MAX_JOURNALS_PER_NOTEBOOK} jurnal
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <PremiumIcon name="calendar" size={12} />
                    {nb.created_at?.toDate ? nb.created_at.toDate().toLocaleDateString("id-ID") : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setShowCreateModal(false)}>
          <div style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", maxWidth: "28rem", width: "100%", padding: "2rem" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 1.25rem" }}>Buat Notebook Baru</h3>

            <label style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", display: "block", color: "var(--text-muted)" }}>Judul Notebook *</label>
            <input
              type="text" placeholder="Contoh: Literatur Review Bab 2"
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--surface-hover)", color: "var(--text-main)", fontSize: "0.875rem", outline: "none", marginBottom: "1rem", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "var(--primary)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />

            <label style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", display: "block", color: "var(--text-muted)" }}>Deskripsi (opsional)</label>
            <textarea
              placeholder="Deskripsi singkat notebook ini..."
              value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
              style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--surface-hover)", color: "var(--text-main)", fontSize: "0.875rem", outline: "none", resize: "vertical", marginBottom: "1.5rem", boxSizing: "border-box", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = "var(--primary)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button onClick={() => setShowCreateModal(false)}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                Batal
              </button>
              <button onClick={handleCreate} disabled={!newTitle.trim() || isCreating}
                style={{
                  padding: "0.6rem 1.5rem", borderRadius: "var(--radius-sm)",
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "white",
                  border: "none", cursor: !newTitle.trim() || isCreating ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: "0.85rem", opacity: !newTitle.trim() || isCreating ? 0.5 : 1,
                }}>
                {isCreating ? "Membuat..." : "Buat Notebook"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setDeleteTarget(null)}>
          <div style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", maxWidth: "24rem", width: "100%", padding: "2rem", textAlign: "center" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              <PremiumIcon name="alertTriangle" size={24} style={{ color: "#EF4444" }} />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>Hapus Notebook?</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 1.5rem" }}>
              &ldquo;{deleteTarget.title}&rdquo; dan semua referensi di dalamnya akan dihapus permanen.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
                Batal
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                style={{ padding: "0.6rem 1.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "#EF4444", color: "white", border: "none", cursor: isDeleting ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.85rem", opacity: isDeleting ? 0.5 : 1 }}>
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
