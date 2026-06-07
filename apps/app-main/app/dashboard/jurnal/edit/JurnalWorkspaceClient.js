"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { d1Request } from "@/lib/d1Client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import DefaultSpinner from "@/components/ui/DefaultSpinner";
import { ReferenceManager } from "@/components/workspace/ReferenceManager";
import { JurnalChapterAiAssistant } from "@/components/workspace/JurnalChapterAiAssistant";
import { DataHub } from "@/components/workspace/DataHub";
import { DataAnalysisDashboard } from "@/components/workspace/DataAnalysisDashboard";
import { WorkspaceNotesPanel } from "@/components/workspace/WorkspaceNotesPanel";
import { WORKSPACE_TABS, calculateWorkspaceProgress, serializeLocalImages, deserializeLocalImages } from "@/lib/workspaceDefaults";

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
  await d1Request("workspaces", {
    method: "PATCH",
    id: workspaceId,
    body: {
      content: JSON.stringify(nextContentBuffer),
      activeChapter,
      progress,
      referenceCount,
      responseCount,
      methodologyType,
      activeFormId,
      ...overrides,
    }
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [references, setReferences] = useState([]);
  const [forms, setForms] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [analysisSnapshots, setAnalysisSnapshots] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [isContextReferenceCardOpen, setIsContextReferenceCardOpen] = useState(true);
  const [contextExpandedReferenceIds, setContextExpandedReferenceIds] = useState([]);
  const [contextPreviewReference, setContextPreviewReference] = useState(null);

  // Root Context states for Journal
  const [rootContext, setRootContext] = useState({
    rumusanMasalah: "",
    fenomenaUmum: "",
    faktaLapangan: "",
    metode: "",
    gapAnalysis: "",
    kebaruanNovelty: ""
  });
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedRootContext, setEditedRootContext] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showContextGuide, setShowContextGuide] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

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
        setIsLeftRailCollapsed(true);
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

    let isMounted = true;
    async function fetchWorkspace() {
      try {
        const response = await d1Request("workspaces", { id });
        const data = response.data;
        if (!data || data.user_id !== user.uid) {
          if (isMounted) { setNotFound(true); setLoading(false); }
          return;
        }
        if (isMounted) {
          let parsedSections = [];
          try {
            parsedSections = typeof data.journalSections === 'string'
              ? JSON.parse(data.journalSections)
              : (data.journalSections || []);
          } catch (e) {
            console.error("Gagal parse journalSections", e);
          }
          data.journalSections = parsedSections;

          setWorkspace(data);
          if (!hydratedRef.current) {
            const initialBuffer = {};
            let parsedContent = {};
            try {
              parsedContent = data.content ? JSON.parse(data.content) : {};
            } catch (e) {
              console.error("Gagal parse content", e);
            }
            parsedSections.forEach((section) => {
              initialBuffer[section.key] = deserializeLocalImages(parsedContent[section.key] || "");
            });
            setContentBuffer(initialBuffer);
            setActiveChapter(Number.isFinite(data.activeChapter) ? data.activeChapter : 0);
            hydratedRef.current = true;
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
        if (isMounted) setLoading(false);
      }
    }
    fetchWorkspace();
    const interval = setInterval(fetchWorkspace, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [id, user]);

  // Fetch sub-collections via D1
  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    async function fetchSubs() {
      try {
        const refs = await d1Request("workspace_references");
        if (isMounted) setReferences((refs.data || []).filter(r => r.workspace_id === id));
        const frms = await d1Request("workspace_forms");
        if (isMounted) setForms((frms.data || []).filter(f => f.workspace_id === id));
        const trans = await d1Request("workspace_transcripts");
        if (isMounted) setTranscripts((trans.data || []).filter(t => t.workspace_id === id));
        const anly = await d1Request("workspace_analysis");
        const anlyData = (anly.data || []).filter(a => a.workspace_id === id);
        anlyData.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (isMounted) setAnalysisSnapshots(anlyData);

        // Fetch notes
        const nts = await d1Request("workspace_notes");
        const allNotes = nts.data || [];

        const generalNote = allNotes.find(n => n.workspace_id === id && n.id === "general");
        if (isMounted && generalNote) setNoteText(generalNote.content || "");

        // Fetch Root Context
        const rootContextNote = allNotes.find(n => n.workspace_id === id && n.id === `root_context_${id}`);
        let parsedRoot = {
          rumusanMasalah: "",
          fenomenaUmum: "",
          faktaLapangan: "",
          metode: "",
          gapAnalysis: "",
          kebaruanNovelty: ""
        };
        if (rootContextNote && rootContextNote.content) {
          try {
            parsedRoot = JSON.parse(rootContextNote.content);
            if (isMounted) setRootContext(parsedRoot);
          } catch (e) {
            console.error("Error parsing root context", e);
          }
        }

        // Onboarding Guide Check for Jurnal (if root context is empty and session skip is not set)
        if (isMounted && !hasCheckedOnboarding) {
          const skippedSessionKey = `skipped_guide_${id}`;
          const hasSkipped = sessionStorage.getItem(skippedSessionKey) === "true";

          const hasNoRoot = !parsedRoot.rumusanMasalah && !parsedRoot.fenomenaUmum && !parsedRoot.faktaLapangan;

          if (hasNoRoot && !hasSkipped) {
            setShowContextGuide(true);
            setIsRightPanelOpen(true);
          }
          setHasCheckedOnboarding(true);
        }
      } catch (e) { console.error("Failed fetching subs", e); }
    }
    fetchSubs();
    const interval = setInterval(fetchSubs, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [id]);

  const activeForm = useMemo(
    () => forms.find((item) => item.id === workspace?.activeFormId) || forms.find((item) => item.status === "published") || null,
    [forms, workspace?.activeFormId]
  );

  const latestAnalysis = analysisSnapshots[0] || null;
  const currentChapter = (workspace?.journalSections || [])[activeChapter] || { key: "unknown", label: "Loading...", promptContext: "" };
  const currentChapterReferences = useMemo(
    () => references.filter((reference) => (reference.chapterKeys || []).includes(currentChapter?.key)),
    [currentChapter?.key, references]
  );

  const progress = useMemo(() => calculateWorkspaceProgress(contentBuffer, "jurnal", workspace?.journalSections || []), [contentBuffer, workspace?.journalSections]);
  const contextPanelWidth = isMobile ? "min(calc(100vw - 1.5rem), 420px)" : "360px";

  // Stabilize persistWorkspace using Ref to avoid dependency loop with polling
  const saveContextRef = useRef({
    workspace, activeChapter, progress, references, latestAnalysis, activeForm
  });

  useEffect(() => {
    saveContextRef.current = {
      workspace, activeChapter, progress, references, latestAnalysis, activeForm
    };
  }, [workspace, activeChapter, progress, references, latestAnalysis, activeForm]);

  const persistWorkspace = useCallback(
    async (nextContentBuffer = contentBuffer, overrides = {}) => {
      const ctx = saveContextRef.current;
      if (!ctx.workspace || isSaving) return;

      setIsSaving(true);
      setSaveState("saving");

      const serializedBuffer = {};
      Object.keys(nextContentBuffer).forEach((key) => {
        serializedBuffer[key] = serializeLocalImages(nextContentBuffer[key] || "");
      });

      try {
        await persistWorkspaceDoc({
          workspaceId: ctx.workspace.id,
          nextContentBuffer: serializedBuffer,
          activeChapter: ctx.activeChapter,
          progress: ctx.progress,
          referenceCount: ctx.references.length,
          responseCount: ctx.latestAnalysis?.responseCount || ctx.workspace.responseCount || 0,
          methodologyType: ctx.workspace.methodologyType || "kuantitatif",
          activeFormId: ctx.activeForm?.id || ctx.workspace.activeFormId || null,
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
    [contentBuffer, isSaving]
  );

  const handleExportWord = (exportAll = false) => {
    if (!workspace || !workspace.journalSections) return;

    let bodyHtml = "";
    if (exportAll) {
      workspace.journalSections.forEach((section, index) => {
        const rawHtml = contentBuffer[section.key] || "";
        const deserializedHtml = deserializeLocalImages(rawHtml);
        const titleHtml = `<h1 style="text-align: center; text-transform: uppercase; font-family: 'Times New Roman'; font-weight: bold; font-size: 14pt; margin-bottom: 18pt;">${section.label}</h1>`;

        if (index > 0) {
          bodyHtml += `<div style="page-break-before: always; mso-break-type: section-break;">${titleHtml}${deserializedHtml}</div>`;
        } else {
          bodyHtml += `<div>${titleHtml}${deserializedHtml}</div>`;
        }
      });
    } else {
      const section = workspace.journalSections[activeChapter];
      if (!section) return;
      const rawHtml = contentBuffer[section.key] || "";
      const deserializedHtml = deserializeLocalImages(rawHtml);
      const titleHtml = `<h1 style="text-align: center; text-transform: uppercase; font-family: 'Times New Roman'; font-weight: bold; font-size: 14pt; margin-bottom: 18pt;">${section.label}</h1>`;
      bodyHtml = `<div>${titleHtml}${deserializedHtml}</div>`;
    }

    const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${workspace.title || "Ekspor Word"}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
  size: 21cm 29.7cm; /* A4 */
  margin: 4cm 3cm 3cm 4cm; /* Top 4cm, Right 3cm, Bottom 3cm, Left 4cm */
}
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #000000;
}
p {
  margin-top: 0;
  margin-bottom: 12pt;
  text-align: justify;
  text-indent: 1.25cm;
  line-height: 1.5;
}
h1 {
  font-family: 'Times New Roman', Times, serif;
  font-size: 14pt;
  text-align: center;
  text-transform: uppercase;
  font-weight: bold;
  margin-top: 0;
  margin-bottom: 18pt;
  page-break-after: avoid;
}
h2 {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  text-align: justify;
  font-weight: bold;
  margin-top: 18pt;
  margin-bottom: 6pt;
  page-break-after: avoid;
}
h3 {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  text-align: justify;
  font-weight: bold;
  font-style: italic;
  margin-top: 12pt;
  margin-bottom: 6pt;
  page-break-after: avoid;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 12pt 0;
}
th, td {
  border: 1px solid #000000;
  padding: 6pt;
  font-size: 11pt;
}
img {
  max-width: 100%;
  height: auto;
}
</style>
</head>
<body>
<div class="Section1">
${bodyHtml}
</div>
</body>
</html>
`;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const activeSection = workspace.journalSections[activeChapter];
    a.download = exportAll
      ? `${workspace.title || "Jurnal"}_Lengkap.doc`
      : `${workspace.title || "Jurnal"}_${activeSection?.label || "Bab"}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!hydratedRef.current) return undefined;
    setSaveState("dirty");
    // Autosave removed at user request to reduce query load
  }, [contentBuffer]);

  useEffect(() => {
    if (!workspace?.id) return undefined;

    const timeoutId = window.setTimeout(() => {
      void d1Request("workspaces", {
        method: "PATCH",
        id: workspace.id,
        body: {
          progress,
          referenceCount: references.length,
          responseCount: latestAnalysis?.responseCount || 0,
          activeFormId: activeForm?.id || null,
          activeChapter
        }
      }).catch((error) => console.error("Gagal sinkron metadata workspace:", error));
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [activeChapter, activeForm?.id, latestAnalysis?.responseCount, progress, references.length, workspace?.id]);

  useEffect(() => {
    if (saveState === "dirty" || isEditingContext) {
      window.isSkripzyWorkspaceDirty = true;
    } else {
      window.isSkripzyWorkspaceDirty = false;
    }

    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persistWorkspace(contentBuffer);
      }
    };

    const handleBeforeUnload = (e) => {
      if (saveState === "dirty" || isEditingContext) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.isSkripzyWorkspaceDirty = false;
      window.removeEventListener("keydown", handler);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [contentBuffer, persistWorkspace, saveState, isEditingContext]);

  const wordCount = useMemo(() => {
    const rawText = (contentBuffer[currentChapter?.key] || "").replace(/<[^>]*>/g, " ");
    return rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  }, [contentBuffer, currentChapter?.key]);

  const handleSaveContext = async (newRoot) => {
    if (!id) return;
    try {
      // Save Root Context
      const rootId = `root_context_${id}`;
      const rootCheck = await d1Request("workspace_notes", { method: "GET", id: rootId });
      if (rootCheck && rootCheck.data) {
        await d1Request("workspace_notes", {
          method: "PATCH",
          id: rootId,
          body: { content: JSON.stringify(newRoot) }
        });
      } else {
        await d1Request("workspace_notes", {
          method: "POST",
          body: {
            id: rootId,
            workspace_id: id,
            content: JSON.stringify(newRoot)
          }
        });
      }
      setRootContext(newRoot);
      setIsEditingContext(false);
      setShowSaveConfirm(false);
      setShowContextGuide(false);
    } catch (e) {
      console.error("Gagal menyimpan konteks:", e);
      alert("Gagal menyimpan konteks. Periksa koneksi.");
    }
  };

  const handleStatusChange = async (status) => {
    if (!workspace) return;
    setWorkspace((current) => ({ ...current, status }));
    await d1Request("workspaces", {
      method: "PATCH",
      id: workspace.id,
      body: { status }
    });
  };

  const handleMethodologyChange = async (methodologyType) => {
    if (!workspace) return;
    setWorkspace((current) => ({ ...current, methodologyType }));
    await d1Request("workspaces", {
      method: "PATCH",
      id: workspace.id,
      body: { methodologyType }
    });
  };

  const handleEditorChange = (chapterKey, html) => {
    setContentBuffer((current) => ({
      ...current,
      [chapterKey]: html,
    }));
  };

  const handleAiInsertContent = (generatedHtml, targetChapterIndex = null) => {
    let chapterKey = currentChapter?.key || "unknown";

    if (targetChapterIndex !== null && JURNAL_IMRAD_TEMPLATE[targetChapterIndex]) {
      chapterKey = JURNAL_IMRAD_TEMPLATE[targetChapterIndex].key;
      setActiveChapter(targetChapterIndex);
      setActiveTab("penulisan");
    }

    if (chapterKey === "unknown") return;

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
        <DefaultSpinner size="medium" sizePixel={48} />
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
        <Link href="/dashboard/jurnal" className="btn btn-primary" style={{ marginTop: "1rem", display: "inline-flex" }}>
          <PremiumIcon name="arrowLeft" size={15} />
          Kembali
        </Link>
      </div>
    );
  }

  const rightPanel = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", minHeight: 0, height: "100%", flex: 1 }}>
      {activeTab === "penulisan" && (
        <div className="workspace-scroll" style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "0.25rem" }}>
          {/* Root Context Form */}
          <div className="glass-panel" style={{ padding: isSm ? "0.65rem" : "1rem", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: isSm ? "0.5rem" : "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
              <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <PremiumIcon name="brainCircuit" size={16} />
                <span>Konteks Utama (Brain Root)</span>
              </h4>
              {!isEditingContext && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto" }}
                  onClick={() => {
                    setEditedRootContext({ ...rootContext });
                    setIsEditingContext(true);
                  }}
                >
                  Edit Konteks
                </button>
              )}
            </div>

            {isEditingContext ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: isSm ? "0.68rem" : "0.72rem", marginBottom: "0.15rem" }}>Fenomena Umum</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: isSm ? "0.74rem" : "0.78rem", padding: isSm ? "0.3rem" : "0.4rem" }}
                    rows={2}
                    value={editedRootContext?.fenomenaUmum || ""}
                    onChange={e => setEditedRootContext(prev => ({ ...prev, fenomenaUmum: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: isSm ? "0.68rem" : "0.72rem", marginBottom: "0.15rem" }}>Fakta Lapangan / Masalah</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: isSm ? "0.74rem" : "0.78rem", padding: isSm ? "0.3rem" : "0.4rem" }}
                    rows={2}
                    value={editedRootContext?.faktaLapangan || ""}
                    onChange={e => setEditedRootContext(prev => ({ ...prev, faktaLapangan: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: isSm ? "0.68rem" : "0.72rem", marginBottom: "0.15rem" }}>Rumusan Masalah</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: isSm ? "0.74rem" : "0.78rem", padding: isSm ? "0.3rem" : "0.4rem" }}
                    rows={2}
                    value={editedRootContext?.rumusanMasalah || ""}
                    onChange={e => setEditedRootContext(prev => ({ ...prev, rumusanMasalah: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: isSm ? "0.68rem" : "0.72rem", marginBottom: "0.15rem" }}>Metode</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: isSm ? "0.74rem" : "0.78rem", padding: isSm ? "0.3rem" : "0.4rem" }}
                    rows={2}
                    value={editedRootContext?.metode || ""}
                    onChange={e => setEditedRootContext(prev => ({ ...prev, metode: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: isSm ? "0.68rem" : "0.72rem", marginBottom: "0.15rem" }}>Gap Analysis (Opsional)</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: isSm ? "0.74rem" : "0.78rem", padding: isSm ? "0.3rem" : "0.4rem" }}
                    rows={2}
                    value={editedRootContext?.gapAnalysis || ""}
                    onChange={e => setEditedRootContext(prev => ({ ...prev, gapAnalysis: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: isSm ? "0.68rem" : "0.72rem", marginBottom: "0.15rem" }}>Kebaruan / Novelty (Opsional)</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: isSm ? "0.74rem" : "0.78rem", padding: isSm ? "0.3rem" : "0.4rem" }}
                    rows={2}
                    value={editedRootContext?.kebaruanNovelty || ""}
                    onChange={e => setEditedRootContext(prev => ({ ...prev, kebaruanNovelty: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: isSm ? "0.72rem" : "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                <div><strong>Fenomena Umum:</strong> {rootContext.fenomenaUmum || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Belum diisi...</span>}</div>
                <div><strong>Fakta/Permasalahan:</strong> {rootContext.faktaLapangan || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Belum diisi...</span>}</div>
                <div><strong>Rumusan Masalah:</strong> {rootContext.rumusanMasalah || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Belum diisi...</span>}</div>
                <div><strong>Metode:</strong> {rootContext.metode || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Belum diisi...</span>}</div>
                {rootContext.gapAnalysis && <div><strong>Gap Analysis:</strong> {rootContext.gapAnalysis}</div>}
                {rootContext.kebaruanNovelty && <div><strong>Kebaruan:</strong> {rootContext.kebaruanNovelty}</div>}
              </div>
            )}
          </div>

          {/* Action buttons when editing context */}
          {isEditingContext && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {showSaveConfirm ? (
                <div className="glass-panel" style={{ padding: "0.75rem", backgroundColor: "rgba(79, 70, 229, 0.05)", border: "1px solid var(--primary)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-main)", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
                    <PremiumIcon name="alertTriangle" size={16} className="text-warning" style={{ flexShrink: 0, marginTop: "1.5px" }} />
                    <span>Konteks ini adalah panduan utama AI Anda. Apakah Anda yakin ingin menyimpan perubahan?</span>
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "auto" }} onClick={() => setShowSaveConfirm(false)}>Batal</button>
                    <button className="btn btn-primary" style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", height: "auto" }} onClick={() => void handleSaveContext(editedRootContext)}>Ya, Simpan</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-outline" style={{ flex: 1, padding: "0.45rem", fontSize: "0.78rem" }} onClick={() => { setIsEditingContext(false); setShowSaveConfirm(false); }}>Batal</button>
                  <button className="btn btn-primary" style={{ flex: 1, padding: "0.45rem", fontSize: "0.78rem" }} onClick={() => setShowSaveConfirm(true)}>Simpan</button>
                </div>
              )}
            </div>
          )}

          {/* Notes Panel inside the scroll area */}
          <div style={{ minHeight: 0, flexShrink: 0, marginTop: "-0.25rem" }}>
            <WorkspaceNotesPanel workspaceId={workspace.id} collapsible defaultCollapsed rows={8} />
          </div>
        </div>
      )}

      {activeTab === "analisis" && latestAnalysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Snapshot Analisis Terakhir</h3>
            <p style={{ margin: "0.55rem 0 0 0", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-main)" }}>
              {latestAnalysis.narrative || "Snapshot sudah tersimpan namun narasi belum tersedia."}
            </p>
          </div>
          <div style={{ minHeight: 0, flexShrink: 0 }}>
            <WorkspaceNotesPanel workspaceId={workspace.id} collapsible defaultCollapsed rows={8} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ margin: isMobile ? "-0.75rem" : "-1.5rem", minHeight: "calc(100vh - 72px)", backgroundColor: "var(--background)" }}>
      <div
        style={{
          padding: isSm 
            ? "calc(env(safe-area-inset-top, 0px) + 0.5rem) 0.75rem 0.5rem" 
            : "calc(env(safe-area-inset-top, 0px) + 0.75rem) 1rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "color-mix(in srgb, var(--surface) 92%, transparent)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: isMobile ? "-0.75rem" : "-1.5rem",
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: isXs ? "column" : "row", flexWrap: "wrap", justifyContent: "space-between", gap: isXs ? "0.6rem" : "0.9rem", alignItems: isXs ? "stretch" : "center" }}>
          <div style={{ minWidth: 0, flex: isSm ? "auto" : "1 1 360px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: isXs ? "0.3rem" : "0.5rem", flexWrap: "nowrap" }}>
              <button
                onClick={() => {
                  if (saveState === "dirty") {
                    if (!window.confirm("Ada perubahan yang belum disimpan. Anda yakin ingin keluar?")) return;
                  }
                  window.location.href = "/dashboard/jurnal";
                }}
                style={{ display: "inline-flex", color: "var(--text-muted)", flexShrink: 0, background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <PremiumIcon name="arrowLeft" size={isSm ? 14 : 18} />
              </button>
              <span style={{ display: "inline-flex", color: "var(--primary)", flexShrink: 0, marginLeft: "0.15rem" }}>
                <PremiumIcon name="fileText" size={isSm ? 14 : 18} />
              </span>
              <h1
                style={{
                  fontSize: isSm ? "0.85rem" : "1.05rem",
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: isSm ? 1.3 : 1.2,
                  minWidth: 0,
                  flex: 1,
                  wordBreak: "break-word",
                }}
                title={workspace.title || "Tanpa Judul"}
              >
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
          </div>          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", justifyContent: "flex-end", flexShrink: 0 }}>
            {(isHeaderExpanded || !isSm) ? (
              <>
                {/* Minimal Blue Progress Line Bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "110px", marginRight: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1 }}>
                    <span>Progress</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div style={{ width: "100%", height: "4px", backgroundColor: "var(--border)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#3b82f6", borderRadius: "999px", transition: "width 0.4s ease" }} />
                  </div>
                </div>

                {/* Word Export Dropdown Menu */}
                <div style={{ position: "relative", marginRight: "0.5rem" }}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="btn btn-outline"
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.75rem",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      height: "30px",
                      transition: "all 0.2s"
                    }}
                  >
                    <PremiumIcon name="fileText" size={13} style={{ color: "#2b579a" }} />
                    <span>Docx</span>
                    <PremiumIcon name="chevronDown" size={12} />
                  </button>
                  {showExportMenu && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 100 }}
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div
                        className="glass-panel"
                        style={{
                          position: "absolute",
                          top: "110%",
                          right: 0,
                          zIndex: 101,
                          padding: "0.4rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                          minWidth: "180px",
                          boxShadow: "var(--shadow-lg)",
                          backgroundColor: "var(--surface)",
                        }}
                      >
                        <button
                          className="btn btn-ghost"
                          style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.4rem 0.6rem", width: "100%" }}
                          onClick={() => {
                            handleExportWord(false);
                            setShowExportMenu(false);
                          }}
                        >
                          <PremiumIcon name="file" size={13} style={{ marginRight: "0.4rem" }} />
                          <span>Ekspor Bab Sekarang</span>
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ justifyContent: "flex-start", fontSize: "0.75rem", padding: "0.4rem 0.6rem", width: "100%" }}
                          onClick={() => {
                            handleExportWord(true);
                            setShowExportMenu(false);
                          }}
                        >
                          <PremiumIcon name="files" size={13} style={{ marginRight: "0.4rem" }} />
                          <span>Ekspor Seluruh Jurnal</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Minimal Save Button */}
                <button
                  className={`btn ${saveState === "dirty" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => persistWorkspace(contentBuffer)}
                  disabled={isSaving}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.75rem",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    height: "30px",
                    transition: "all 0.2s"
                  }}
                >
                  {saveState === "saving" ? <DefaultSpinner size="tiny" sizePixel={12} color="white" /> : <PremiumIcon name="save" size={13} />}
                  <span>{saveState === "saving" ? "Menyimpan" : saveState === "dirty" ? "Simpan" : "Tersimpan"}</span>
                </button>
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
          transition: "filter 0.3s ease",
          filter: isRightPanelOpen ? "blur(5px)" : "none",
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
              {(workspace?.journalSections || []).map((section, index) => (
                <button
                  key={section.key}
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
                  title={section.label}
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
                    <h3 style={{ fontSize: "0.92rem", margin: 0 }}>Journal Cockpit</h3>
                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.74rem" }}>Mode kerja dan navigasi section.</p>
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

            <div style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.65rem", minHeight: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexShrink: 0 }}>
                {!isLeftRailCollapsed ? <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>Struktur Section</span> : null}
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{progress}%</span>
              </div>
              <div className="workspace-scroll" style={{ display: "flex", flexDirection: "column", gap: "0.65rem", overflowY: "auto", minHeight: 0, flex: 1 }}>
                {(workspace?.journalSections || []).map((chapter, index) => (
                  <button
                    key={chapter.key}
                    className={`btn ${activeChapter === index ? "btn-primary" : "btn-ghost"}`}
                    style={{ justifyContent: isLeftRailCollapsed ? "center" : "space-between", paddingInline: isLeftRailCollapsed ? "0.5rem" : undefined, flexShrink: 0 }}
                    onClick={() => {
                      setActiveTab("penulisan");
                      setActiveChapter(index);
                    }}
                    title={chapter.label}
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
                  ? currentChapter.label
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
                    placeholder={currentChapter.promptContext || "Mulai menulis di sini..."}
                    isMobile={isSm}
                  />
                </div>
              </div>

              <div style={{ padding: "0.65rem 1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", flexShrink: 0 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Referensi terhubung: <strong style={{ color: "var(--text-main)" }}>{currentChapterReferences.length}</strong>
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <PremiumIcon name="edit3" size={13} />
                  <span><strong style={{ color: "var(--text-main)" }}>{wordCount}</strong> kata</span>
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                  Tekan <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: "4px" }}>Ctrl+S</kbd> untuk menyimpan manual
                </span>
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

      <JurnalChapterAiAssistant
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
        rootContext={rootContext}
        isMobile={isSm}
        onTriggerContextFill={() => {
          setIsRightPanelOpen(true);
          setEditedRootContext({ ...rootContext });
          setIsEditingContext(true);
        }}
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
              backgroundColor: "rgba(15, 23, 42, 0.15)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              border: "none",
              zIndex: 45,
            }}
          />
          <aside
            className="workspace-scroll"
            style={{
              position: "fixed",
              top: isMobile ? "2.5rem" : contextPreviewReference ? "104px" : "84px",
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

      {/* Onboarding blur overlay and guide pointer */}
      {showContextGuide && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.28)",
            backdropFilter: "blur(6px)",
            zIndex: 44, // below right panel (50) but above editor
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Animated pointer cursor pointing to the context panel */}
          <div
            style={{
              position: "fixed",
              top: "140px",
              right: isMobile ? "20px" : "385px",
              zIndex: 46,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "0.5rem",
              animation: "bounceSide 1.5s infinite alternate",
            }}
          >
            <div style={{
              backgroundColor: "var(--primary)",
              color: "white",
              padding: "0.5rem 0.8rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(79,70,229,0.3)",
              whiteSpace: "nowrap",
            }}>
              Lengkapi di sini
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              color: "white",
              boxShadow: "0 0 16px rgba(79,70,229,0.4)"
            }}>
              <PremiumIcon name="arrowRight" size={18} />
            </div>
          </div>

          <style>{`
            @keyframes bounceSide {
              0% { transform: translateX(0); }
              100% { transform: translateX(-8px); }
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(16px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {/* Guide Tooltip Modal (Glassmorphic) */}
          <div style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, transparent), color-mix(in srgb, var(--background) 85%, transparent))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            maxWidth: "460px",
            width: "90%",
            boxShadow: "0 28px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
            color: "var(--text-main)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            zIndex: 45,
            position: "relative",
            animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(79, 70, 229, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              color: "var(--primary)",
              boxShadow: "0 8px 24px rgba(79,70,229,0.12)"
            }}>
              <PremiumIcon name="brainCircuit" size={32} />
            </div>

            <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.01em", color: "var(--text-main)" }}>
              Aktifkan AI Copilot Jurnal Anda 🚀
            </h3>
            <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              Sebelum mulai menulis dengan AI, lengkapi dulu <strong>Konteks Utama (Brain Root)</strong> agar draf naskah publikasi jurnal yang dihasilkan terarah dan akurat.
              <span style={{ fontSize: "0.76rem", display: "block", marginTop: "0.6rem", fontStyle: "italic", opacity: 0.8 }}>
                *Anda tetap bisa melewati panduan ini untuk mengetik manual.
              </span>
            </p>

            <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", width: "100%", marginTop: "0.5rem" }}>
              <button
                className="btn btn-outline"
                style={{
                  flex: 1,
                  padding: "0.75rem 1.2rem",
                  fontSize: "0.82rem",
                  borderRadius: "12px",
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                  transition: "all 0.2s"
                }}
                onClick={() => {
                  sessionStorage.setItem(`skipped_guide_${id}`, "true");
                  setShowContextGuide(false);
                }}
              >
                Lewati Mandiri
              </button>

              <button
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: "0.75rem 1.2rem",
                  fontSize: "0.82rem",
                  borderRadius: "12px",
                  boxShadow: "0 8px 20px rgba(79,70,229,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  transition: "all 0.2s"
                }}
                onClick={() => {
                  setIsRightPanelOpen(true);
                  setEditedRootContext({ ...rootContext });
                  setIsEditingContext(true);
                  setShowContextGuide(false);
                }}
              >
                <PremiumIcon name="sparkles" size={14} />
                <span>Isi Konteks</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
