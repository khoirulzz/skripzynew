"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc } from "firebase/firestore";
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

function SummaryChip({ label, value, tone = "default" }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--text-main)";

  return (
    <div
      className="glass-panel"
      style={{
        padding: "0.45rem 0.65rem",
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        backgroundColor: "var(--background)",
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
      <strong
        style={{
          fontSize: "0.8rem",
          color,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function buildPdfPreviewUrl(url = "") {
  if (!url) return "";
  return `${url}${url.includes("#") ? "" : "#toolbar=0&navpanes=0&scrollbar=1"}`;
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
  const [isSm, setIsSm] = useState(false);
  const [isXs, setIsXs] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [references, setReferences] = useState([]);
  const [forms, setForms] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [analysisSnapshots, setAnalysisSnapshots] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [isContextReferenceCardOpen, setIsContextReferenceCardOpen] = useState(true);
  const [contextExpandedReferenceIds, setContextExpandedReferenceIds] = useState([]);
  const [contextPreviewReference, setContextPreviewReference] = useState(null);

  const hydratedRef = useRef(false);
  const leftRailTouchedRef = useRef(false);
  const rightPanelTouchedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      setIsSm(width < 768);
      setIsXs(width < 480);

      if (!leftRailTouchedRef.current) {
        setIsLeftRailCollapsed(width < 1320);
      }

      if (!rightPanelTouchedRef.current) {
        setIsRightPanelOpen(width >= 1480);
      }
    };

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
  const contextPanelWidth = isMobile ? "min(calc(100vw - 1.5rem), 420px)" : "360px";

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

  const handleAiInsertContent = (generatedHtml, targetChapterIndex = null) => {
    let chapterKey = CHAPTERS[activeChapter].key;
    
    if (targetChapterIndex !== null && CHAPTERS[targetChapterIndex]) {
      chapterKey = CHAPTERS[targetChapterIndex].key;
      setActiveChapter(targetChapterIndex);
      setActiveTab("penulisan");
    }

    setContentBuffer((current) => {
      const existing = current[chapterKey] || "";
      return {
        ...current,
        [chapterKey]: existing ? `${existing}<p></p>${generatedHtml}` : generatedHtml,
      };
    });
  };

  const toggleLeftRail = () => {
    leftRailTouchedRef.current = true;
    setIsLeftRailCollapsed((current) => !current);
  };

  const toggleContextReference = (referenceId) => {
    setContextExpandedReferenceIds((current) =>
      current.includes(referenceId) ? current.filter((item) => item !== referenceId) : [...current, referenceId]
    );
  };

  const toggleRightPanel = () => {
    rightPanelTouchedRef.current = true;
    setIsRightPanelOpen((current) => {
      const next = !current;
      if (!next) {
        setContextPreviewReference(null);
      } else {
        setIsContextReferenceCardOpen(true);
      }
      return next;
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0, height: "100%", flex: 1 }}>
      <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.7rem" }}>
          <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Konteks Cepat</h3>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{currentChapter.label}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isSm ? "1fr" : "repeat(2, minmax(0,1fr))", gap: "0.6rem" }}>
          <div style={{ padding: isSm ? "0.65rem" : "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Referensi</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>{references.length}</div>
          </div>
          <div style={{ padding: isSm ? "0.65rem" : "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Respons</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>{latestAnalysis?.responseCount || 0}</div>
          </div>
        </div>
      </div>

      {activeTab === "penulisan" ? (
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, overflow: "hidden", backgroundColor: "var(--surface)" }}>
          <div style={{ padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", borderBottom: isContextReferenceCardOpen ? "1px solid var(--border)" : "none" }}>
            <button
              className="btn btn-ghost"
              style={{ padding: 0, display: "block", textAlign: "left", color: "var(--text-main)", minWidth: 0, flex: 1 }}
              onClick={() => setIsContextReferenceCardOpen((current) => !current)}
            >
              <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Referensi Bab {activeChapter + 1}</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem" }}>Buka detail seperlunya, lalu lihat PDF tanpa meninggalkan editor.</p>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
              <button className="btn btn-outline" onClick={() => setActiveTab("referensi")}>
                <PremiumIcon name="bookMarked" size={14} />
                Kelola
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: "0.3rem" }}
                onClick={() => setIsContextReferenceCardOpen((current) => !current)}
                title={isContextReferenceCardOpen ? "Ciutkan daftar referensi" : "Buka daftar referensi"}
              >
                <PremiumIcon name={isContextReferenceCardOpen ? "chevronDown" : "chevronRight"} size={15} />
              </button>
            </div>
          </div>

          {isContextReferenceCardOpen ? (
            <div className="workspace-scroll" style={{ display: "flex", flexDirection: "column", gap: "0.6rem", overflowY: "auto", padding: "0.85rem 1rem 1rem", minHeight: 0, flex: 1 }}>
              {currentChapterReferences.length ? (
                currentChapterReferences.map((reference) => {
                  const isExpanded = contextExpandedReferenceIds.includes(reference.id);

                  return (
                    <div key={reference.id} style={{ borderRadius: "12px", border: "1px solid var(--border)", backgroundColor: "var(--background)", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ padding: "0.8rem 0.85rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 0, display: "block", textAlign: "left", color: "var(--text-main)", minWidth: 0, flex: 1 }}
                          onClick={() => toggleContextReference(reference.id)}
                        >
                          <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text-main)" }}>{reference.title}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                            {reference.authorString || (reference.authors || []).join(", ")} | {reference.year || "tanpa tahun"}
                          </div>
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
                          {reference.pdfUrl ? (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: "0.3rem" }}
                              title="Lihat PDF"
                              onClick={() => setContextPreviewReference(reference)}
                            >
                              <PremiumIcon name="eye" size={15} />
                            </button>
                          ) : null}
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "0.3rem" }}
                            title={isExpanded ? "Tutup detail" : "Buka detail"}
                            onClick={() => toggleContextReference(reference.id)}
                          >
                            <PremiumIcon name={isExpanded ? "chevronDown" : "chevronRight"} size={15} />
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div style={{ padding: "0 0.85rem 0.85rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                          <div style={{ paddingTop: "0.75rem", fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            {reference.venue ? <div><strong style={{ color: "var(--text-main)" }}>Venue:</strong> {reference.venue}</div> : null}
                            {reference.chunkCount ? <div><strong style={{ color: "var(--text-main)" }}>Index:</strong> {reference.chunkCount} chunk terindeks</div> : null}
                            {reference.fileName ? <div><strong style={{ color: "var(--text-main)" }}>File:</strong> {reference.fileName}</div> : null}
                          </div>

                          <div className="workspace-scroll" style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.1rem" }}>
                            {CHAPTERS.map((chapter) => {
                              const linked = (reference.chapterKeys || []).includes(chapter.key);
                              return (
                                <span
                                  key={`${reference.id}_${chapter.key}`}
                                  style={{
                                    padding: "0.24rem 0.5rem",
                                    borderRadius: "999px",
                                    fontSize: "0.7rem",
                                    whiteSpace: "nowrap",
                                    backgroundColor: linked ? "var(--primary-light)" : "var(--surface)",
                                    color: linked ? "var(--primary)" : "var(--text-muted)",
                                    border: "1px solid var(--border)",
                                  }}
                                >
                                  {chapter.label}
                                </span>
                              );
                            })}
                          </div>

                          {reference.notes ? (
                            <div style={{ padding: "0.65rem 0.75rem", borderRadius: "10px", backgroundColor: "var(--surface)", fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                              {reference.notes}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "0.85rem", border: "1px dashed var(--border)", borderRadius: "10px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Belum ada referensi yang ditandai untuk {currentChapter.label}.
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "analisis" && latestAnalysis ? (
        <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
          <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Snapshot Analisis Terakhir</h3>
          <p style={{ margin: "0.55rem 0 0 0", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-main)" }}>
            {latestAnalysis.narrative || "Snapshot sudah tersimpan namun narasi belum tersedia."}
          </p>
        </div>
      ) : null}

      <div style={{ minHeight: 0, flexShrink: 0 }}>
        <WorkspaceNotesPanel workspaceId={workspace.id} collapsible defaultCollapsed rows={8} />
      </div>
    </div>
  );

  return (
    <div style={{ margin: "-1.5rem", minHeight: "calc(100vh - 72px)", backgroundColor: "var(--background)" }}>
      <div
        style={{
          padding: isSm ? "0.5rem 0.75rem" : "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: "-1.5rem",
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: isXs ? "column" : "row", flexWrap: "wrap", justifyContent: "space-between", gap: isXs ? "0.6rem" : "0.9rem", alignItems: isXs ? "stretch" : "center" }}>
          <div style={{ minWidth: 0, flex: isSm ? "auto" : "1 1 360px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: isXs ? "0.3rem" : "0.65rem", flexWrap: isSm ? "nowrap" : "wrap" }}>
              <Link href="/dashboard/skripsi" style={{ display: "inline-flex", color: "var(--text-muted)", flexShrink: 0 }}>
                <PremiumIcon name="arrowLeft" size={isSm ? 14 : 18} />
              </Link>
              <h1 style={{ fontSize: isSm ? "0.85rem" : "1.05rem", margin: 0, whiteSpace: isSm ? "normal" : "nowrap", overflow: "hidden", textOverflow: isSm ? "clip" : "ellipsis", lineHeight: isSm ? 1.3 : 1, minWidth: 0, flex: 1, wordBreak: "break-word" }}>
                {workspace.title || "Tanpa Judul"}
              </h1>
              {!isSm ? <StatusBadge status={workspace.status} /> : (
                <div style={{ display: "inline-flex", padding: "0.2rem 0.45rem", borderRadius: "999px", fontSize: "0.6rem", backgroundColor: workspace.status === "Selesai" ? "rgba(16,185,129,0.15)" : workspace.status === "Revisi" ? "rgba(245,158,11,0.15)" : "rgba(107,114,128,0.15)", color: workspace.status === "Selesai" ? "var(--success)" : workspace.status === "Revisi" ? "#d97706" : "var(--text-muted)", fontWeight: 600, flexShrink: 0 }} title={workspace.status || "Draft"}>●</div>
              )}
            </div>
            {!isSm ? (
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.78rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "860px",
                  color: "var(--text-muted)",
                }}
              >
                {workspace.topic || "Topik penelitian belum diisi."}
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.35rem", justifyContent: "flex-end", flexShrink: 0 }}>
            {(isHeaderExpanded || !isSm) ? (
              <>
                <SummaryChip label="Progress" value={`${progress}%`} tone={progress >= 100 ? "success" : "default"} />
                <SummaryChip label="Form" value={activeForm?.title || "Belum aktif"} />
                <SummaryChip
                  label="Autosave"
                  value={saveState === "saving" ? "Menyimpan..." : saveState === "dirty" ? "Perubahan baru" : saveState === "error" ? "Gagal" : "Aman"}
                  tone={saveState === "error" ? "danger" : saveState === "saved" ? "success" : "default"}
                />
              </>
            ) : null}
            {isSm ? (
              <button
                className="btn btn-ghost"
                style={{ padding: "0.3rem", minWidth: 0, flexShrink: 0 }}
                onClick={() => setIsHeaderExpanded((prev) => !prev)}
                title={isHeaderExpanded ? "Tutup metadata" : "Buka metadata"}
              >
                <PremiumIcon name="moreVertical" size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "0.5rem" : isSm ? "0.75rem" : "1rem",
          padding: isMobile ? "0.5rem" : isSm ? "0.75rem" : "1rem",
          alignItems: "start",
        }}
      >
        {isMobile ? (
          <div className="glass-panel" style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", scrollSnapType: "x mandatory" }}>
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-outline"}`}
                  style={{ 
                    padding: "0.45rem 0.7rem",
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    scrollSnapAlign: "start"
                  }}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                >
                  <PremiumIcon name={tab.icon} size={13} style={{ marginRight: "0.3rem" }} />
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", scrollSnapType: "x mandatory" }}>
              {CHAPTERS.map((chapter, index) => (
                <button
                  key={chapter.key}
                  className={`btn ${activeChapter === index ? "btn-primary" : "btn-ghost"}`}
                  style={{ 
                    padding: "0.45rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    minWidth: "2.2rem",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    scrollSnapAlign: "start"
                  }}
                  onClick={() => {
                    setActiveTab("penulisan");
                    setActiveChapter(index);
                  }}
                  title={chapter.longLabel}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <aside
            className="glass-panel workspace-scroll"
            style={{
              width: isLeftRailCollapsed ? "82px" : "248px",
              flexShrink: 0,
              padding: isLeftRailCollapsed ? "0.85rem 0.65rem" : "1rem",
              display: "flex",
              flexDirection: "column",
              gap: isSm ? "0.5rem" : "1rem",
              position: "sticky",
              top: "84px",
              maxHeight: "calc(100vh - 100px)",
              transition: "width 0.2s ease, padding 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.65rem" }}>
              <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "0.55rem" }}>
                <PremiumIcon name="layoutTemplate" size={16} className="text-primary" />
                {!isLeftRailCollapsed ? (
                  <div>
                    <h3 style={{ fontSize: "0.92rem", margin: 0 }}>Research Cockpit</h3>
                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.74rem" }}>Mode kerja dan navigasi bab.</p>
                  </div>
                ) : null}
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: "0.35rem" }}
                onClick={toggleLeftRail}
                title={isLeftRailCollapsed ? "Perluas panel" : "Ciutkan panel"}
              >
                <PremiumIcon name={isLeftRailCollapsed ? "chevronRight" : "chevronLeft"} size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`btn ${activeTab === tab.key ? "btn-primary" : "btn-outline"}`}
                  style={{ 
                    justifyContent: isLeftRailCollapsed ? "center" : "flex-start", 
                    paddingInline: isLeftRailCollapsed ? "0.5rem" : undefined,
                    ...(isXs && { padding: "0.4rem 0.6rem", fontSize: "0.8rem" }),
                    ...(isSm && isLeftRailCollapsed && { padding: "0.45rem" })
                  }}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                >
                  <PremiumIcon name={tab.icon} size={15} />
                  {!isLeftRailCollapsed ? tab.label : null}
                </button>
              ))}
            </div>

            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                {!isLeftRailCollapsed ? <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>Struktur Bab</span> : null}
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{progress}%</span>
              </div>
              {CHAPTERS.map((chapter, index) => (
                <button
                  key={chapter.key}
                  className={`btn ${activeChapter === index ? "btn-primary" : "btn-ghost"}`}
                  style={{ justifyContent: isLeftRailCollapsed ? "center" : "space-between", paddingInline: isLeftRailCollapsed ? "0.5rem" : undefined }}
                  onClick={() => {
                    setActiveTab("penulisan");
                    setActiveChapter(index);
                  }}
                  title={chapter.longLabel}
                >
                  <span>{isLeftRailCollapsed ? `${index + 1}` : chapter.label}</span>
                  {!isLeftRailCollapsed ? (
                    <span style={{ fontSize: "0.7rem", opacity: 0.82 }}>
                      {(contentBuffer[chapter.key] || "").length ? "isi" : "kosong"}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {!isLeftRailCollapsed ? (
              <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: isSm ? "flex" : "grid", flexDirection: isSm ? "column" : "row", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: isSm ? "0.5rem" : "0.65rem" }}>
                <div className="form-group" style={{ margin: 0, ...(isXs && { fontSize: "0.8rem" }) }}>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={workspace.status || "Draft"} onChange={(event) => void handleStatusChange(event.target.value)}>
                    <option value="Draft">Draft</option>
                    <option value="Revisi">Revisi</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, ...(isXs && { fontSize: "0.8rem" }) }}>
                  <label className="form-label">Metode</label>
                  <select className="form-input" value={workspace.methodologyType || "kuantitatif"} onChange={(event) => void handleMethodologyChange(event.target.value)}>
                    <option value="kuantitatif">Kuantitatif</option>
                    <option value="kualitatif">Kualitatif</option>
                    <option value="mixed">Mixed Methods</option>
                  </select>
                </div>
              </div>
            ) : null}
          </aside>
        )}

        <main style={{ display: "flex", flexDirection: "column", gap: isMobile ? "0.5rem" : "1rem", minWidth: 0, flex: 1 }}>
          <div className="glass-panel" style={{ 
            padding: isSm ? "0.6rem 0.75rem" : "0.75rem 0.9rem", 
            display: "flex", 
            flexDirection: "row", 
            alignItems: "center", 
            justifyContent: "space-between", 
            gap: isSm ? "0.5rem" : "0.75rem", 
            flexWrap: "nowrap",
            ...(activeTab === "penulisan" ? {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottom: "none",
              zIndex: 5,
            } : {})
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isSm ? "0.7rem" : "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {WORKSPACE_TABS.find((tab) => tab.key === activeTab)?.label || "Workspace"}
              </div>
              <div style={{ fontSize: "0.86rem", color: "var(--text-main)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeTab === "penulisan"
                  ? currentChapter.longLabel
                  : activeTab === "referensi"
                    ? "Reference Hub aktif"
                    : activeTab === "data"
                      ? "Data penelitian aktif"
                      : "Analisis penelitian aktif"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "nowrap", flexShrink: 0 }}>
              <button 
                className={`btn ${isRightPanelOpen ? "btn-primary" : "btn-ghost"}`} 
                onClick={toggleRightPanel}
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                title={isRightPanelOpen ? "Tutup Konteks" : "Buka Konteks"}
              >
                <PremiumIcon name={isRightPanelOpen ? "x" : "layers"} size={14} />
                <span style={{ display: isSm ? "none" : "inline" }}>Konteks</span>
              </button>
              {activeTab === "penulisan" ? (
                <button 
                  className="btn btn-ghost" 
                  onClick={() => void persistWorkspace(contentBuffer)} 
                  disabled={isSaving}
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem", height: "auto" }}
                  title="Simpan Sekarang (Ctrl+S)"
                >
                  <PremiumIcon name="save" size={14} />
                  <span style={{ display: isSm ? "none" : "inline" }}>Simpan</span>
                </button>
              ) : null}
            </div>
          </div>

          {activeTab === "penulisan" ? (
            <div style={{ 
              position: "relative", 
              display: "flex", 
              flexDirection: "column", 
              minHeight: "72vh", 
              overflow: "hidden",
              marginTop: isMobile ? "-0.5rem" : "-1rem" 
            }}>
              <div className="glass-panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                  <TiptapEditor
                    key={currentChapter.key}
                    content={contentBuffer[currentChapter.key] || ""}
                    onChange={(html) => handleEditorChange(currentChapter.key, html)}
                    placeholder={currentChapter.placeholder}
                  />
                </div>

                <div style={{ padding: "0.65rem 1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", flexShrink: 0 }}>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    Referensi terhubung untuk bab ini: <strong style={{ color: "var(--text-main)" }}>{currentChapterReferences.length}</strong>
                  </span>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    Tekan <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: "4px" }}>Ctrl+S</kbd> untuk menyimpan manual
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "referensi" ? <ReferenceManager workspaceId={workspace.id} currentChapterKey={currentChapter.key} /> : null}

          {activeTab === "data" ? <DataHub workspaceId={workspace.id} /> : null}

          {activeTab === "analisis" ? (
            <div className="glass-panel" style={{ padding: "1rem" }}>
              <DataAnalysisDashboard 
                workspaceId={workspace.id} 
                activeFormId={activeForm?.id || null} 
                onInsertContent={handleAiInsertContent} 
              />
            </div>
          ) : null}
        </main>
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
        floating
        offsetRight={isRightPanelOpen && !isMobile ? 392 : 16}
      />

      {isRightPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="Tutup panel konteks"
            onClick={toggleRightPanel}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: isMobile ? "rgba(15, 23, 42, 0.18)" : "transparent",
              border: "none",
              zIndex: 45,
            }}
          />
          <aside
            className="workspace-scroll"
            style={{
              position: "fixed",
              top: isMobile ? "0.75rem" : contextPreviewReference ? "104px" : "84px",
              right: "0.75rem",
              bottom: "0.75rem",
              width: contextPanelWidth,
              maxWidth: "calc(100vw - 1.5rem)",
              zIndex: 50,
              paddingRight: "0.2rem",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div className="glass-panel" style={{ padding: "0.85rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", backgroundColor: "var(--surface)" }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: "0.94rem", margin: 0 }}>
                  {contextPreviewReference ? "PDF Viewer" : "Panel Konteks"}
                </h3>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem" }}>
                  {contextPreviewReference
                    ? "Baca referensi sambil tetap mengedit di area tengah."
                    : "Referensi cepat, analisis, dan catatan kerja."}
                </p>
              </div>
              <button className="btn btn-ghost" onClick={toggleRightPanel} style={{ padding: "0.35rem" }}>
                <PremiumIcon name="x" size={15} />
              </button>
            </div>
            {contextPreviewReference?.pdfUrl ? (
              <div className="glass-panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--surface)" }}>
                <div
                  style={{
                    padding: "0.9rem 1rem",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    background: "linear-gradient(180deg, rgba(79,70,229,0.08), transparent)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Preview Referensi
                    </div>
                    <h4 style={{ fontSize: "0.94rem", margin: "0.2rem 0 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {contextPreviewReference.title}
                    </h4>
                    <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.75rem", lineHeight: 1.5 }}>
                      {contextPreviewReference.authorString || (contextPreviewReference.authors || []).join(", ")} {contextPreviewReference.year ? `| ${contextPreviewReference.year}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
                    <a href={contextPreviewReference.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                      <PremiumIcon name="download" size={14} />
                      Buka
                    </a>
                    <button className="btn btn-ghost" onClick={() => setContextPreviewReference(null)}>
                      <PremiumIcon name="x" size={15} />
                      Tutup
                    </button>
                  </div>
                </div>

                <div style={{ padding: "0.85rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", backgroundColor: "var(--background)" }}>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    {contextPreviewReference.fileName || "PDF referensi"}
                  </span>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    Viewer aktif di panel konteks
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, backgroundColor: "#eef2ff", padding: "0.85rem" }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(79,70,229,0.12)", backgroundColor: "white", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)" }}>
                    <iframe
                      src={buildPdfPreviewUrl(contextPreviewReference.pdfUrl)}
                      title={`Preview ${contextPreviewReference.title}`}
                      style={{ width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              rightPanel
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}
