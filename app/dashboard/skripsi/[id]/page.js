"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import { use } from "react";
import { ReferenceManager } from "@/components/workspace/ReferenceManager";
import { ChapterAiAssistant } from "@/components/workspace/ChapterAiAssistant";
import { DataHub } from "@/components/workspace/DataHub";

// ===========================================================================
// Konfigurasi konstanta Bab
// ===========================================================================
const CHAPTERS = [
  { key: "contentBab1", label: "Bab I", longLabel: "Bab I – Pendahuluan", placeholder: "Tulis latar belakang, rumusan masalah, tujuan, dan manfaat penelitian..." },
  { key: "contentBab2", label: "Bab II", longLabel: "Bab II – Kajian Pustaka", placeholder: "Tulis tinjauan teori, penelitian terdahulu, dan kerangka berpikir..." },
  { key: "contentBab3", label: "Bab III", longLabel: "Bab III – Metode Penelitian", placeholder: "Jelaskan jenis, setting, populasi, teknik pengambilan data, dan instrumen..." },
  { key: "contentBab4", label: "Bab IV", longLabel: "Bab IV – Hasil & Pembahasan", placeholder: "Paparkan data, analisis, dan pembahasan temuan penelitian..." },
  { key: "contentBab5", label: "Bab V", longLabel: "Bab V – Kesimpulan & Saran", placeholder: "Tuliskan kesimpulan akhir dan saran yang dapat ditindaklanjuti..." },
];

// ===========================================================================
// Helper: Status badge
// ===========================================================================
function StatusBadge({ status }) {
  const statusConfig = {
    "Draft": { bg: "rgba(107,114,128,0.15)", color: "#6B7280" },
    "Revisi": { bg: "rgba(245,158,11,0.15)", color: "#D97706" },
    "Selesai": { bg: "rgba(16,185,129,0.15)", color: "#059669" },
  };
  const cfg = statusConfig[status] || statusConfig["Draft"];
  return (
    <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: "10px", fontWeight: 600, backgroundColor: cfg.bg, color: cfg.color }}>
      {status || "Draft"}
    </span>
  );
}

// ===========================================================================
// Status dropdown
// ===========================================================================
function StatusDropdown({ currentStatus, onSelect }) {
  const [open, setOpen] = useState(false);
  const options = ["Draft", "Revisi", "Selesai"];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-outline"
        style={{ gap: "0.4rem", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
      >
        <StatusBadge status={currentStatus} />
        <PremiumIcon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="glass-panel" style={{ position: "absolute", top: "2.5rem", right: 0, zIndex: 20, minWidth: "130px", padding: "0.25rem" }}>
          {options.map(opt => (
            <button
              key={opt}
              className="btn btn-ghost"
              style={{ width: "100%", justifyContent: "flex-start", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
              onClick={() => { onSelect(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Main Page
// ===========================================================================
export default function WorkspaceEditorPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();

  const [appMode, setAppMode] = useState("editor");
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(350);

  // ---- Resizer logic ----
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = drawerWidth;

    function handleMouseMove(eMove) {
      const newWidth = startWidth - (eMove.clientX - startX);
      if (newWidth >= 250 && newWidth <= 800) setDrawerWidth(newWidth);
    }
    function handleMouseUp() {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [drawerWidth]);

  // Local buffer for editor contents (keyed by chapter key, e.g. contentBab1)
  const [contentBuffer, setContentBuffer] = useState({});

  // ---- Fetch workspace from Firestore ----
  useEffect(() => {
    async function fetchWorkspace() {
      if (!user || !id) return;
      try {
        const docRef = doc(db, "workspaces", id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() || docSnap.data().userId !== user.uid) {
          setNotFound(true);
          return;
        }
        const data = { id: docSnap.id, ...docSnap.data() };
        setWorkspace(data);
        // Hydrate the local buffer with saved content
        const initial = {};
        CHAPTERS.forEach(ch => { initial[ch.key] = data[ch.key] || ""; });
        setContentBuffer(initial);
      } catch (err) {
        console.error("Error fetching workspace:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWorkspace();
  }, [user, id]);

  // ---- Buffer update (no Firebase write yet) ----
  const handleEditorChange = useCallback((chapterKey, html) => {
    setContentBuffer(prev => ({ ...prev, [chapterKey]: html }));
    setSaved(false);
  }, []);

  // ---- Save to Firebase ----
  const handleSave = useCallback(async () => {
    if (!workspace || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "workspaces", workspace.id), {
        ...contentBuffer,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Gagal menyimpan:", err);
    } finally {
      setSaving(false);
    }
  }, [workspace, contentBuffer, saving]);

  // ---- AI Content Insertion ----
  const handleAiInsertContent = useCallback((generatedHtml) => {
    const chapterKey = CHAPTERS[activeChapter].key;
    setContentBuffer(prev => {
      const current = prev[chapterKey] || "";
      const newContent = current ? `${current}<br/><br/>${generatedHtml}` : generatedHtml;
      return { ...prev, [chapterKey]: newContent };
    });
    setSaved(false);
  }, [activeChapter]);

  // ---- Keyboard shortcut Ctrl+S ----
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // ---- Status update ----
  const handleStatusChange = async (newStatus) => {
    if (!workspace) return;
    try {
      await updateDoc(doc(db, "workspaces", workspace.id), { status: newStatus, updatedAt: serverTimestamp() });
      setWorkspace(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error("Gagal update status:", err);
    }
  };

  // ==== Render states ====
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="zap" size={36} className="text-primary" />
        <p className="text-muted">Memuat workspace...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="glass-panel p-8 text-center" style={{ maxWidth: "480px", margin: "4rem auto" }}>
        <PremiumIcon name="alertCircle" size={48} className="text-danger" style={{ margin: "0 auto 1rem" }} />
        <h2>Workspace Tidak Ditemukan</h2>
        <p className="text-muted">Workspace ini tidak ada atau Anda tidak memiliki akses.</p>
        <Link href="/dashboard/skripsi" className="btn btn-primary mt-4" style={{ display: "inline-flex" }}>
          <PremiumIcon name="arrowLeft" size={16} /> Kembali ke Daftar
        </Link>
      </div>
    );
  }

  const chapterKey = CHAPTERS[activeChapter].key;

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "calc(100% + 4rem)", margin: "-2rem", overflow: "hidden", backgroundColor: "var(--background)", position: "relative" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", animation: "fadeIn 0.3s ease-out", transition: "none", position: "relative" }}>

        {/* ===== Top bar ===== */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--background)", flexShrink: 0, gap: "1rem", flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden", minWidth: 0, flex: "1 1 100%", maxWidth: "100%" }}>
            <Link href="/dashboard/skripsi" style={{ display: "inline-flex", color: "var(--text-muted)", flexShrink: 0 }}>
              <PremiumIcon name="arrowLeft" size={20} />
            </Link>
            <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {workspace?.title || "Tanpa Judul"}
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {workspace?.topic?.substring(0, 80) || "Belum ada topik"}
              </p>
            </div>
          </div>

          {/* View Switcher: Penulisan vs Data */}
          <div style={{ display: "flex", backgroundColor: "var(--surface-hover)", padding: "0.25rem", borderRadius: "8px", gap: "0.25rem" }}>
            <button
              onClick={() => setAppMode("editor")}
              style={{
                padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                backgroundColor: appMode === "editor" ? "var(--surface)" : "transparent",
                color: appMode === "editor" ? "var(--primary)" : "var(--text-muted)",
                boxShadow: appMode === "editor" ? "var(--shadow-sm)" : "none",
              }}
            >
              <PremiumIcon name="squarePen" size={16} />
            </button>
            <button
              onClick={() => setAppMode("data")}
              style={{
                padding: "0.4rem 1rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
                backgroundColor: appMode === "data" ? "var(--surface)" : "transparent",
                color: appMode === "data" ? "var(--primary)" : "var(--text-muted)",
                boxShadow: appMode === "data" ? "var(--shadow-sm)" : "none",
              }}
            >
              <PremiumIcon name="chartNoAxesCombined" size={16} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            {appMode === "editor" && (
              <button
                className="btn btn-outline"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                style={{ gap: "0.4rem", padding: "0.5rem 0.75rem", fontSize: "0.85rem", backgroundColor: isDrawerOpen ? "var(--surface-hover)" : "transparent" }}
              >
                <PremiumIcon name="bookOpen" size={15} />
                Referensi
              </button>
            )}

            <StatusDropdown currentStatus={workspace?.status} onSelect={handleStatusChange} />

            <button
              className={`btn ${saved ? "btn-outline" : "btn-primary"}`}
              onClick={handleSave}
              disabled={saving}
              style={{ gap: "0.4rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              <PremiumIcon name={saved ? "check" : "save"} size={15} />
              {saving ? "Menyimpan" : saved ? "Tersimpan" : "Simpan"}
            </button>
          </div>
        </div>

        {appMode === "data" ? (
          <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
            <DataHub workspaceId={id} />
          </div>
        ) : (
          <>
            {/* ===== Chapter Tabs ===== */}
            <div style={{
              display: "flex", gap: "0.25rem", padding: "0.5rem 1.5rem",
              borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)",
              overflowX: "auto", flexShrink: 0,
            }}>
              {CHAPTERS.map((ch, i) => (
                <button
                  key={ch.key}
                  onClick={() => setActiveChapter(i)}
                  style={{
                    padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 600,
                    borderRadius: "6px", border: "none", cursor: "pointer",
                    fontFamily: "inherit", whiteSpace: "nowrap",
                    backgroundColor: activeChapter === i ? "var(--primary)" : "transparent",
                    color: activeChapter === i ? "white" : "var(--text-muted)",
                    transition: "all 0.2s",
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            {/* ===== Chapter Title ===== */}
            <div style={{ padding: "1.5rem 2rem 0", flexShrink: 0 }}>
              <h1 style={{ fontSize: "1.5rem", margin: 0, color: "var(--text-main)" }}>
                {CHAPTERS[activeChapter].longLabel}
              </h1>
            </div>

            {/* ===== Editor Canvas ===== */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative", minWidth: 0 }}>
              <TiptapEditor
                key={chapterKey}   /* remount when chapter changes */
                content={contentBuffer[chapterKey]}
                onChange={(html) => handleEditorChange(chapterKey, html)}
                placeholder={CHAPTERS[activeChapter].placeholder}
              />

              {/* AI Co-Writer Widget - Posisi pasti di atas editor */}
              <div style={{ position: "absolute", right: "2rem", top: "2rem", zIndex: 9999 }}>
                <ChapterAiAssistant
                  activeChapter={activeChapter}
                  workspaceContext={workspace}
                  onInsertContent={handleAiInsertContent}
                />
              </div>
            </div>

            {/* ===== Keyboard shortcut hint ===== */}
            <div style={{ padding: "0.5rem 2rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Tekan <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: "4px", fontFamily: "inherit" }}>Ctrl+S</kbd> untuk menyimpan
              </span>
            </div>
          </>
        )}

      </div>

      {/* Right Drawer */}
      {appMode === "editor" && isDrawerOpen && (
        <>
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            style={{ width: "6px", cursor: "col-resize", backgroundColor: "var(--surface-hover)", zIndex: 50, flexShrink: 0 }}
            title="Tarik untuk memperlebar Reference Hub"
          />
          <div style={{ width: `${drawerWidth}px`, borderLeft: "1px solid var(--border)", backgroundColor: "var(--background)", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>
            <ReferenceManager workspaceId={id} onClose={() => setIsDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
