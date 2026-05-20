"use client";

import { useEffect, useMemo, useState } from "react";
import { d1Request } from "@/lib/d1Client";
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
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchWorkspaceAndForms() {
      try {
        // Get workspace for activeFormId
        const wsResp = await d1Request("workspaces", { id: workspaceId });
        if (isMounted && wsResp.data) setActiveFormId(wsResp.data.activeFormId || null);

        // Get forms for this workspace
        const formsResp = await d1Request("workspace_forms");
        let nextForms = (formsResp.data || []).filter(f => f.workspace_id === workspaceId);
        // Parse JSON content if stored as string
        nextForms = nextForms.map(f => {
          let parsed = {};
          try { parsed = typeof f.content === "string" ? JSON.parse(f.content) : (f.content || {}); } catch {}
          return { ...f, ...parsed };
        });
        nextForms.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        if (isMounted) setForms(nextForms);
      } catch (e) {
        console.error("DataHub fetch error:", e);
      }
    }

    fetchWorkspaceAndForms();
    const interval = setInterval(fetchWorkspaceAndForms, 8000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [workspaceId]);

  const activeForm = useMemo(
    () => forms.find((form) => form.id === editingFormId) || null,
    [editingFormId, forms]
  );

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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1.5rem" }}>
          <div className="techy-card" style={{ padding: "1.5rem", backgroundColor: "var(--surface)", borderTop: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", margin: 0, fontWeight: 700 }}>Daftar Instrumen Penelitian</h3>
                <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>Kelola draft instrumen, kelompokkan berdasarkan variabel/section, dan aktifkan satu form untuk responden.</p>
              </div>
            </div>

            {forms.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", border: "2px dashed var(--border)", borderRadius: "16px", textAlign: "center", backgroundColor: "rgba(var(--surface-rgb), 0.5)" }}>
                <PremiumIcon name="layoutTemplate" size={42} className="text-muted" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <h4 style={{ margin: 0, fontSize: "1.1rem" }}>Belum Ada Instrumen</h4>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>Mulai dengan membuat instrumen penelitian baru yang terstruktur.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
                {forms.map((item) => {
                  const isActive = item.id === activeFormId;
                  return (
                    <div 
                      key={item.id} 
                      className="techy-card" 
                      style={{ 
                        padding: "1.25rem", 
                        border: isActive ? "2px solid var(--primary)" : "1px solid var(--border)", 
                        backgroundColor: isActive ? "rgba(var(--primary-rgb), 0.03)" : "var(--surface)",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      {isActive && (
                        <div style={{ position: "absolute", top: 0, right: 0, padding: "0.25rem 0.75rem", backgroundColor: "var(--primary)", color: "white", fontSize: "0.7rem", fontWeight: 700, borderBottomLeftRadius: "8px" }}>
                          AKTIF
                        </div>
                      )}
                      
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem" }}>
                        <div style={{ paddingRight: isActive ? "2rem" : "0" }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.3 }}>{item.title}</h4>
                          <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {item.description || "Deskripsi instrumen belum diisi."}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.8rem", color: "var(--text-muted)", backgroundColor: "rgba(var(--surface-rgb), 0.5)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(var(--border), 0.5)", flexGrow: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <PremiumIcon name="layers" size={14} className="text-primary" />
                          <span><strong>{item.sections?.length || 0}</strong> variabel/bagian</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <PremiumIcon name="list" size={14} className="text-primary" />
                          <span><strong>{item.sections?.reduce((sum, section) => sum + (section.questions?.length || 0), 0) || 0}</strong> butir pernyataan</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", color: item.publicSlug ? "var(--text-main)" : "inherit" }}>
                          <PremiumIcon name={item.publicSlug ? "link" : "link2Off"} size={14} className={item.publicSlug ? "text-success" : ""} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.publicSlug ? `/form/${item.publicSlug}` : "Belum punya link publik"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
                        <button className="btn btn-primary" style={{ flexGrow: 1 }} onClick={() => setEditingFormId(item.id)}>
                          <PremiumIcon name="edit3" size={14} />
                          Builder
                        </button>
                        {!isActive && (
                          <button className="btn btn-outline" style={{ flexGrow: 1 }} onClick={() => void handleActivateForm(item.id)}>
                            <PremiumIcon name="checkCircle" size={14} />
                            Aktifkan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
