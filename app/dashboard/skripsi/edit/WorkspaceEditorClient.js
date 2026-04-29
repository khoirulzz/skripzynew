"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { ReferenceManager } from "@/components/workspace/ReferenceManager";
import { ChapterAiAssistant } from "@/components/workspace/ChapterAiAssistant";
import { DataHub } from "@/components/workspace/DataHub";
import { DataAnalysisDashboard } from "@/components/workspace/DataAnalysisDashboard";
import { WorkspaceNotesPanel } from "@/components/workspace/WorkspaceNotesPanel";
import { CHAPTERS, WORKSPACE_TABS, calculateWorkspaceProgress } from "@/lib/workspaceDefaults";

function StatusBadge({ status }) {
  const tone =
    status === "Selesai" ? "rgba(16,185,129,0.15)" : status === "Revisi" ? "rgba(245,158,11,0.15)" : "rgba(107,114,128,0.15)";
  const color = status === "Selesai" ? "var(--success)" : status === "Revisi" ? "#d97706" : "var(--text-muted)";

  return (
    <span
      style={{
        fontSize: "0.74rem",
        padding: "0.22rem 0.55rem",
        borderRadius: "999px",
        backgroundColor: tone,
        color,
        fontWeight: 600,
      }}
    >
      {status || "Draft"}
    </span>
  );
}

async function persistWorkspaceDoc({
  workspaceId,
  nextContentBuffer,
  activeChapter,
  progress,
  referenceCount,
  responseCount,
  methodologyType,
  activeFormId,
  overrides = {},
}) {
  await updateDoc(doc(db, "workspaces", workspaceId), {
    ...nextContentBuffer,
    activeChapter,
    progress,
    referenceCount,
    responseCount,
    methodologyType,
    activeFormId,
    updatedAt: serverTimestamp(),
    ...overrides,
  });
}

export default function WorkspaceEditorPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [activeTab, setActiveTab] = useState("penulisan");
  const [contentBuffer, setContentBuffer] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [isMobile, setIsMobile] = useState(false);
  const [references, setReferences] = useState([]);
  const [forms, setForms] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [analysisSnapshots, setAnalysisSnapshots] = useState([]);
  const [noteText, setNoteText] = useState("");

  const hydratedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user || !id) return undefined;

    const workspaceRef = doc(db, "workspaces", id);
    const unsubscribe = onSnapshot(
      workspaceRef,
      (snapshot) => {
        if (!snapshot.exists() || snapshot.data().userId !== user.uid) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = { id: snapshot.id, ...snapshot.data() };
        setWorkspace(data);

        if (!hydratedRef.current) {
          const initialBuffer = {};
          CHAPTERS.forEach((chapter) => {
            initialBuffer[chapter.key] = data[chapter.key] || "";
          });
          setContentBuffer(initialBuffer);
          setActiveChapter(Number.isFinite(data.activeChapter) ? data.activeChapter : 0);
          hydratedRef.current = true;
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error fetching workspace:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id, user]);

  useEffect(() => {
    if (!id) return undefined;
    const refsQuery = query(collection(db, "workspaces", id, "references"));
    const unsubscribe = onSnapshot(refsQuery, (snapshot) => {
      setReferences(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const formsQuery = query(collection(db, "workspaces", id, "forms"));
    const unsubscribe = onSnapshot(formsQuery, (snapshot) => {
      setForms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const transcriptsQuery = query(collection(db, "workspaces", id, "transcripts"));
    const unsubscribe = onSnapshot(transcriptsQuery, (snapshot) => {
      setTranscripts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const snapshotsQuery = query(collection(db, "workspaces", id, "analysisSnapshots"));
    const unsubscribe = onSnapshot(snapshotsQuery, (snapshot) => {
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      items.sort((left, right) => {
        const leftTime = left.createdAt?.seconds || 0;
        const rightTime = right.createdAt?.seconds || 0;
        return rightTime - leftTime;
      });
      setAnalysisSnapshots(items);
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!id) return undefined;
    const noteRef = doc(db, "workspaces", id, "notes", "general");
    const unsubscribe = onSnapshot(noteRef, (snapshot) => {
      setNoteText(snapshot.data()?.content || "");
    });
    return unsubscribe;
  }, [id]);

  const activeForm = useMemo(
    () => forms.find((item) => item.id === workspace?.activeFormId) || forms.find((item) => item.status === "published") || null,
    [forms, workspace?.activeFormId]
  );

  const latestAnalysis = analysisSnapshots[0] || null;
  const currentChapter = CHAPTERS[activeChapter];
  const currentChapterReferences = useMemo(
    () => references.filter((reference) => (reference.chapterKeys || []).includes(currentChapter?.key)),
    [currentChapter?.key, references]
  );

  const progress = useMemo(() => calculateWorkspaceProgress(contentBuffer), [contentBuffer]);

  const persistWorkspace = useCallback(
    async (nextContentBuffer = contentBuffer, overrides = {}) => {
      if (!workspace || isSaving) return;
      setIsSaving(true);
      setSaveState("saving");

      try {
        await persistWorkspaceDoc({
          workspaceId: workspace.id,
          nextContentBuffer,
          activeChapter,
          progress,
          referenceCount: references.length,
          responseCount: latestAnalysis?.responseCount || workspace.responseCount || 0,
          methodologyType: workspace.methodologyType || "kuantitatif",
          activeFormId: activeForm?.id || workspace.activeFormId || null,
          overrides,
        });
        setSaveState("saved");
      } catch (error) {
        console.error("Gagal menyimpan workspace:", error);
        setSaveState("error");
      } finally {
        setIsSaving(false);
      }
    },
    [activeChapter, activeForm, contentBuffer, isSaving, latestAnalysis, progress, references.length, workspace]
  );

  useEffect(() => {
    if (!hydratedRef.current) return undefined;
    setSaveState("dirty");

    const timeoutId = window.setTimeout(() => {
      void persistWorkspace(contentBuffer);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [contentBuffer, persistWorkspace]);

  useEffect(() => {
    if (!workspace) return undefined;

    const timeoutId = window.setTimeout(() => {
      void updateDoc(doc(db, "workspaces", workspace.id), {
        progress,
        referenceCount: references.length,
        responseCount: latestAnalysis?.responseCount || 0,
        activeFormId: activeForm?.id || null,
        activeChapter,
        updatedAt: serverTimestamp(),
      }).catch((error) => console.error("Gagal sinkron metadata workspace:", error));
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [activeChapter, activeForm?.id, latestAnalysis?.responseCount, progress, references.length, workspace]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persistWorkspace(contentBuffer);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [contentBuffer, persistWorkspace]);

  const handleStatusChange = async (status) => {
    if (!workspace) return;
    setWorkspace((current) => ({ ...current, status }));
    await updateDoc(doc(db, "workspaces", workspace.id), {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  const handleMethodologyChange = async (methodologyType) => {
    if (!workspace) return;
    setWorkspace((current) => ({ ...current, methodologyType }));
    await updateDoc(doc(db, "workspaces", workspace.id), {
      methodologyType,
      updatedAt: serverTimestamp(),
    });
  };

  const handleEditorChange = (chapterKey, html) => {
    setContentBuffer((current) => ({
      ...current,
      [chapterKey]: html,
    }));
  };

  const handleAiInsertContent = (generatedHtml) => {
    const chapterKey = CHAPTERS[activeChapter].key;
    setContentBuffer((current) => {
      const existing = current[chapterKey] || "";
      return {
        ...current,
        [chapterKey]: existing ? `${existing}<p></p>${generatedHtml}` : generatedHtml,
      };
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={34} className="text-primary animate-spin" />
        <p className="text-muted">Memuat workspace penelitian...</p>
      </div>
    );
  }

  if (notFound || !workspace) {
    return (
      <div className="glass-panel p-8 text-center" style={{ maxWidth: "520px", margin: "3rem auto" }}>
        <PremiumIcon name="alertCircle" size={44} className="text-danger" style={{ margin: "0 auto 1rem" }} />
        <h2>Workspace tidak ditemukan</h2>
        <p className="text-muted">Workspace ini tidak ada atau Anda tidak memiliki akses ke proyek tersebut.</p>
        <Link href="/dashboard/skripsi" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
          <PremiumIcon name="arrowLeft" size={15} />
          Kembali
        </Link>
      </div>
    );
  }

  const rightPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.7rem" }}>
          <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Konteks Cepat</h3>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{currentChapter.label}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "0.6rem" }}>
          <div style={{ padding: "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Referensi</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>{references.length}</div>
          </div>
          <div style={{ padding: "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Respons</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>{latestAnalysis?.responseCount || 0}</div>
          </div>
        </div>
      </div>

      {activeTab === "penulisan" ? (
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", margin: 0 }}>AI Bab {activeChapter + 1}</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem" }}>Gunakan referensi yang ditandai untuk bab aktif.</p>
            </div>
            <ChapterAiAssistant
              activeChapter={activeChapter}
              workspaceContext={workspace}
              onInsertContent={handleAiInsertContent}
              selectedReferences={currentChapterReferences}
              activeForm={activeForm}
              latestAnalysis={latestAnalysis}
              transcripts={transcripts}
              notes={noteText}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {currentChapterReferences.length ? (
              currentChapterReferences.slice(0, 4).map((reference) => (
                <div key={reference.id} style={{ padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
                  <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-main)" }}>{reference.title}</div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {reference.authorString || (reference.authors || []).join(", ")} • {reference.year || "tanpa tahun"}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "0.85rem", border: "1px dashed var(--border)", borderRadius: "10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Belum ada referensi yang ditandai untuk {currentChapter.label}.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "analisis" && latestAnalysis ? (
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Snapshot Analisis Terakhir</h3>
          <p style={{ margin: "0.55rem 0 0 0", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-main)" }}>
            {latestAnalysis.narrative || "Snapshot sudah tersimpan namun narasi belum tersedia."}
          </p>
        </div>
      ) : null}

      <WorkspaceNotesPanel workspaceId={workspace.id} />
    </div>
  );

  return (
    <div style={{ margin: "-1.5rem", minHeight: "calc(100vh - 72px)", backgroundColor: "var(--background)" }}>
      <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: "1 1 360px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/dashboard/skripsi" style={{ display: "inline-flex", color: "var(--text-muted)" }}>
                <PremiumIcon name="arrowLeft" size={18} />
              </Link>
              <h1 style={{ fontSize: "1.25rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {workspace.title || "Tanpa Judul"}
              </h1>
              <StatusBadge status={workspace.status} />
            </div>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.86rem" }}>{workspace.topic || "Topik penelitian belum diisi."}</p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem", justifyContent: "flex-end" }}>
            <div className="glass-panel" style={{ padding: "0.65rem 0.8rem", display: "flex", gap: "0.85rem", alignItems: "center", backgroundColor: "var(--background)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Progress</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{progress}%</strong>
            </div>
            <div className="glass-panel" style={{ padding: "0.65rem 0.8rem", display: "flex", gap: "0.85rem", alignItems: "center", backgroundColor: "var(--background)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Form</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{activeForm?.title || "Belum aktif"}</strong>
            </div>
            <div className="glass-panel" style={{ padding: "0.65rem 0.8rem", display: "flex", gap: "0.85rem", alignItems: "center", backgroundColor: "var(--background)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Autosave</span>
              <strong style={{ fontSize: "0.9rem", color: saveState === "error" ? "var(--danger)" : "var(--text-main)" }}>
                {saveState === "saving" ? "Menyimpan..." : saveState === "dirty" ? "Perubahan baru" : saveState === "error" ? "Gagal" : "Aman"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: isMobile ? "flex" : "grid",
          flexDirection: isMobile ? "column" : undefined,
          gridTemplateColumns: isMobile ? undefined : "250px minmax(0, 1fr) 340px",
          gap: "1rem",
          padding: "1rem",
          alignItems: "start",
        }}
      >
        <aside className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "0.92rem", margin: 0 }}>Research Cockpit</h3>
            <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.76rem" }}>Pilih mode kerja dan bab aktif tanpa meninggalkan workspace.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start" }}
                onClick={() => setActiveTab(tab.key)}
              >
                <PremiumIcon name={tab.icon} size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>Struktur Bab</span>
              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{progress}%</span>
            </div>
            {CHAPTERS.map((chapter, index) => (
              <button
                key={chapter.key}
                className={`btn ${activeChapter === index ? "btn-primary" : "btn-ghost"}`}
                style={{ justifyContent: "space-between" }}
                onClick={() => {
                  setActiveTab("penulisan");
                  setActiveChapter(index);
                }}
              >
                <span>{chapter.label}</span>
                <span style={{ fontSize: "0.7rem", opacity: 0.82 }}>
                  {(contentBuffer[chapter.key] || "").length ? "isi" : "kosong"}
                </span>
              </button>
            ))}
          </div>

          <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "0.65rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select className="form-input" value={workspace.status || "Draft"} onChange={(event) => void handleStatusChange(event.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Revisi">Revisi</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Metode</label>
              <select className="form-input" value={workspace.methodologyType || "kuantitatif"} onChange={(event) => void handleMethodologyChange(event.target.value)}>
                <option value="kuantitatif">Kuantitatif</option>
                <option value="kualitatif">Kualitatif</option>
                <option value="mixed">Mixed Methods</option>
              </select>
            </div>
          </div>
        </aside>

        <main style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
          {activeTab === "penulisan" ? (
            <div className="glass-panel" style={{ overflow: "hidden", minHeight: "72vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1rem 1rem 0.65rem", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {currentChapter.label}
                    </div>
                    <h2 style={{ fontSize: "1.2rem", margin: "0.2rem 0 0 0" }}>{currentChapter.longLabel}</h2>
                  </div>
                  <button className="btn btn-outline" onClick={() => void persistWorkspace(contentBuffer)} disabled={isSaving}>
                    <PremiumIcon name="save" size={14} />
                    Simpan Sekarang
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0 }}>
                <TiptapEditor
                  key={currentChapter.key}
                  content={contentBuffer[currentChapter.key] || ""}
                  onChange={(html) => handleEditorChange(currentChapter.key, html)}
                  placeholder={currentChapter.placeholder}
                />
              </div>

              <div style={{ padding: "0.65rem 1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Referensi terhubung untuk bab ini: <strong style={{ color: "var(--text-main)" }}>{currentChapterReferences.length}</strong>
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Tekan <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: "4px" }}>Ctrl+S</kbd> untuk menyimpan manual
                </span>
              </div>
            </div>
          ) : null}

          {activeTab === "referensi" ? (
            <ReferenceManager workspaceId={workspace.id} currentChapterKey={currentChapter.key} />
          ) : null}

          {activeTab === "data" ? <DataHub workspaceId={workspace.id} /> : null}

          {activeTab === "analisis" ? (
            <div className="glass-panel" style={{ padding: "1rem" }}>
              <DataAnalysisDashboard workspaceId={workspace.id} activeFormId={activeForm?.id || null} />
            </div>
          ) : null}
        </main>

        <aside>{rightPanel}</aside>
      </div>
    </div>
  );
}
