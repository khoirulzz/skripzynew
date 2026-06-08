"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { computeFormAnalysis, buildAnalysisNarrative, computeVariableAnalysis, computeRegressionAnalysis } from "@/lib/formAnalysis";
import { useAuth } from "@/components/providers/AuthProvider";
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import { generateWorkspaceChapter } from "@/lib/workspacePublicApi";
import { flattenFormQuestions } from "@/lib/workspaceDefaults";

function StatTile({ label, value, caption, tone = "default" }) {
  const colorMap = {
    default: "var(--text-main)",
    success: "var(--success)",
    warning: "#d97706",
    primary: "var(--primary)",
  };

  return (
    <div className="glass-panel" style={{ padding: "0.85rem 1rem", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, display: "block", lineHeight: 1.2 }}>{label}</span>
      <span style={{ fontSize: "1.6rem", fontWeight: 800, color: colorMap[tone], lineHeight: 1.1, display: "block" }}>{value}</span>
      {caption ? <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.3, display: "block" }}>{caption}</span> : null}
    </div>
  );
}

export function DataAnalysisDashboard({ workspaceId, activeFormId = null, compact = false, onInsertContent = null, hideQualitative = false }) {
  const { user, userData, refreshUserData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [workspaceActiveFormId, setWorkspaceActiveFormId] = useState(activeFormId);
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [interpretationNotes, setInterpretationNotes] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretStatus, setInterpretStatus] = useState("");
  const [selectedVarXId, setSelectedVarXId] = useState("");
  const [selectedVarYId, setSelectedVarYId] = useState("");
  
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(hideQualitative ? "kuantitatif" : "tematik");
  const [offlineFiles, setOfflineFiles] = useState([]);
  const [thematicAnalysisHtml, setThematicAnalysisHtml] = useState("");
  const [analyzingTematik, setAnalyzingTematik] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const notesHydratedRef = useRef(false);
  const isInterpretingRef = useRef(false);
  const isSavingRef = useRef(false);
  const generationCost = toolMap["chapter-generation"]?.creditCost ?? 2;

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchAll() {
      try {
        // Get workspace for activeFormId
        const wsResp = await d1Request("workspaces", { id: workspaceId });
        if (isMounted && wsResp.data) setWorkspaceActiveFormId(activeFormId || wsResp.data.activeFormId || null);
      } catch (e) {
        console.warn("DataAnalysis: gagal fetch workspace:", e.message);
      }

      try {
        // Get forms
        const formsResp = await d1Request("workspace_forms");
        let nextForms = (formsResp.data || []).filter(f => f.workspace_id === workspaceId);
        nextForms = nextForms.map(f => {
          let parsed = {};
          try { parsed = typeof f.content === "string" ? JSON.parse(f.content) : (f.content || {}); } catch {}
          return { ...f, ...parsed };
        });
        if (isMounted) setForms(nextForms);
      } catch (e) {
        console.warn("DataAnalysis: gagal fetch forms:", e.message);
      }

      try {
        // Get responses
        const responsesResp = await d1Request("workspace_form_responses");
        let nextResponses = (responsesResp.data || []).filter(r => r.workspace_id === workspaceId);
        nextResponses = nextResponses.map(r => {
          let parsedAnswers = {};
          try { parsedAnswers = typeof r.answers === "string" ? JSON.parse(r.answers) : (r.answers || {}); } catch {}
          return { ...r, answers: parsedAnswers };
        });
        if (isMounted) setResponses(nextResponses);
      } catch (e) {
        // Graceful fallback: tabel mungkin belum ada di worker versi lama
        console.warn("DataAnalysis: gagal fetch responses (mungkin worker lama):", e.message);
        if (isMounted) setResponses([]);
      }

      try {
        // Get transcripts
        const transResp = await d1Request("workspace_transcripts");
        if (isMounted) setTranscripts((transResp.data || []).filter(t => t.workspace_id === workspaceId));
      } catch (e) {
        console.warn("DataAnalysis: gagal fetch transcripts:", e.message);
      }

      // Fetch offline files
      try {
        const noteId = `angket_files_${workspaceId}`;
        const filesCheck = await d1Request("workspace_notes", { method: "GET", id: noteId });
        if (isMounted && filesCheck && filesCheck.data) {
          setOfflineFiles(JSON.parse(filesCheck.data.content || "[]"));
        }
      } catch (e) {
        console.warn("DataAnalysis: gagal fetch offline files:", e.message);
      }

      // Fetch thematic analysis html
      try {
        const noteId = `thematic_analysis_${workspaceId}`;
        const analysisCheck = await d1Request("workspace_notes", { method: "GET", id: noteId });
        if (isMounted && analysisCheck && analysisCheck.data) {
          setThematicAnalysisHtml(analysisCheck.data.content || "");
        }
      } catch (e) {
        console.warn("DataAnalysis: gagal fetch thematic analysis:", e.message);
      }

      try {
        // Get analysis snapshots
        const analysisResp = await d1Request("workspace_analysis");
        const nextSnapshots = (analysisResp.data || []).filter(a => a.workspace_id === workspaceId);
        nextSnapshots.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (isMounted) {
          setLatestSnapshot(nextSnapshots[0] || null);
          if (!notesHydratedRef.current && nextSnapshots[0]?.interpretationNotes) {
            setInterpretationNotes(nextSnapshots[0].interpretationNotes);
            notesHydratedRef.current = true;
          }
        }
      } catch (e) {
        console.warn("DataAnalysis: gagal fetch snapshots:", e.message);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [workspaceId, activeFormId]);

  const activeForm = useMemo(() => {
    if (!forms.length) return null;
    return forms.find((form) => form.id === workspaceActiveFormId) || forms[0] || null;
  }, [forms, workspaceActiveFormId]);

  const analysis = useMemo(() => {
    if (!activeForm) return null;
    return computeFormAnalysis(activeForm, workspaceActiveFormId ? responses : []);
  }, [activeForm, responses, workspaceActiveFormId]);

  const variableAnalyses = useMemo(() => {
    if (!activeForm || !activeForm.sections) return [];
    return activeForm.sections.map(section => {
      const result = computeVariableAnalysis(section, responses);
      return {
        sectionId: section.id,
        title: section.title,
        description: section.description,
        ...result
      };
    }).filter(v => v.itemStats.length > 0);
  }, [activeForm, responses]);

  const regressionResult = useMemo(() => {
    if (!selectedVarXId || !selectedVarYId || selectedVarXId === selectedVarYId) return null;
    const varX = activeForm.sections.find(s => s.id === selectedVarXId);
    const varY = activeForm.sections.find(s => s.id === selectedVarYId);
    if (!varX || !varY) return null;
    try {
      return computeRegressionAnalysis(varX, varY, responses);
    } catch (err) {
      console.error(err);
      return { error: err.message };
    }
  }, [selectedVarXId, selectedVarYId, activeForm, responses]);

  const narrative = useMemo(() => {
    if (!activeForm || !analysis) return "";
    return buildAnalysisNarrative(activeForm, analysis, transcripts);
  }, [activeForm, analysis, transcripts]);

  const handleSaveSnapshot = async () => {
    if (isSavingRef.current || !activeForm || !analysis) return;
    setSavingSnapshot(true);
    isSavingRef.current = true;

    try {
      const id = crypto.randomUUID();
      await d1Request("workspace_analysis", {
        method: "POST",
        body: {
          id,
          workspace_id: workspaceId,
          narrative: JSON.stringify({
            formId: activeForm.id,
            formTitle: activeForm.title,
            responseCount: analysis.responseCount,
            cronbachAlpha: analysis.cronbachAlpha,
            quantitativeQuestionCount: analysis.quantitativeQuestionCount,
            itemStats: analysis.itemStats,
            distributions: analysis.distributions,
            narrative,
            interpretationNotes,
            transcriptCount: transcripts.length,
          }),
          responseCount: analysis.responseCount,
        }
      });

      await d1Request("workspaces", {
        method: "PATCH",
        id: workspaceId,
        body: { responseCount: analysis.responseCount }
      });
    } catch (error) {
      console.error("Gagal menyimpan snapshot analisis:", error);
    } finally {
      setSavingSnapshot(false);
      isSavingRef.current = false;
    }
  };

  const handleInterpretToBabIV = async () => {
    if (isInterpretingRef.current || !user || !workspaceId || !onInsertContent) return;
    const creditBalance = userData?.credits ?? 0;
    
    if (creditBalance < generationCost) {
      setInterpretStatus(`Kredit tidak cukup. Butuh ${generationCost} kredit.`);
      return;
    }

    setInterpretStatus("");
    setIsInterpreting(true);
    isInterpretingRef.current = true;

    try {
      await deductCredits(user.uid, generationCost);

      const prompt = `
Anda adalah co-writer akademik profesional.
Tugas Anda adalah menulis draf awal untuk Bab Hasil dan Pembahasan (atau Bab IV) dalam format HTML siap tempel.

ATURAN KELUARAN:
- Kembalikan HTML saja (<h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>). Jangan gunakan markdown.
- Tulis dalam bahasa akademik formal yang analitis dan mendalam.

BERIKUT ADALAH HASIL ANALISIS KUANTITATIF (OTOMATIS):
${latestSnapshot?.narrative || narrative || "(Tidak ada data analisis)"}

CATATAN INTERPRETASI PENELITI:
${interpretationNotes || "(Tidak ada catatan)"}

TUGAS:
Kembangkan hasil analisis dan catatan peneliti tersebut menjadi narasi pembahasan yang mengalir, sistematis, dan siap dimasukkan ke naskah skripsi/jurnal. Jika memungkinkan, hubungkan setiap temuan angka dengan makna praktisnya sesuai catatan peneliti.
      `.trim();

      const result = await generateWorkspaceChapter({
        prompt,
        group: "group_3",
        model: "gemini-2.5-flash",
        temperature: 0.65,
      });

      // index 3 adalah Bab IV (Skripsi) atau Hasil & Pembahasan (Jurnal)
      onInsertContent(result.text, 3);
      setInterpretStatus("Berhasil diinterpretasikan dan di-insert ke Bab IV!");
    } catch (error) {
      await refundCredits(user.uid, generationCost).catch(() => {});
      console.error("Gagal interpretasi ke Bab IV:", error);
      setInterpretStatus(error.message || "Gagal menginterpretasikan data.");
    } finally {
      setIsInterpreting(false);
      isInterpretingRef.current = false;
    }
  };

  const handleTriggerThematicAnalysis = async () => {
    const creditCost = 2;
    const creditBalance = userData?.credits ?? 0;
    
    if (creditBalance < creditCost) {
      alert(`Kredit Anda tidak mencukupi untuk melakukan analisis tematik AI. Dibutuhkan ${creditCost} kredit, sisa kredit Anda adalah ${creditBalance}.`);
      return;
    }

    const confirmed = window.confirm(`Mulai analisis tematik AI? Ini akan menggunakan ${creditCost} kredit Anda.`);
    if (!confirmed) return;

    setAnalyzingTematik(true);
    try {
      const wawancaraList = transcripts.filter(t => {
        let cat = "wawancara";
        try {
          if (t.content && t.content.trim().startsWith("{")) {
            cat = JSON.parse(t.content).category || "wawancara";
          }
        } catch {}
        return cat === "wawancara";
      });
      const observasiList = transcripts.filter(t => {
        let cat = "wawancara";
        try {
          if (t.content && t.content.trim().startsWith("{")) {
            cat = JSON.parse(t.content).category || "wawancara";
          }
        } catch {}
        return cat === "observasi";
      });

      const formattedWawancara = wawancaraList.map((t, idx) => {
        let parsed = { role: "", interviewDate: "", tags: [], excerpt: "", text: t.content || "" };
        try {
          if (t.content && t.content.trim().startsWith("{")) {
            const p = JSON.parse(t.content);
            parsed = {
              role: p.role || "",
              interviewDate: p.interviewDate || "",
              tags: p.tags || [],
              excerpt: p.excerpt || "",
              text: p.text || "",
            };
          }
        } catch {}
        return `[Wawancara ${idx + 1}] Informan: ${t.title || ""}, Peran: ${parsed.role}, Tanggal: ${parsed.interviewDate}\nTag Tema: ${parsed.tags.join(", ")}\nKutipan Penting: "${parsed.excerpt}"\nIsi: ${parsed.text.slice(0, 1000)}...`;
      }).join("\n\n");

      const formattedObservasi = observasiList.map((t, idx) => {
        let parsed = { role: "", interviewDate: "", tags: [], excerpt: "", text: t.content || "" };
        try {
          if (t.content && t.content.trim().startsWith("{")) {
            const p = JSON.parse(t.content);
            parsed = {
              role: p.role || "",
              interviewDate: p.interviewDate || "",
              tags: p.tags || [],
              excerpt: p.excerpt || "",
              text: p.text || "",
            };
          }
        } catch {}
        return `[Observasi ${idx + 1}] Lokasi/Subjek: ${parsed.role}, Judul: ${t.title || ""}, Tanggal: ${parsed.interviewDate}\nTag Tema: ${parsed.tags.join(", ")}\nKutipan Penting: "${parsed.excerpt}"\nIsi: ${parsed.text.slice(0, 1000)}...`;
      }).join("\n\n");

      await d1Request("credits/deduct", {
        method: "POST",
        body: { amount: creditCost, reason: "Analisis AI Tematik" }
      }).catch(() => {});
      if (userData && refreshUserData) {
        await refreshUserData();
      }

      const wsDetails = await d1Request("workspaces", { id: workspaceId });
      const wsTitle = wsDetails.data?.title || "";
      const wsTopic = wsDetails.data?.topic || "";

      const qList = activeForm ? flattenFormQuestions(activeForm).filter((q) => q.type !== "sectionText") : [];

      const prompt = `
Anda adalah ahli analisis data kualitatif dan kuantitatif (mixed methods) untuk penulisan karya ilmiah/skripsi/jurnal.
Lakukan analisis tematik mendalam terhadap data-data penelitian yang dikumpulkan di bawah ini untuk menghasilkan **Poin-Poin Tematik Pembahasan** yang komprehensif.

INFORMASI PENELITIAN:
- Judul: ${wsTitle || "Tanpa Judul"}
- Topik: ${wsTopic || "Tanpa Topik"}

DATA ANGKET / KUESIONER:
- Jumlah Butir Pernyataan: ${qList.length}
- Jumlah Responden: ${responses.length}
${offlineFiles.length > 0 ? `- File Tabulasi Angket Terunggah: ${offlineFiles.map(f => f.name).join(", ")}` : ""}

DATA WAWANCARA:
${formattedWawancara || "Tidak ada data wawancara."}

DATA OBSERVASI:
${formattedObservasi || "Tidak ada data observasi."}

TUGAS ANDA:
1. Hubungkan temuan dari data Kuesioner (Angket), Wawancara, dan Observasi.
2. Identifikasi minimal 3 tema besar pembahasan yang paling relevan dan menonjol.
3. Untuk setiap tema, berikan:
   - Deskripsi penjelasan tema secara akademis.
   - Dukungan data konkret (kutipan wawancara atau fakta observasi).
   - Hubungan logis antardata (misal: bagaimana hasil wawancara menjelaskan temuan angket).
4. Sajikan hasil analisis dalam format HTML yang terstruktur rapi (gunakan <h3>, <p>, <ul>, <li>, <strong>) agar siap disalin atau dibaca oleh AI Copilot untuk menyusun Bab IV (Hasil & Pembahasan).
5. Tulis dalam bahasa Indonesia akademik yang sangat profesional, objektif, dan mendalam. HINDARI bahasa pengantar tambahan seperti "Baik, berikut adalah analisis..." - berikan langsung isi analisisnya dalam format HTML.
`.trim();

      const result = await generateWorkspaceChapter({
        prompt,
        group: "group_1,group_2",
        model: "gemini-2.5-flash",
        temperature: 0.6,
      });

      const generatedHtml = result.text || "";

      const noteId = `thematic_analysis_${workspaceId}`;
      const checkRes = await d1Request("workspace_notes", { method: "GET", id: noteId });

      if (checkRes && checkRes.data) {
        await d1Request("workspace_notes", {
          method: "PATCH",
          id: noteId,
          body: { content: generatedHtml }
        });
      } else {
        await d1Request("workspace_notes", {
          method: "POST",
          body: {
            id: noteId,
            workspace_id: workspaceId,
            content: generatedHtml,
          }
        });
      }

      setThematicAnalysisHtml(generatedHtml);
      alert("Analisis Tematik AI selesai dibuat dan disimpan.");
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan analisis tematik: " + err.message);
    } finally {
      setAnalyzingTematik(false);
    }
  };

  const handleExportStatsCSV = () => {
    if (!variableAnalyses.length) return;
    
    const headers = ["Variabel", "Butir", "Label Pertanyaan", "Mean", "Variance", "Std Dev", "r Hitung", "r Tabel", "Status Validitas"];
    const rows = [];
    
    variableAnalyses.forEach(v => {
      v.itemStats.forEach(item => {
        rows.push([
          v.title,
          item.variableKey || item.questionId,
          item.label,
          item.mean,
          item.variance,
          item.stdDev,
          item.rCalculated,
          item.rCritical,
          item.isValid ? "Valid" : "Tidak Valid"
        ]);
      });
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
    link.setAttribute("download", `statistik_${activeForm.title.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Sub-tabs for Qualitative/Mixed method workspace */}
      {!hideQualitative && (
        <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem", marginBottom: "1rem", overflowX: "auto" }}>
          <button
            className="btn btn-ghost"
            onClick={() => setActiveAnalysisTab("tematik")}
            style={{
              borderBottom: activeAnalysisTab === "tematik" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeAnalysisTab === "tematik" ? "var(--primary)" : "var(--text-muted)",
              borderRadius: 0,
              paddingInline: "0.4rem",
            }}
          >
            <PremiumIcon name="sparkles" size={15} />
            Analisis Tematik (AI)
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setActiveAnalysisTab("kuantitatif")}
            style={{
              borderBottom: activeAnalysisTab === "kuantitatif" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeAnalysisTab === "kuantitatif" ? "var(--primary)" : "var(--text-muted)",
              borderRadius: 0,
              paddingInline: "0.4rem",
            }}
          >
            <PremiumIcon name="barChart3" size={15} />
            Analisis Statistik (Kuantitatif)
          </button>
        </div>
      )}

      {activeAnalysisTab === "tematik" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "360px 1fr", gap: "1.5rem", alignItems: "start" }}>
            
            {/* Left side: Data Summary */}
            <div className="glass-panel" style={{ padding: "1.25rem", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "0.96rem", margin: 0, fontWeight: 700 }}>Ringkasan Sumber Data</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ padding: "0.4rem", borderRadius: "6px", backgroundColor: "rgba(99, 102, 241, 0.12)", color: "var(--primary)" }}>
                    <PremiumIcon name="layoutTemplate" size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>Kuesioner / Angket</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {responses.length} responden online • {offlineFiles.length} file tabulasi
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ padding: "0.4rem", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.12)", color: "var(--success)" }}>
                    <PremiumIcon name="mic" size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>Wawancara</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {transcripts.filter(t => {
                        let cat = "wawancara";
                        try {
                          if (t.content && t.content.trim().startsWith("{")) {
                            cat = JSON.parse(t.content).category || "wawancara";
                          }
                        } catch {}
                        return cat === "wawancara";
                      }).length} transkrip terdaftar
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ padding: "0.4rem", borderRadius: "6px", backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#d97706" }}>
                    <PremiumIcon name="eye" size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>Observasi</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {transcripts.filter(t => {
                        let cat = "wawancara";
                        try {
                          if (t.content && t.content.trim().startsWith("{")) {
                            cat = JSON.parse(t.content).category || "observasi";
                          }
                        } catch {}
                        return cat === "observasi";
                      }).length} catatan lapangan
                    </div>
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleTriggerThematicAnalysis} 
                disabled={analyzingTematik}
                style={{ width: "100%", padding: "0.6rem", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginTop: "0.5rem" }}
              >
                {analyzingTematik ? (
                  <>
                    <LoadingSpinner size={14} className="text-white" />
                    <span>Menganalisis Data...</span>
                  </>
                ) : (
                  <>
                    <PremiumIcon name="play" size={14} />
                    <span>Mulai Analisis AI Tematik</span>
                  </>
                )}
              </button>
              <small style={{ color: "var(--text-muted)", fontSize: "0.68rem", textAlign: "center", display: "block" }}>
                * Analisis AI Tematik membutuhkan 2 kredit per proses.
              </small>
            </div>

            {/* Right side: AI Thematic Analysis Results */}
            <div className="techy-card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", minHeight: "260px", borderTop: "4px solid var(--primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 700 }}>Poin-Poin Tematik Pembahasan AI</h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>Hasil sintesis kuesioner, wawancara, dan observasi oleh model Gemini.</p>
                </div>
                {thematicAnalysisHtml && (
                  <button 
                    className="btn btn-outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(thematicAnalysisHtml);
                      alert("Teks analisis tematik berhasil disalin ke clipboard!");
                    }}
                    style={{ padding: "0.35rem 0.65rem", fontSize: "0.74rem" }}
                  >
                    <PremiumIcon name="copy" size={13} />
                    <span>Salin Hasil</span>
                  </button>
                )}
              </div>

              {thematicAnalysisHtml ? (
                <div 
                  className="workspace-scroll animate-fade-in" 
                  style={{ fontSize: "0.85rem", lineHeight: 1.6, maxHeight: "380px", overflowY: "auto", paddingRight: "0.5rem" }}
                  dangerouslySetInnerHTML={{ __html: thematicAnalysisHtml }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", justifyContent: "center", height: "220px", color: "var(--text-muted)", textAlign: "center" }}>
                  <PremiumIcon name="sparkles" size={36} style={{ opacity: 0.35 }} />
                  <p style={{ fontSize: "0.84rem", margin: 0, maxWidth: "340px" }}>
                    Belum ada hasil analisis. Klik tombol <strong>"Mulai Analisis AI Tematik"</strong> di sebelah kiri untuk menghasilkan poin pembahasan terpadu.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeAnalysisTab === "kuantitatif" && (
        <>
          {!activeForm ? (
            <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", backgroundColor: "var(--surface)" }}>
              <PremiumIcon name="barChart3" size={36} className="text-muted" style={{ margin: "0 auto 0.75rem" }} />
              <h3 style={{ margin: 0 }}>Belum Ada Form Aktif</h3>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>Pilih atau publikasikan form dari tab Kuesioner agar dashboard analisis dapat membaca respons.</p>
            </div>
          ) : (
            <>
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          .analisis-grid {
            grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.8fr) !important;
          }
        }
        @media print {
          body, html, #__next, main, .container {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          nav, aside, header, footer, button, .btn, select, textarea, input, .no-print, [role="navigation"] {
            display: none !important;
          }
          .glass-panel {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin-bottom: 2rem !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            color: black !important;
            text-align: left !important;
          }
          h1, h2, h3, h4, h5 {
            color: black !important;
          }
        }
      `}} />

      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 700 }}>Hasil Analisis Statistik</h3>
          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.83rem", color: "var(--text-muted)" }}>
            Kuesioner: <strong>{activeForm.title}</strong> &nbsp;·&nbsp; <strong>{responses.length}</strong> jawaban terbaca
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={handlePrint}>
            <PremiumIcon name="fileOutput" size={15} />
            Ekspor PDF
          </button>
          {variableAnalyses.length > 0 && (
            <button className="btn btn-outline" onClick={handleExportStatsCSV}>
              <PremiumIcon name="download" size={15} />
              Unduh Statistik (CSV)
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSaveSnapshot} disabled={savingSnapshot}>
            <PremiumIcon name="save" size={15} />
            {savingSnapshot ? "Menyimpan..." : "Simpan Hasil"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem" }}>
        <StatTile label="Responden" value={analysis?.responseCount ?? 0} caption="Jawaban masuk" tone="primary" />
        <StatTile label="Butir Skala" value={analysis?.quantitativeQuestionCount ?? 0} caption="Siap dianalisis" />
        <StatTile
          label="Cronbach Alpha"
          value={analysis?.cronbachAlpha ?? 0}
          caption="Reliabilitas instrumen"
          tone={(analysis?.cronbachAlpha ?? 0) >= 0.6 ? "success" : "warning"}
        />
        {hideQualitative ? (
          <StatTile label="Variabel" value={activeForm.sections?.length || 0} caption="Konstruk penelitian" />
        ) : (
          <StatTile label="Transkrip" value={transcripts.length} caption="Data kualitatif" />
        )}
      </div>

      <div style={compact ? {} : { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1rem" }} className={compact ? "" : "analisis-grid"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <PremiumIcon name="activity" size={16} className="text-primary" />
              <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Ringkasan Otomatis</h4>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-main)" }}>{narrative}</p>
          </div>

          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <PremiumIcon name="barChart3" size={16} className="text-primary" />
              <h4 style={{ fontSize: "0.95rem", margin: 0, fontWeight: 700 }}>Statistik Deskriptif & Uji Instrumen (Per Variabel)</h4>
            </div>

            {variableAnalyses.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {variableAnalyses.map((v) => (
                  <div key={v.sectionId} style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", backgroundColor: "var(--background)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                      <div>
                        <h5 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>{v.title}</h5>
                        {v.description && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>{v.description}</p>}
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px", backgroundColor: v.isReliable ? "rgba(16, 185, 129, 0.12)" : "rgba(220, 38, 38, 0.12)", color: v.isReliable ? "var(--success)" : "var(--danger)" }}>
                          Alpha: {v.cronbachAlpha} ({v.isReliable ? "Reliabel" : "Tidak Reliabel"})
                        </span>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                            <th style={{ textAlign: "left", padding: "0.5rem 0.3rem" }}>Butir</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0.3rem" }}>Mean</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0.3rem" }}>Variance</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0.3rem" }}>r-Hitung</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0.3rem" }}>r-Tabel (N={v.N})</th>
                            <th style={{ textAlign: "center", padding: "0.5rem 0.3rem" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.itemStats.map((item) => (
                            <tr key={item.questionId} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "0.5rem 0.3rem", color: "var(--text-main)" }}>
                                <div style={{ fontWeight: 600 }}>{item.variableKey || item.questionId}</div>
                                <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }} title={item.label}>
                                  {item.label}
                                </div>
                              </td>
                              <td style={{ padding: "0.5rem 0.3rem", textAlign: "center" }}>{item.mean}</td>
                              <td style={{ padding: "0.5rem 0.3rem", textAlign: "center" }}>{item.variance}</td>
                              <td style={{ padding: "0.5rem 0.3rem", textAlign: "center", fontWeight: 600, color: item.isValid ? "var(--success)" : "var(--danger)" }}>
                                {item.rCalculated ?? item.itemTotalCorrelation}
                              </td>
                              <td style={{ padding: "0.5rem 0.3rem", textAlign: "center", color: "var(--text-muted)" }}>{item.rCritical ?? "0.300"}</td>
                              <td style={{ padding: "0.5rem 0.3rem", textAlign: "center" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "5px", backgroundColor: item.isValid ? "rgba(16, 185, 129, 0.1)" : "rgba(220, 38, 38, 0.1)", color: item.isValid ? "var(--success)" : "var(--danger)" }}>
                                  {item.isValid ? "VALID" : "TIDAK VALID"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Belum ada data butir numerik variabel yang lengkap untuk dihitung.</p>
            )}
          </div>

          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <PremiumIcon name="barChart" size={16} className="text-primary" />
              <h4 style={{ fontSize: "0.95rem", margin: 0, fontWeight: 700 }}>Analisis Regresi Linier Sederhana</h4>
            </div>

            {activeForm.sections && activeForm.sections.length >= 2 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }} className="no-print">
                  Pilih variabel bebas (X) dan terikat (Y) untuk menguji hipotesis hubungan linier.
                </p>
                <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Variabel Independen (X)</label>
                    <select className="form-input" style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }} value={selectedVarXId} onChange={(e) => setSelectedVarXId(e.target.value)}>
                      <option value="">Pilih Variabel X</option>
                      {activeForm.sections.map(s => (
                        <option key={s.id} value={s.id} disabled={s.id === selectedVarYId}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Variabel Dependen (Y)</label>
                    <select className="form-input" style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }} value={selectedVarYId} onChange={(e) => setSelectedVarYId(e.target.value)}>
                      <option value="">Pilih Variabel Y</option>
                      {activeForm.sections.map(s => (
                        <option key={s.id} value={s.id} disabled={s.id === selectedVarXId}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {regressionResult ? (
                  regressionResult.error ? (
                    <div style={{ padding: "0.75rem", borderRadius: "8px", backgroundColor: "rgba(220, 38, 38, 0.1)", color: "var(--danger)", fontSize: "0.82rem" }}>
                      {regressionResult.error}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.5rem", padding: "1rem", border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--background)" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Persamaan Regresi</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem", color: "var(--text-main)" }}>{regressionResult.equation}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Korelasi (R)</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem", color: "var(--text-main)" }}>{regressionResult.rCorrelation}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Koefisien Determinasi (R²)</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem", color: "var(--text-main)" }}>{regressionResult.rSquared} ({Math.round(regressionResult.rSquared * 100)}%)</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Uji Signifikansi (t-Stat)</div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.2rem", color: regressionResult.isSignificant ? "var(--success)" : "var(--danger)" }}>
                          t = {regressionResult.tStat} ({regressionResult.isSignificant ? "Signifikan" : "Tidak Signifikan"})
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                          t-tabel = {regressionResult.tCritical} (df = {regressionResult.df})
                        </div>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Dibutuhkan minimal 2 variabel kuesioner untuk menghitung regresi.
              </p>
            )}
          </div>

          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <PremiumIcon name="layers" size={16} className="text-primary" />
              <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Distribusi Jawaban</h4>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.9rem" }}>
              {(analysis?.distributions || []).slice(0, compact ? 4 : 12).map((item) => (
                <div key={item.questionId} style={{ padding: "0.85rem", border: "1px solid var(--border)", borderRadius: "10px", backgroundColor: "var(--background)" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>{item.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{item.answered} jawaban tercatat</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.75rem" }}>
                    {(item.distribution || []).slice(0, 5).map((distributionItem) => (
                      <div key={`${item.questionId}_${distributionItem.label}`}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.76rem", color: "var(--text-main)" }}>
                          <span>{distributionItem.label}</span>
                          <span>{distributionItem.count}</span>
                        </div>
                        <div style={{ marginTop: "0.25rem", height: "6px", borderRadius: "999px", backgroundColor: "var(--surface-hover)" }}>
                          <div
                            style={{
                              width: `${Math.min(distributionItem.percentage, 100)}%`,
                              height: "100%",
                              borderRadius: "999px",
                              backgroundColor: "var(--primary)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-panel no-print" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Catatan Interpretasi</h4>
            <p style={{ margin: "0.35rem 0 0.75rem 0", fontSize: "0.8rem" }}>
              Gunakan ruang ini untuk menyusun kalimat pembahasan resmi sebelum dikirim ke Bab IV.
            </p>
            <textarea
              className="form-textarea"
              rows={10}
              value={interpretationNotes}
              onChange={(event) => setInterpretationNotes(event.target.value)}
              placeholder="Contoh: Instrumen dinyatakan reliabel karena alpha di atas 0,70 dan sebagian besar indikator memiliki korelasi item-total memadai..."
            />
            {interpretStatus ? (
              <div
                style={{
                  padding: "0.6rem 0.75rem",
                  marginTop: "0.75rem",
                  borderRadius: "8px",
                  backgroundColor: interpretStatus.includes("Berhasil") ? "rgba(16,185,129,0.12)" : "rgba(220,38,38,0.12)",
                  color: interpretStatus.includes("Berhasil") ? "var(--success)" : "var(--danger)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                {interpretStatus}
              </div>
            ) : null}
            {onInsertContent && (
              <button 
                className="btn btn-primary" 
                style={{ width: "100%", marginTop: "0.75rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}
                onClick={handleInterpretToBabIV}
                disabled={isInterpreting || (!interpretationNotes && !narrative)}
              >
                {isInterpreting ? <LoadingSpinner size={16} className="text-white" /> : <PremiumIcon name="sparkles" size={16} />}
                {isInterpreting ? "Menyusun Interpretasi..." : `Interpretasi ke Bab IV (Biaya: ${generationCost} kredit)`}
              </button>
            )}
          </div>

          <div className="glass-panel no-print" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
            <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Snapshot Terakhir</h4>
            {latestSnapshot ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.75rem", fontSize: "0.82rem" }}>
                <div><strong>Form:</strong> {latestSnapshot.formTitle}</div>
                <div><strong>Respons:</strong> {latestSnapshot.responseCount}</div>
                <div><strong>Alpha:</strong> {latestSnapshot.cronbachAlpha}</div>
                <div><strong>Narasi:</strong> {latestSnapshot.narrative}</div>
              </div>
            ) : (
              <p style={{ margin: "0.7rem 0 0 0", fontSize: "0.82rem" }}>Belum ada snapshot tersimpan.</p>
            )}
          </div>
        </div>
      </div>
      </>
      )}
      </>
      )}
    </div>
  );
}
