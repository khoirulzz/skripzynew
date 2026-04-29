"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { computeFormAnalysis, buildAnalysisNarrative } from "@/lib/formAnalysis";

function StatTile({ label, value, caption, tone = "default" }) {
  const colorMap = {
    default: "var(--text-main)",
    success: "var(--success)",
    warning: "#d97706",
    primary: "var(--primary)",
  };

  return (
    <div className="glass-panel" style={{ padding: "1rem" }}>
      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color: colorMap[tone], marginTop: "0.35rem" }}>{value}</div>
      {caption ? <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem" }}>{caption}</p> : null}
    </div>
  );
}

export function DataAnalysisDashboard({ workspaceId, activeFormId = null, compact = false }) {
  const [workspaceActiveFormId, setWorkspaceActiveFormId] = useState(activeFormId);
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [interpretationNotes, setInterpretationNotes] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const notesHydratedRef = useRef(false);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (snapshot) => {
      const data = snapshot.data() || {};
      setWorkspaceActiveFormId(activeFormId || data.activeFormId || null);
    });

    return unsubscribe;
  }, [activeFormId, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const formsQuery = query(collection(db, "workspaces", workspaceId, "forms"));
    const unsubscribe = onSnapshot(formsQuery, (snapshot) => {
      setForms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return unsubscribe;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const transcriptsQuery = query(collection(db, "workspaces", workspaceId, "transcripts"));
    const unsubscribe = onSnapshot(transcriptsQuery, (snapshot) => {
      setTranscripts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return unsubscribe;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const snapshotsQuery = query(
      collection(db, "workspaces", workspaceId, "analysisSnapshots"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(snapshotsQuery, (snapshot) => {
      const nextItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      setLatestSnapshot(nextItems[0] || null);
      if (!notesHydratedRef.current && nextItems[0]?.interpretationNotes) {
        setInterpretationNotes(nextItems[0].interpretationNotes);
        notesHydratedRef.current = true;
      }
    });

    return unsubscribe;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !workspaceActiveFormId) return undefined;

    const responsesQuery = query(collection(db, "workspaces", workspaceId, "forms", workspaceActiveFormId, "responses"));
    const unsubscribe = onSnapshot(responsesQuery, (snapshot) => {
      setResponses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    });

    return unsubscribe;
  }, [workspaceActiveFormId, workspaceId]);

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
      const payload = {
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
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "workspaces", workspaceId, "analysisSnapshots"), payload);
      await updateDoc(doc(db, "workspaces", workspaceId), {
        responseCount: analysis.responseCount,
        lastAnalysisAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Gagal menyimpan snapshot analisis:", error);
    } finally {
      setSavingSnapshot(false);
    }
  };

  if (!activeForm) {
    return (
      <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
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
          <div className="glass-panel" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <PremiumIcon name="activity" size={16} className="text-primary" />
              <h4 style={{ fontSize: "0.95rem", margin: 0 }}>Ringkasan Otomatis</h4>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-main)" }}>{narrative}</p>
          </div>

          <div className="glass-panel" style={{ padding: "1rem" }}>
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

          <div className="glass-panel" style={{ padding: "1rem" }}>
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
          <div className="glass-panel" style={{ padding: "1rem" }}>
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
          </div>

          <div className="glass-panel" style={{ padding: "1rem" }}>
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
