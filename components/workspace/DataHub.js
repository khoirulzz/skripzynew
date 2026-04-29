"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { FormBuilder } from "./FormBuilder";
import { DataAnalysisDashboard } from "./DataAnalysisDashboard";
import { TranscriptManager } from "./TranscriptManager";
import { FORM_STATUSES, createEmptyForm, createId } from "@/lib/workspaceDefaults";

export function DataHub({ workspaceId }) {
  const [activeTab, setActiveTab] = useState("kuesioner");
  const [forms, setForms] = useState([]);
  const [activeFormId, setActiveFormId] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const workspaceRef = doc(db, "workspaces", workspaceId);
    const unsubscribe = onSnapshot(workspaceRef, (snapshot) => {
      const workspace = snapshot.data() || {};
      setActiveFormId(workspace.activeFormId || null);
    });

    return unsubscribe;
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return undefined;

    const formsQuery = query(collection(db, "workspaces", workspaceId, "forms"));
    const unsubscribe = onSnapshot(formsQuery, (snapshot) => {
      const nextForms = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      nextForms.sort((left, right) => {
        const leftTime = left.updatedAt?.seconds || 0;
        const rightTime = right.updatedAt?.seconds || 0;
        return rightTime - leftTime;
      });
      setForms(nextForms);
    });

    return unsubscribe;
  }, [workspaceId]);

  const activeForm = useMemo(
    () => forms.find((form) => form.id === editingFormId) || null,
    [editingFormId, forms]
  );

  const handleCreateForm = async () => {
    const formId = createId("form");
    const nextForm = createEmptyForm({ id: formId, title: `Instrumen ${forms.length + 1}` });
    await setDoc(doc(db, "workspaces", workspaceId, "forms", formId), {
      ...nextForm,
      updatedAt: serverTimestamp(),
    });
    setEditingFormId(formId);
  };

  const handleActivateForm = async (formId) => {
    await updateDoc(doc(db, "workspaces", workspaceId), {
      activeFormId: formId,
      updatedAt: serverTimestamp(),
    });
    setActiveFormId(formId);
  };

  return (
    <div className="animate-fade-in" style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <PremiumIcon name="database" size={28} className="text-primary" />
            Manajemen Data Penelitian
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.92rem" }}>
            Kelola form kuesioner, transkrip wawancara, dan snapshot analisis dalam satu ruang kerja.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Form aktif: <strong style={{ color: "var(--text-main)" }}>{forms.find((item) => item.id === activeFormId)?.title || "Belum dipilih"}</strong>
          </span>
          <button className="btn btn-primary" onClick={handleCreateForm}>
            <PremiumIcon name="plus" size={16} />
            Form Baru
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.2rem", overflowX: "auto" }}>
        {[
          { key: "kuesioner", label: "Kuesioner", icon: "layoutTemplate" },
          { key: "wawancara", label: "Wawancara", icon: "mic" },
          { key: "analisis", label: "Analisis", icon: "barChart3" },
        ].map((tab) => (
          <button
            key={tab.key}
            className="btn btn-ghost"
            onClick={() => setActiveTab(tab.key)}
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

      {activeTab === "kuesioner" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1rem" }}>
          <div className="glass-panel" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ fontSize: "1rem", margin: 0 }}>Daftar Form Penelitian</h3>
                <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.82rem" }}>Buat beberapa draft form, tetapi publikasikan satu form aktif untuk responden.</p>
              </div>
            </div>

            {forms.length === 0 ? (
              <div style={{ padding: "1.5rem", border: "1px dashed var(--border)", borderRadius: "12px", textAlign: "center" }}>
                <PremiumIcon name="layoutTemplate" size={30} className="text-muted" style={{ margin: "0 auto 0.65rem" }} />
                <h4 style={{ margin: 0 }}>Belum Ada Form</h4>
                <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.84rem" }}>Mulai dengan membuat instrumen penelitian baru.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem" }}>
                {forms.map((item) => (
                  <div key={item.id} className="glass-panel" style={{ padding: "1rem", border: item.id === activeFormId ? "1px solid var(--primary)" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.98rem" }}>{item.title}</h4>
                        <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", lineHeight: 1.5 }}>
                          {item.description || "Deskripsi form belum diisi."}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          textTransform: "capitalize",
                          padding: "0.18rem 0.5rem",
                          borderRadius: "999px",
                          backgroundColor: item.status === FORM_STATUSES.published ? "rgba(16,185,129,0.12)" : "var(--surface-hover)",
                          color: item.status === FORM_STATUSES.published ? "var(--success)" : "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {item.status || FORM_STATUSES.draft}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      <div>{item.sections?.length || 0} bagian • {item.sections?.reduce((sum, section) => sum + (section.questions?.length || 0), 0) || 0} butir</div>
                      <div>{item.publicSlug ? `/form/${item.publicSlug}` : "Belum punya link publik"}</div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
                      <button className="btn btn-primary" onClick={() => setEditingFormId(item.id)}>
                        <PremiumIcon name="edit3" size={14} />
                        Edit Builder
                      </button>
                      <button className="btn btn-outline" onClick={() => void handleActivateForm(item.id)}>
                        <PremiumIcon name="checkCircle" size={14} />
                        Jadikan Aktif
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "wawancara" ? <TranscriptManager workspaceId={workspaceId} /> : null}
      {activeTab === "analisis" ? <DataAnalysisDashboard workspaceId={workspaceId} activeFormId={activeFormId} /> : null}

      {activeForm ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(11,15,25,0.58)", backdropFilter: "blur(6px)" }}>
          <FormBuilder
            key={activeForm.id}
            workspaceId={workspaceId}
            form={activeForm}
            existingForms={forms}
            onClose={() => setEditingFormId(null)}
            onSaved={(nextForm) => {
              setForms((current) => current.map((item) => (item.id === nextForm.id ? nextForm : item)));
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
