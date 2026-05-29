"use client";

import { useEffect, useMemo, useState } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { FormRenderer } from "./FormRenderer";
import {
  BUILDER_QUESTION_TYPES,
  FORM_QUICK_TEMPLATES,
  FORM_STATUSES,
  buildPublicFormSnapshot,
  createQuestion,
  createSection,
  duplicateQuestion,
  duplicateSection,
  flattenFormQuestions,
  slugify,
} from "@/lib/workspaceDefaults";
import { publishPublicFormSnapshot, unpublishPublicFormSnapshot } from "@/lib/workspacePublicApi";

function moveItem(list, fromIndex, toIndex) {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function normalizeFormPayload(form) {
  return {
    title: form.title,
    description: form.description,
    status: form.status || FORM_STATUSES.draft,
    publicSlug: form.publicSlug || "",
    settings: JSON.stringify(form.settings || {}),
    sections: JSON.stringify(form.sections || []),
    publishedAt: form.publishedAt || null,
  };
}

function buildInitialCollapsedSections(form) {
  return (form.sections || []).slice(1).map((section) => section.id);
}

function updateArrayState(current, itemId, shouldInclude) {
  if (shouldInclude) {
    return current.includes(itemId) ? current : [...current, itemId];
  }
  return current.filter((item) => item !== itemId);
}

export function FormBuilder({ workspaceId, form, existingForms = [], onClose, onSaved, isInline = false }) {
  const [draft, setDraft] = useState(form);
  const [selection, setSelection] = useState({ type: "form", sectionId: null, questionId: null });
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [collapsedSectionIds, setCollapsedSectionIds] = useState(() => buildInitialCollapsedSections(form));
  const [inspectorTab, setInspectorTab] = useState("properties");
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isStackedLayout = viewportWidth > 0 && viewportWidth < 1180;
  const isCompactLayout = viewportWidth > 0 && viewportWidth < 1380;

  const selectedSection = useMemo(
    () => draft.sections?.find((section) => section.id === selection.sectionId) || draft.sections?.[0] || null,
    [draft.sections, selection.sectionId]
  );

  const selectedQuestion = useMemo(
    () => flattenFormQuestions(draft).find((question) => question.id === selection.questionId) || null,
    [draft, selection.questionId]
  );

  const publicUrl =
    typeof window !== "undefined" && draft.publicSlug
      ? `${window.location.origin}/form?slug=${draft.publicSlug}`
      : "";

  const ensureSectionExpanded = (sectionId) => {
    setCollapsedSectionIds((current) => current.filter((item) => item !== sectionId));
  };

  const toggleSectionCollapsed = (sectionId) => {
    setCollapsedSectionIds((current) =>
      current.includes(sectionId) ? current.filter((item) => item !== sectionId) : [...current, sectionId]
    );
  };

  const handleSave = async (overrides = {}) => {
    setSaving(true);
    setSaveMessage("");
    try {
      const nextDraft = { ...draft, ...overrides };
      const payload = normalizeFormPayload(nextDraft);
      // Store form content as JSON blob in the 'content' column
      await d1Request("workspace_forms", {
        method: "PATCH",
        id: draft.id,
        body: {
          title: payload.title,
          status: payload.status,
          content: JSON.stringify({
            description: payload.description,
            publicSlug: payload.publicSlug,
            settings: nextDraft.settings || {},
            sections: nextDraft.sections || [],
            publishedAt: payload.publishedAt,
          }),
        }
      });
      setDraft(nextDraft);
      setSaveMessage("Perubahan form tersimpan.");
      onSaved?.(nextDraft);
      return nextDraft;
    } catch (error) {
      console.error("Gagal menyimpan form:", error);
      setSaveMessage("Gagal menyimpan form.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const slug = draft.publicSlug || slugify(`${draft.title}-${workspaceId.slice(0, 6)}`);

      for (const item of existingForms.filter((entry) => entry.id !== draft.id && entry.status === FORM_STATUSES.published)) {
        await d1Request("workspace_forms", {
          method: "PATCH",
          id: item.id,
          body: { status: FORM_STATUSES.draft }
        });
        if (item.publicSlug) {
          await unpublishPublicFormSnapshot({ slug: item.publicSlug });
        }
      }

      const publishedDraft = await handleSave({
        status: FORM_STATUSES.published,
        publicSlug: slug,
        publishedAt: draft.publishedAt || new Date().toISOString(),
      });

      if (!publishedDraft) return;

      await d1Request("workspaces", {
        method: "PATCH",
        id: workspaceId,
        body: { activeFormId: draft.id }
      });

      await publishPublicFormSnapshot({
        slug,
        snapshot: buildPublicFormSnapshot(
          { ...publishedDraft, publicSlug: slug, status: FORM_STATUSES.published },
          workspaceId,
          draft.id
        ),
      });

      setSaveMessage(`Form dipublikasikan ke /form?slug=${slug}`);
    } catch (error) {
      console.error("Gagal publish form:", error);
      setSaveMessage("Gagal mempublikasikan form.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await handleSave({
        status: FORM_STATUSES.draft,
      });
      if (draft.publicSlug) {
        await unpublishPublicFormSnapshot({ slug: draft.publicSlug });
      }
      setSaveMessage("Form berhasil diturunkan dari publik.");
    } catch (error) {
      console.error("Gagal unpublish form:", error);
      setSaveMessage("Gagal menonaktifkan form publik.");
    } finally {
      setPublishing(false);
    }
  };

  const updateSelectedQuestion = (patch) => {
    if (!selectedQuestion) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        questions: section.questions.map((question) =>
          question.id === selectedQuestion.id ? { ...question, ...patch } : question
        ),
      })),
    }));
  };

  const updateSelectedSection = (patch) => {
    if (!selectedSection) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSection.id ? { ...section, ...patch } : section
      ),
    }));
  };

  const addQuestionToSection = (sectionId, type = "shortText") => {
    const question = createQuestion(type);
    ensureSectionExpanded(sectionId);
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...(section.questions || []), question] }
          : section
      ),
    }));
    setSelection({ type: "question", sectionId, questionId: question.id });
    setInspectorTab("properties");
  };

  const addSection = () => {
    const section = createSection();
    setDraft((current) => ({
      ...current,
      sections: [...(current.sections || []), section],
    }));
    ensureSectionExpanded(section.id);
    setSelection({ type: "section", sectionId: section.id, questionId: null });
    setInspectorTab("properties");
  };

  const handleAddTemplateSection = (templateKey) => {
    const nextSection = FORM_QUICK_TEMPLATES.find((template) => template.key === templateKey)?.build();
    if (!nextSection) return;

    setDraft((current) => ({
      ...current,
      sections: [...(current.sections || []), nextSection],
    }));
    ensureSectionExpanded(nextSection.id);
    setSelection({ type: "section", sectionId: nextSection.id, questionId: null });
    setInspectorTab("properties");
  };

  const removeSelectedQuestion = () => {
    if (!selectedQuestion) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        questions: section.questions.filter((question) => question.id !== selectedQuestion.id),
      })),
    }));
    setSelection({ type: "section", sectionId: selectedQuestion.sectionId, questionId: null });
  };

  const duplicateSelectedQuestion = () => {
    if (!selectedQuestion) return;
    const nextQuestion = duplicateQuestion(selectedQuestion);
    ensureSectionExpanded(selectedQuestion.sectionId);
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedQuestion.sectionId
          ? { ...section, questions: [...section.questions, nextQuestion] }
          : section
      ),
    }));
    setSelection({ type: "question", sectionId: selectedQuestion.sectionId, questionId: nextQuestion.id });
  };

  const duplicateSelectedSection = () => {
    if (!selectedSection) return;
    const nextSection = duplicateSection(selectedSection);
    ensureSectionExpanded(nextSection.id);
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, nextSection],
    }));
    setSelection({ type: "section", sectionId: nextSection.id, questionId: null });
  };

  const removeSelectedSection = () => {
    if (!selectedSection) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== selectedSection.id),
    }));
    setCollapsedSectionIds((current) => current.filter((item) => item !== selectedSection.id));
    setSelection({ type: "form", sectionId: null, questionId: null });
  };

  const moveSection = (direction) => {
    if (!selectedSection) return;
    const currentIndex = draft.sections.findIndex((section) => section.id === selectedSection.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= draft.sections.length) return;
    setDraft((current) => ({
      ...current,
      sections: moveItem(current.sections, currentIndex, targetIndex),
    }));
  };

  const moveQuestion = (direction) => {
    if (!selectedQuestion) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== selectedQuestion.sectionId) return section;
        const currentIndex = section.questions.findIndex((question) => question.id === selectedQuestion.id);
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= section.questions.length) return section;
        return {
          ...section,
          questions: moveItem(section.questions, currentIndex, targetIndex),
        };
      }),
    }));
  };

  return (
    <div 
      className="flex flex-col w-full bg-[var(--background)] animate-fade-in"
      style={{ height: isInline ? "calc(100vh - 280px)" : "100vh", minHeight: isInline ? "600px" : undefined }}
    >
      <div className="w-full h-full flex flex-col bg-[var(--background)]">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div>
            <h2 className="text-lg font-semibold m-0">Form Builder Kuesioner</h2>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Rancang instrumen penelitian Anda — tambah bagian, susun pertanyaan, lalu publish.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
              Status: <strong style={{ color: "var(--text-main)", textTransform: "capitalize" }}>{draft.status || FORM_STATUSES.draft}</strong>
            </span>

            {publicUrl ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                <PremiumIcon name="externalLink" size={14} />
                Buka Form
              </a>
            ) : null}

            <button className="btn btn-outline" onClick={() => void handleSave()} disabled={saving}>
              <PremiumIcon name="save" size={14} />
              {saving ? "Menyimpan..." : "Simpan"}
            </button>

            {draft.status === FORM_STATUSES.published ? (
              <button className="btn btn-outline" onClick={() => void handleUnpublish()} disabled={publishing}>
                <PremiumIcon name="pause" size={14} />
                Tutup Form
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => void handlePublish()} disabled={publishing}>
                <PremiumIcon name="play" size={14} />
                {publishing ? "Mempublikasikan..." : "Publikasikan"}
              </button>
            )}

            {!isInline && onClose && (
              <button className="btn btn-ghost" onClick={onClose}>
                <PremiumIcon name="x" size={18} />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: isStackedLayout ? "flex" : "grid",
            flexDirection: isStackedLayout ? "column" : undefined,
            gridTemplateColumns: isStackedLayout ? undefined : isCompactLayout ? "250px minmax(0, 1fr) 320px" : "280px minmax(0, 1fr) 360px",
            gap: "1rem",
            flex: 1,
            minHeight: 0,
            padding: "1rem",
          }}
        >
          <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.9rem", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Daftar Bagian</h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>Pilih bagian aktif, tambah template, atau tambah bagian baru.</p>
              </div>
              <button className="btn btn-primary" onClick={addSection}>
                <PremiumIcon name="plus" size={14} />
                Bagian Baru
              </button>
            </div>

            <button
              className={`btn ${selection.type === "form" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                setSelection({ type: "form", sectionId: null, questionId: null });
                setInspectorTab("properties");
              }}
            >
              <PremiumIcon name="squarePen" size={14} />
              Info Form
            </button>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
              {FORM_QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  className="btn btn-outline"
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.72rem" }}
                  onClick={() => handleAddTemplateSection(template.key)}
                >
                  {template.label}
                </button>
              ))}
            </div>

            <div className="workspace-scroll" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.65rem", paddingRight: "0.15rem" }}>
              {draft.sections.map((section) => {
                const isSelected = selection.sectionId === section.id;
                const isCollapsed = collapsedSectionIds.includes(section.id);

                return (
                  <div key={section.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "stretch", backgroundColor: isSelected ? "var(--primary-light)" : "var(--surface)" }}>
                      <button
                        className="btn btn-ghost"
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                          padding: "0.85rem",
                          borderRadius: 0,
                          color: "var(--text-main)",
                        }}
                        onClick={() => {
                          ensureSectionExpanded(section.id);
                          setSelection({ type: "section", sectionId: section.id, questionId: null });
                          setInspectorTab("properties");
                        }}
                      >
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.title}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{section.questions.length} pertanyaan</span>
                      </button>
                      <button className="btn btn-ghost" style={{ borderRadius: 0, paddingInline: "0.7rem" }} onClick={() => toggleSectionCollapsed(section.id)}>
                        <PremiumIcon name={isCollapsed ? "chevronRight" : "chevronDown"} size={15} />
                      </button>
                    </div>

                    {!isCollapsed ? (
                      <div style={{ padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem", backgroundColor: "var(--background)" }}>
                        {(section.questions || []).map((question) => (
                          <button
                            key={question.id}
                            className="btn btn-ghost"
                            style={{
                              justifyContent: "flex-start",
                              padding: "0.55rem 0.7rem",
                              backgroundColor: selection.questionId === question.id ? "var(--primary-light)" : "transparent",
                              color: selection.questionId === question.id ? "var(--primary)" : "var(--text-main)",
                            }}
                            onClick={() => {
                              ensureSectionExpanded(section.id);
                              setSelection({ type: "question", sectionId: section.id, questionId: question.id });
                              setInspectorTab("properties");
                            }}
                          >
                            <PremiumIcon name="type" size={14} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{question.label}</span>
                          </button>
                        ))}
                        <button
                          className="btn btn-outline"
                          style={{ padding: "0.45rem 0.6rem", fontSize: "0.72rem" }}
                          onClick={() => addQuestionToSection(section.id, "shortText")}
                        >
                          <PremiumIcon name="plus" size={14} />
                          Tambah Pertanyaan
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Area Desain</h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>Klik bagian atau pertanyaan untuk mengedit. Bagian lain bisa diciutkan.</p>
              </div>
              {saveMessage ? <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{saveMessage}</span> : null}
            </div>

            <div className="workspace-scroll" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.85rem", paddingRight: "0.2rem" }}>
              {draft.sections.map((section) => {
                const isCollapsed = collapsedSectionIds.includes(section.id);
                const isSelectedSection = selection.sectionId === section.id && selection.type !== "question";

                return (
                  <div
                    key={section.id}
                    style={{
                      border: isSelectedSection ? "1px solid var(--primary)" : "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "1rem",
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
                      <button
                        className="btn btn-ghost"
                        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: 0, width: "100%", color: "var(--text-main)" }}
                        onClick={() => {
                          ensureSectionExpanded(section.id);
                          setSelection({ type: "section", sectionId: section.id, questionId: null });
                          setInspectorTab("properties");
                        }}
                      >
                        <div style={{ textAlign: "left", minWidth: 0 }}>
                          <h4 style={{ fontSize: "1rem", margin: 0 }}>{section.title}</h4>
                          {section.description ? <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem" }}>{section.description}</p> : null}
                        </div>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{section.questions.length} butir</span>
                      </button>

                      <button className="btn btn-ghost" style={{ padding: "0.35rem", flexShrink: 0 }} onClick={() => toggleSectionCollapsed(section.id)}>
                        <PremiumIcon name={isCollapsed ? "chevronRight" : "chevronDown"} size={15} />
                      </button>
                    </div>

                    {!isCollapsed ? (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                          {section.questions.map((question) => (
                            <button
                              key={question.id}
                              className="btn btn-ghost"
                              style={{
                                display: "block",
                                textAlign: "left",
                                padding: "0.95rem",
                                border: selection.questionId === question.id ? "1px solid var(--primary)" : "1px solid var(--border)",
                                borderRadius: "12px",
                                backgroundColor: selection.questionId === question.id ? "var(--primary-light)" : "var(--background)",
                                color: "var(--text-main)",
                              }}
                              onClick={() => {
                                ensureSectionExpanded(section.id);
                                setSelection({ type: "question", sectionId: section.id, questionId: question.id });
                                setInspectorTab("properties");
                              }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                                  <div style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4 }}>{question.label}</div>
                                  <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase" }}>{question.type}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                  {question.variableKey ? (
                                    <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "999px", backgroundColor: "rgba(16, 185, 129, 0.12)", color: "var(--success)", fontWeight: 600, letterSpacing: "0.02em" }}>
                                      #{question.variableKey}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "999px", backgroundColor: "rgba(var(--text-muted), 0.1)", color: "var(--text-muted)", fontWeight: 600 }}>
                                      Belum ada kode
                                    </span>
                                  )}
                                  <span style={{ fontSize: "0.75rem", color: question.required ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
                                    {question.required ? "Wajib Diisi" : "Opsional"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>

                          <div className="workspace-scroll" style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                            {BUILDER_QUESTION_TYPES.filter((type) => type.value !== "sectionText").map((type) => (
                              <button
                                key={`${section.id}_${type.value}`}
                                className="btn btn-outline"
                                style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem", flexShrink: 0, borderRadius: "999px", backgroundColor: "rgba(var(--surface-rgb), 0.8)" }}
                                onClick={() => addQuestionToSection(section.id, type.value)}
                              >
                                {type.label}
                              </button>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {section.questions.length} pertanyaan diciutkan — klik panah untuk membuka.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <button className={`btn ${inspectorTab === "properties" ? "btn-primary" : "btn-outline"}`} style={{ padding: "0.35rem 0.65rem" }} onClick={() => setInspectorTab("properties")}>
                  Pengaturan
                </button>
                <button className={`btn ${inspectorTab === "preview" ? "btn-primary" : "btn-outline"}`} style={{ padding: "0.35rem 0.65rem" }} onClick={() => setInspectorTab("preview")}>
                  Pratinjau
                </button>
              </div>

              {inspectorTab === "preview" ? (
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button className={`btn ${previewDevice === "desktop" ? "btn-primary" : "btn-outline"}`} style={{ padding: "0.3rem 0.6rem" }} onClick={() => setPreviewDevice("desktop")}>
                    Desktop
                  </button>
                  <button className={`btn ${previewDevice === "mobile" ? "btn-primary" : "btn-outline"}`} style={{ padding: "0.3rem 0.6rem" }} onClick={() => setPreviewDevice("mobile")}>
                    Mobile
                  </button>
                </div>
              ) : null}
            </div>

            <div className="workspace-scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: "0.15rem" }}>
              {inspectorTab === "properties" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {selection.type === "form" ? (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Judul Kuesioner</label>
                        <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Deskripsi / Pengantar</label>
                        <textarea className="form-textarea" rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Tuliskan pengantar singkat untuk responden..." />
                      </div>
                    </>
                  ) : null}

                  {selection.type === "section" && selectedSection ? (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Judul Bagian</label>
                        <input className="form-input" value={selectedSection.title} onChange={(event) => updateSelectedSection({ title: event.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Deskripsi Bagian</label>
                        <textarea className="form-textarea" rows={4} value={selectedSection.description} onChange={(event) => updateSelectedSection({ description: event.target.value })} />
                      </div>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                        <button className="btn btn-outline" onClick={() => moveSection("up")}>
                          <PremiumIcon name="chevronLeft" size={14} />
                          Naik
                        </button>
                        <button className="btn btn-outline" onClick={() => moveSection("down")}>
                          <PremiumIcon name="chevronRight" size={14} />
                          Turun
                        </button>
                        <button className="btn btn-outline" onClick={duplicateSelectedSection}>
                          <PremiumIcon name="copy" size={14} />
                          Duplikat
                        </button>
                        <button className="btn btn-outline" onClick={() => setCollapsedSectionIds((current) => updateArrayState(current, selectedSection.id, !current.includes(selectedSection.id)))}>
                          <PremiumIcon name="chevronDownSquare" size={14} />
                          Ringkas
                        </button>
                        <button className="btn btn-ghost" onClick={removeSelectedSection}>
                          <PremiumIcon name="trash" size={14} />
                          Hapus
                        </button>
                      </div>
                    </>
                  ) : null}

                  {selection.type === "question" && selectedQuestion ? (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Teks Pertanyaan</label>
                        <input className="form-input" value={selectedQuestion.label} onChange={(event) => updateSelectedQuestion({ label: event.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          <span>Kode Variabel</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>Singkatan unik untuk analisis (contoh: x1, kepuasan_kerja)</span>
                        </label>
                        <input className="form-input" style={{ fontFamily: "monospace" }} value={selectedQuestion.variableKey || ""} onChange={(event) => updateSelectedQuestion({ variableKey: slugify(event.target.value).replace(/-/g, "_") })} placeholder="cth: x1, y2, usia" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Tipe Pertanyaan</label>
                        <select className="form-input" value={selectedQuestion.type} onChange={(event) => updateSelectedQuestion({ type: event.target.value })}>
                          {BUILDER_QUESTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Petunjuk Pengisian <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(opsional)</span></label>
                        <textarea className="form-textarea" rows={3} value={selectedQuestion.helpText || ""} onChange={(event) => updateSelectedQuestion({ helpText: event.target.value })} placeholder="Contoh: Pilih satu jawaban yang paling sesuai..." />
                      </div>
                      {["singleChoice", "dropdown", "checkbox"].includes(selectedQuestion.type) ? (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label">Pilihan Jawaban <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(satu per baris)</span></label>
                          <textarea
                            className="form-textarea"
                            rows={5}
                            value={(selectedQuestion.options || []).join("\n")}
                            onChange={(event) =>
                              updateSelectedQuestion({
                                options: event.target.value
                                  .split("\n")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Satu pilihan per baris&#10;Contoh:&#10;Sangat Setuju&#10;Setuju"
                          />
                        </div>
                      ) : null}
                      {selectedQuestion.type === "likert5" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.65rem" }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Label Minimum</label>
                            <input
                              className="form-input"
                              value={selectedQuestion.scale?.minLabel || ""}
                              onChange={(event) =>
                                updateSelectedQuestion({
                                  scale: {
                                    ...(selectedQuestion.scale || {}),
                                    min: 1,
                                    max: 5,
                                    minLabel: event.target.value,
                                    maxLabel: selectedQuestion.scale?.maxLabel || "Sangat Setuju",
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Label Maksimum</label>
                            <input
                              className="form-input"
                              value={selectedQuestion.scale?.maxLabel || ""}
                              onChange={(event) =>
                                updateSelectedQuestion({
                                  scale: {
                                    ...(selectedQuestion.scale || {}),
                                    min: 1,
                                    max: 5,
                                    minLabel: selectedQuestion.scale?.minLabel || "Sangat Tidak Setuju",
                                    maxLabel: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                      <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem", color: "var(--text-main)", cursor: "pointer" }}>
                        <input type="checkbox" checked={selectedQuestion.required} onChange={(event) => updateSelectedQuestion({ required: event.target.checked })} />
                        Wajib diisi oleh responden
                      </label>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                        <button className="btn btn-outline" onClick={() => moveQuestion("up")}>
                          <PremiumIcon name="chevronLeft" size={14} />
                          Naik
                        </button>
                        <button className="btn btn-outline" onClick={() => moveQuestion("down")}>
                          <PremiumIcon name="chevronRight" size={14} />
                          Turun
                        </button>
                        <button className="btn btn-outline" onClick={duplicateSelectedQuestion}>
                          <PremiumIcon name="copy" size={14} />
                          Duplikat
                        </button>
                        <button className="btn btn-ghost" onClick={removeSelectedQuestion}>
                          <PremiumIcon name="trash" size={14} />
                          Hapus
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <FormRenderer
                  form={draft}
                  answers={previewAnswers}
                  onAnswerChange={(question, value) => setPreviewAnswers((current) => ({ ...current, [question.id]: value }))}
                  device={previewDevice}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
