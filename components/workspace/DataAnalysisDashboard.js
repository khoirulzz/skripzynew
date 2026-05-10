"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { computeFormAnalysis, buildAnalysisNarrative } from "@/lib/formAnalysis";
import { useAuth } from "@/components/providers/AuthProvider";
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import { generateWorkspaceChapter } from "@/lib/workspacePublicApi";

function StatTile({ label, value, caption, tone = "default" }) {
  const colorMap = {
    default: "var(--text-main)",
    success: "var(--success)",
    warning: "#d97706",
    primary: "var(--primary)",
  };

  return (
    <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: colorMap[tone], marginTop: "0.35rem" }}>{value}</div>
      {caption ? <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem" }}>{caption}</p> : null}
    </div>
  );
}

export function DataAnalysisDashboard({ workspaceId, activeFormId = null, compact = false, onInsertContent = null }) {
  const { user, userData } = useAuth();
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
  const notesHydratedRef = useRef(false);
  const generationCost = toolMap["chapter-generation"]?.creditCost ?? 2;

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchAll() {
      try {
        // Get workspace for activeFormId
        const wsResp = await d1Request("workspaces", { id: workspaceId });
        if (isMounted && wsResp.data) setWorkspaceActiveFormId(activeFormId || wsResp.data.activeFormId || null);

        // Get forms
        const formsResp = await d1Request("workspace_forms");
        let nextForms = (formsResp.data || []).filter(f => f.workspace_id === workspaceId);
        nextForms = nextForms.map(f => {
          let parsed = {};
          try { parsed = typeof f.content === "string" ? JSON.parse(f.content) : (f.content || {}); } catch {}
          return { ...f, ...parsed };
        });
        if (isMounted) setForms(nextForms);

        // Get transcripts
        const transResp = await d1Request("workspace_transcripts");
        if (isMounted) setTranscripts((transResp.data || []).filter(t => t.workspace_id === workspaceId));

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
        console.error("DataAnalysisDashboard fetch error:", e);
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

  const narrative = useMemo(() => {
    if (!activeForm || !analysis) return "";
    return buildAnalysisNarrative(activeForm, analysis, transcripts);
  }, [activeForm, analysis, transcripts]);

  const handleSaveSnapshot = async () => {
    if (!activeForm || !analysis) return;
    setSavingSnapshot(true);

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
    }
  };

  const handleInterpretToBabIV = async () => {
    if (!user || !workspaceId || !onInsertContent) return;
    const creditBalance = userData?.credits ?? 0;
    
    if (creditBalance < generationCost) {
      setInterpretStatus(`Kredit tidak cukup. Butuh ${generationCost} kredit.`);
      return;
    }

    setInterpretStatus("");
    setIsInterpreting(true);

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
    }
  };

  if (!activeForm) {
    return (
      <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", backgroundColor: "var(--surface)" }}>
        <PremiumIcon name="barChart3" size={36} className="text-muted" style={{ margin: "0 auto 0.75rem" }} />
        <h3 style={{ margin: 0 }}>Belum Ada Form Aktif</h3>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>Pilih atau publikasikan form dari tab Kuesioner agar dashboard analisis dapat membaca respons.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Analisis Instrumen dan Respons</h3>
          <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem" }}>
            Form aktif: <strong>{activeForm.title}</strong> • Respons terbaca: <strong>{responses.length}</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSnapshot} disabled={savingSnapshot}>
          <PremiumIcon name="save" size={15} />
          {savingSnapshot ? "Menyimpan..." : "Simpan Snapshot"}
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatTile label="Respons" value={analysis?.responseCount ?? 0} caption="Data responden yang masuk" tone="primary" />
        <StatTile label="Butir Numerik" value={analysis?.quantitativeQuestionCount ?? 0} caption="Siap dihitung secara statistik" />
        <StatTile
          label="Cronbach Alpha"
          value={analysis?.cronbachAlpha ?? 0}
          caption="Reliabilitas instrumen"
          tone={(analysis?.cronbachAlpha ?? 0) >= 0.6 ? "success" : "warning"}
        />
        <StatTile label="Transkrip" value={transcripts.length} caption="Pengayaan kualitatif untuk pembahasan" />
      </div>

      <div className={compact ? "" : "grid md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-4"}>
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
              <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Statistik Butir Numerik</h4>
            </div>

            {analysis?.itemStats?.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ textAlign: "left", padding: "0.55rem 0.35rem" }}>Butir</th>
                      <th style={{ textAlign: "left", padding: "0.55rem 0.35rem" }}>Mean</th>
                      <th style={{ textAlign: "left", padding: "0.55rem 0.35rem" }}>Var</th>
                      <th style={{ textAlign: "left", padding: "0.55rem 0.35rem" }}>r item-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.itemStats.map((item) => (
                      <tr key={item.questionId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.6rem 0.35rem", color: "var(--text-main)" }}>
                          <div style={{ fontWeight: 600 }}>{item.variableKey || item.questionId}</div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{item.label}</div>
                        </td>
                        <td style={{ padding: "0.6rem 0.35rem" }}>{item.mean}</td>
                        <td style={{ padding: "0.6rem 0.35rem" }}>{item.variance}</td>
                        <td style={{ padding: "0.6rem 0.35rem", color: item.itemTotalCorrelation >= 0.3 ? "var(--success)" : "var(--danger)" }}>
                          {item.itemTotalCorrelation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Belum ada butir numerik yang cukup lengkap untuk dihitung.</p>
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
          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
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
                <PremiumIcon name={isInterpreting ? "loader" : "sparkles"} size={16} className={isInterpreting ? "animate-spin" : ""} />
                {isInterpreting ? "Menyusun Interpretasi..." : `Interpretasi ke Bab IV (Biaya: ${generationCost} kredit)`}
              </button>
            )}
          </div>

          <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
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
    </div>
  );
}
