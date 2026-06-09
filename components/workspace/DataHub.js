"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { FormBuilder } from "./FormBuilder";
import { DataAnalysisDashboard } from "./DataAnalysisDashboard";
import { TranscriptManager } from "./TranscriptManager";
import { FORM_STATUSES, createEmptyForm, createId, flattenFormQuestions } from "@/lib/workspaceDefaults";
import { ChevronLeft, Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import Link from "next/link";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

export function DataHub({ workspaceId, hideQualitative = false }) {
  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // Set initial tab based on qualitative mode
  const [activeTab, setActiveTab] = useState(hideQualitative ? "builder" : "angket");
  
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [offlineFiles, setOfflineFiles] = useState([]);
  const [csvPreview, setCsvPreview] = useState(null);
  
  const [activeFormId, setActiveFormId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingCsvPreview, setLoadingCsvPreview] = useState(false);
  const [showQuantAnalysis, setShowQuantAnalysis] = useState(false);
  
  const creatingDefaultRef = useRef(false);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchAllData() {
      // 1. Fetch workspace info
      try {
        const wsResp = await d1Request("workspaces", { id: workspaceId });
        if (isMounted && wsResp.data) {
          setWorkspace(wsResp.data);
          setActiveFormId(wsResp.data.activeFormId || null);
        }
      } catch (e) {
        console.warn("DataHub: gagal fetch workspace:", e.message);
      }

      // 2. Fetch forms
      try {
        const formsResp = await d1Request("workspace_forms");
        let nextForms = (formsResp.data || []).filter(f => f.workspace_id === workspaceId);
        nextForms = nextForms.map(f => {
          let parsed = {};
          try { parsed = typeof f.content === "string" ? JSON.parse(f.content) : (f.content || {}); } catch {}
          return { ...f, ...parsed };
        });
        nextForms.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        
        if (isMounted) setForms(nextForms);

        // Auto create form if empty (only for quantitative notebook workspace)
        if (isMounted && nextForms.length === 0 && hideQualitative && !creatingDefaultRef.current) {
          creatingDefaultRef.current = true;
          const formId = createId("form");
          const nextForm = createEmptyForm({ id: formId, title: "Kuesioner Utama" });
          
          try {
            await d1Request("workspace_forms", {
              method: "POST",
              body: {
                id: formId,
                workspace_id: workspaceId,
                title: nextForm.title,
                status: FORM_STATUSES.draft,
                content: JSON.stringify({
                  description: "Silakan isi dan lengkapi instrumen penelitian ini.",
                  publicSlug: "",
                  settings: nextForm.settings || {},
                  sections: nextForm.sections || [],
                }),
              }
            });

            await d1Request("workspaces", {
              method: "PATCH",
              id: workspaceId,
              body: { activeFormId: formId }
            });
            
            const newForm = { ...nextForm, workspace_id: workspaceId, status: FORM_STATUSES.draft, description: "Silakan isi dan lengkapi instrumen penelitian ini." };
            if (isMounted) {
              setForms([newForm]);
              setActiveFormId(formId);
            }
          } catch (err) {
            console.error("Gagal membuat form default:", err);
          } finally {
            creatingDefaultRef.current = false;
          }
        }
      } catch (e) {
        console.warn("DataHub: gagal fetch forms:", e.message);
      }

      // 3. Fetch responses
      try {
        const responsesResp = await d1Request("workspace_form_responses");
        let nextResponses = (responsesResp.data || []).filter(r => r.workspace_id === workspaceId);
        nextResponses = nextResponses.map(r => {
          let parsedAnswers = {};
          try { parsedAnswers = typeof r.answers === "string" ? JSON.parse(r.answers) : (r.answers || {}); } catch {}
          return { ...r, answers: parsedAnswers };
        });
        if (isMounted) setResponses(nextResponses);
      } catch (e) {
        console.warn("DataHub: gagal fetch responses:", e.message);
        if (isMounted) setResponses([]);
      }

      // 4. Fetch transcripts if qualitative allowed
      if (!hideQualitative) {
        try {
          const transResp = await d1Request("workspace_transcripts");
          const rawTrans = transResp.data || [];
          const parsedTrans = rawTrans.filter(t => t.workspace_id === workspaceId).map(t => {
            let parsedContent = { role: "", interviewDate: "", tags: [], excerpt: "", category: "wawancara", text: t.content || "" };
            try {
              if (t.content && t.content.trim().startsWith("{")) {
                const parsed = JSON.parse(t.content);
                parsedContent = {
                  role: parsed.role || "",
                  interviewDate: parsed.interviewDate || "",
                  tags: parsed.tags || [],
                  excerpt: parsed.excerpt || "",
                  category: parsed.category || "wawancara",
                  text: parsed.text || "",
                };
              }
            } catch {}
            return { ...t, ...parsedContent };
          });
          if (isMounted) setTranscripts(parsedTrans);
        } catch (e) {
          console.warn("DataHub: gagal fetch transcripts:", e.message);
        }

        // 5. Fetch offline angket files metadata from workspace_notes
        try {
          const noteId = `angket_files_${workspaceId}`;
          const filesCheck = await d1Request("workspace_notes", { method: "GET", id: noteId });
          if (isMounted && filesCheck && filesCheck.data) {
            const parsedFiles = JSON.parse(filesCheck.data.content || "[]");
            setOfflineFiles(parsedFiles);
          }
        } catch (e) {
          console.warn("DataHub: gagal fetch offline files:", e.message);
        }
      }
    }

    fetchAllData();
    const interval = setInterval(fetchAllData, 8000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [workspaceId, hideQualitative]);

  const activeForm = useMemo(() => {
    if (hideQualitative) {
      return forms[0] || null;
    }
    return forms.find((form) => form.id === editingFormId) || null;
  }, [editingFormId, forms, hideQualitative]);

  const handleCreateForm = async () => {
    const formId = createId("form");
    const nextForm = createEmptyForm({ id: formId, title: `Instrumen ${forms.length + 1}` });
    await d1Request("workspace_forms", {
      method: "POST",
      body: {
        id: formId,
        workspace_id: workspaceId,
        title: nextForm.title,
        status: FORM_STATUSES.draft,
        content: JSON.stringify({
          description: nextForm.description || "",
          publicSlug: "",
          settings: nextForm.settings || {},
          sections: nextForm.sections || [],
        }),
      }
    });
    setForms(prev => [{ ...nextForm, workspace_id: workspaceId }, ...prev]);
    setEditingFormId(formId);
  };

  const handleActivateForm = async (formId) => {
    await d1Request("workspaces", {
      method: "PATCH",
      id: workspaceId,
      body: { activeFormId: formId }
    });
    setActiveFormId(formId);
  };

  const tabs = useMemo(() => {
    if (hideQualitative) {
      return [
        { key: "builder", label: "Rancang Form", icon: "layoutTemplate" },
        { key: "data", label: "Data Responden", icon: "table" },
        { key: "analisis", label: "Analisis Statistik", icon: "barChart3" },
      ];
    }
    return [
      { key: "angket", label: "Hasil Angket", icon: "layoutTemplate" },
      { key: "wawancara", label: "Transkrip Wawancara", icon: "mic" },
      { key: "observasi", label: "Transkrip Observasi", icon: "eye" },
    ];
  }, [hideQualitative]);

  const activeFormQuestions = useMemo(() => {
    const mainForm = hideQualitative ? forms[0] : forms.find(f => f.id === activeFormId);
    if (!mainForm) return [];
    return flattenFormQuestions(mainForm).filter((q) => q.type !== "sectionText");
  }, [activeFormId, forms, hideQualitative]);

  const getFormattedAnswer = (resp, q) => {
    const val = resp.answers?.[q.id];
    if (val === undefined || val === null) return "-";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const handleExportCSV = () => {
    const mainForm = hideQualitative ? forms[0] : forms.find(f => f.id === activeFormId);
    if (!mainForm || !responses.length || !activeFormQuestions.length) return;
    
    const headers = ["No", "Waktu Pengisian", ...activeFormQuestions.map(q => q.variableKey ? `[${q.variableKey}] ${q.label}` : q.label)];
    
    const rows = responses.map((resp, idx) => {
      return [
        idx + 1,
        new Date(resp.created_at || resp.createdAt).toLocaleString("id-ID"),
        ...activeFormQuestions.map(q => {
          const val = resp.answers?.[q.id];
          if (val === undefined || val === null) return "";
          if (Array.isArray(val)) return val.join(", ");
          return String(val);
        })
      ];
    });

    const csvRows = [headers, ...rows].map(row => 
      row.map(val => {
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );

    const csvString = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tabulasi_${mainForm.title.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const targetRespondents = useMemo(() => {
    if (!workspace?.topic) return 100;
    const parsed = parseInt(workspace.topic, 10);
    return isNaN(parsed) ? 100 : parsed;
  }, [workspace]);

  const progressPercent = useMemo(() => {
    if (targetRespondents <= 0) return 0;
    return Math.min(100, Math.round((responses.length / targetRespondents) * 100));
  }, [responses.length, targetRespondents]);

  const activeFormPublicUrl = useMemo(() => {
    const active = hideQualitative ? forms[0] : forms.find(f => f.id === activeFormId);
    if (active && active.status === "published" && active.publicSlug) {
      return `${window.location.origin}/form?slug=${active.publicSlug}`;
    }
    return "";
  }, [forms, activeFormId, hideQualitative]);

  const handleUploadAngketFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // 1. Dapatkan signature Cloudinary
      const signatureResponse = await fetch(`${WORKER_URL}/api/cloudinary-sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-skripzy-secret": WORKER_SECRET,
        },
        body: JSON.stringify({ folder: "Angket" }),
      });

      if (!signatureResponse.ok) {
        throw new Error("Gagal mendapatkan signature Cloudinary.");
      }

      const { signature, timestamp, apiKey, cloudName } = await signatureResponse.json();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("folder", "Angket");

      // 2. Upload ke Cloudinary
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload file tabulasi ke Cloudinary gagal.");
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.secure_url;

      // 3. Simpan metadata ke workspace_notes (angket_files_${workspaceId})
      const noteId = `angket_files_${workspaceId}`;
      const checkRes = await d1Request("workspace_notes", { method: "GET", id: noteId });
      
      let currentFiles = [];
      if (checkRes && checkRes.data) {
        try {
          currentFiles = JSON.parse(checkRes.data.content || "[]");
        } catch {
          currentFiles = [];
        }
      }

      const newFileObj = {
        id: crypto.randomUUID(),
        name: file.name,
        url: fileUrl,
        uploadedAt: new Date().toISOString(),
        size: file.size,
      };

      const nextFiles = [...currentFiles, newFileObj];
      const contentPayload = JSON.stringify(nextFiles);

      if (checkRes && checkRes.data) {
        await d1Request("workspace_notes", {
          method: "PATCH",
          id: noteId,
          body: { content: contentPayload }
        });
      } else {
        await d1Request("workspace_notes", {
          method: "POST",
          body: {
            id: noteId,
            workspace_id: workspaceId,
            content: contentPayload,
          }
        });
      }

      setOfflineFiles(nextFiles);

      // 4. Jika CSV, parse client-side
      if (file.name.endsWith(".csv")) {
        const csvText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result || "");
          reader.onerror = (e) => reject(new Error("Gagal membaca file CSV."));
          reader.readAsText(file);
        });
        parseAndSetCsvPreview(csvText);
      } else {
        setCsvPreview(null);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengunggah file: " + err.message);
    } finally {
      setUploadingFile(false);
      event.target.value = "";
    }
  };

  const handleDeleteAngketFile = async (fileId) => {
    const confirmed = window.confirm("Hapus file tabulasi angket ini?");
    if (!confirmed) return;

    const noteId = `angket_files_${workspaceId}`;
    const nextFiles = offlineFiles.filter(f => f.id !== fileId);
    const contentPayload = JSON.stringify(nextFiles);

    await d1Request("workspace_notes", {
      method: "PATCH",
      id: noteId,
      body: { content: contentPayload }
    });

    setOfflineFiles(nextFiles);
    setCsvPreview(null);
  };

  const handleLoadCsvPreview = async (file) => {
    if (!file.name.endsWith(".csv")) {
      setCsvPreview(null);
      return;
    }
    setLoadingCsvPreview(true);
    try {
      const response = await fetch(file.url);
      const text = await response.text();
      parseAndSetCsvPreview(text);
    } catch (err) {
      console.error("Gagal load CSV preview:", err);
      alert("Gagal memuat pratinjau CSV.");
    } finally {
      setLoadingCsvPreview(false);
    }
  };

  const parseAndSetCsvPreview = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    const result = lines.map(line => {
      const row = [];
      let insideQuote = false;
      let entry = "";
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          row.push(entry.trim());
          entry = "";
        } else {
          entry += char;
        }
      }
      row.push(entry.trim());
      return row;
    });

    if (result.length > 0) {
      setCsvPreview({
        headers: result[0],
        rows: result.slice(1, 11), // 10 baris pertama
        totalRows: result.length - 1,
      });
    }
  };

  // Quantitative/Quick Tools Layout
  if (hideQualitative) {
    return (
      <div className="w-full animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Compact Workspace Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          flexWrap: "wrap",
          minHeight: 0,
        }}>
          {/* Back Button */}
          <Link
            href="/dashboard/tools/data-analysis"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px", flexShrink: 0,
              borderRadius: "8px", border: "1px solid var(--border)",
              color: "var(--text-muted)", backgroundColor: "transparent",
              transition: "background 0.15s",
            }}
          >
            <ChevronLeft style={{ width: "16px", height: "16px" }} />
          </Link>

          {/* Title + Status */}
          <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {workspace?.title || "Memuat..."}
            </h1>
            {forms[0]?.status === "published" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "999px", backgroundColor: "rgba(16,185,129,0.12)", color: "var(--success)", whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--success)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                Published
              </span>
            ) : (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: "999px", backgroundColor: "rgba(245,158,11,0.12)", color: "#d97706", whiteSpace: "nowrap", flexShrink: 0 }}>
                Draft
              </span>
            )}
          </div>

          {/* Share link — compact */}
          {activeFormPublicUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0, maxWidth: "100%" }}>
              <input
                type="text"
                readOnly
                value={activeFormPublicUrl}
                style={{ fontSize: "0.72rem", fontFamily: "monospace", backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.3rem 0.6rem", color: "var(--text-muted)", outline: "none", width: "220px", maxWidth: "40vw" }}
              />
              <button
                onClick={() => handleCopyLink(activeFormPublicUrl)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 600, padding: "0.3rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--surface)", color: "var(--text-main)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                <PremiumIcon name={copied ? "check" : "copy"} size={12} style={{ color: copied ? "var(--success)" : "inherit" }} />
                {copied ? "Tersalin!" : "Salin"}
              </button>
            </div>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "#d97706", flexShrink: 0 }}>
              <PremiumIcon name="alertTriangle" size={13} />
              Belum dipublikasikan
            </span>
          )}

          {/* Progress pill — compact, pojok kanan */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem",
            flexShrink: 0, marginLeft: "auto",
          }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Responden
            </span>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--primary)", whiteSpace: "nowrap", lineHeight: 1 }}>
              {responses.length}
              <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--text-muted)" }}> / {targetRespondents}</span>
            </span>
            <div style={{ width: "80px", height: "4px", borderRadius: "999px", backgroundColor: "var(--border)", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", borderRadius: "999px", backgroundColor: progressPercent >= 100 ? "var(--success)" : "var(--primary)", transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.2rem", overflowX: "auto" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className="btn btn-ghost"
              onClick={() => {
                setActiveTab(tab.key);
              }}
              style={{
                borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === tab.key ? "var(--primary)" : "var(--text-muted)",
                borderRadius: 0,
                paddingInline: "0.4rem",
              }}
            >
              <PremiumIcon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {activeTab === "builder" && (
          <div className="w-full bg-card rounded-xl border border-border overflow-hidden">
            {forms[0] ? (
              <FormBuilder
                key={forms[0].id}
                workspaceId={workspaceId}
                form={forms[0]}
                existingForms={forms}
                onSaved={(nextForm) => {
                  setForms((current) => current.map((item) => (item.id === nextForm.id ? nextForm : item)));
                }}
                isInline={true}
              />
            ) : (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {activeTab === "data" && (
          <div className="techy-card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderTop: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 700 }}>Jawaban Responden</h3>
                <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Data mentah dari kuesioner yang sudah masuk. Setiap baris = satu pengisian.
                </p>
              </div>
              {responses.length > 0 && activeFormQuestions.length > 0 && (
                <button className="btn btn-primary" onClick={handleExportCSV}>
                  <PremiumIcon name="download" size={15} />
                  Unduh Data (CSV)
                </button>
              )}
            </div>

            {responses.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", border: "2px dashed var(--border)", borderRadius: "16px", textAlign: "center", backgroundColor: "rgba(var(--surface-rgb), 0.5)" }}>
                <PremiumIcon name="users" size={42} className="text-muted" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <h4 style={{ margin: 0, fontSize: "1.05rem" }}>Belum ada jawaban masuk</h4>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>Salin dan bagikan link kuesioner ke responden agar jawaban mulai masuk ke sini.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "12px", backgroundColor: "var(--background)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", backgroundColor: "var(--surface)" }}>
                      <th style={{ padding: "0.75rem 1rem", width: "50px" }}>No</th>
                      <th style={{ padding: "0.75rem 1rem", minWidth: "150px" }}>Waktu Pengisian</th>
                      {activeFormQuestions.map((q) => (
                        <th key={q.id} style={{ padding: "0.75rem 1rem", minWidth: "160px" }} title={q.label}>
                          <div style={{ fontWeight: 600, color: "var(--text-main)", fontFamily: "monospace", fontSize: "0.82rem" }}>{q.variableKey || "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                            {q.label}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((resp, idx) => (
                      <tr key={resp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>
                          {new Date(resp.created_at || resp.createdAt).toLocaleString("id-ID")}
                        </td>
                        {activeFormQuestions.map((q) => (
                          <td key={q.id} style={{ padding: "0.75rem 1rem", color: "var(--text-main)" }}>
                            {getFormattedAnswer(resp, q)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "analisis" && (
          <DataAnalysisDashboard workspaceId={workspaceId} activeFormId={forms[0]?.id || activeFormId} hideQualitative={true} />
        )}
      </div>
    );
  }

  // Regular Skripsi/Jurnal Layout (With Angket upload, Wawancara/Observasi categorised managers, and AI thematic Analysis)
  return (
    <div className="animate-fade-in" style={{ padding: isMobile ? "0.5rem" : "1.5rem", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <PremiumIcon name="database" size={28} className="text-primary" />
            Manajemen Data & Analisis
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.92rem", color: "var(--text-muted)" }}>
            Kelola angket, transkrip wawancara, observasi, dan lakukan analisis data tematik berbasis AI.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.2rem", overflowX: "auto" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className="btn btn-ghost"
            onClick={() => {
              setActiveTab(tab.key);
            }}
            style={{
              borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === tab.key ? "var(--primary)" : "var(--text-muted)",
              borderRadius: 0,
              paddingInline: "0.4rem",
            }}
          >
            <PremiumIcon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab CONTENT: ANGKET & TABULASI */}
      {activeTab === "angket" && (
        <TranscriptManager workspaceId={workspaceId} category="angket" />
      )}

      {/* Tab CONTENT: WAWANCARA */}
      {activeTab === "wawancara" && (
        <TranscriptManager workspaceId={workspaceId} category="wawancara" />
      )}

      {/* Tab CONTENT: OBSERVASI */}
      {activeTab === "observasi" && (
        <TranscriptManager workspaceId={workspaceId} category="observasi" />
      )}
    </div>
  );
}
