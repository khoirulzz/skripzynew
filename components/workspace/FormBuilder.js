"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { FormRenderer } from "./FormRenderer";
import {
  BUILDER_QUESTION_TYPES,
  FORM_QUICK_TEMPLATES,
  FORM_STATUSES,
  addTemplateSection,
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
    settings: form.settings || {},
    sections: form.sections || [],
    publishedAt: form.publishedAt || null,
    updatedAt: serverTimestamp(),
  };
}

export function FormBuilder({ workspaceId, form, existingForms = [], onClose, onSaved }) {
  const [draft, setDraft] = useState(form);
  const [selection, setSelection] = useState({ type: "form", sectionId: null, questionId: null });
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const selectedSection = useMemo(
    () => draft.sections?.find((section) => section.id === selection.sectionId) || draft.sections?.[0] || null,
    [draft.sections, selection.sectionId]
  );

  const selectedQuestion = useMemo(
    () => flattenFormQuestions(draft).find((question) => question.id === selection.questionId) || null,
    [draft, selection.questionId]
  );

  const handleSave = async (overrides = {}) => {
    setSaving(true);
    setSaveMessage("");
    try {
      const nextDraft = { ...draft, ...overrides };
      await updateDoc(doc(db, "workspaces", workspaceId, "forms", draft.id), normalizeFormPayload(nextDraft));
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
        const targetRef = doc(db, "workspaces", workspaceId, "forms", item.id);
        await updateDoc(targetRef, {
          status: FORM_STATUSES.draft,
          updatedAt: serverTimestamp(),
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

      await updateDoc(doc(db, "workspaces", workspaceId), {
        activeFormId: draft.id,
        updatedAt: serverTimestamp(),
      });

      await publishPublicFormSnapshot({
        slug,
        snapshot: buildPublicFormSnapshot(
          { ...publishedDraft, publicSlug: slug, status: FORM_STATUSES.published },
          workspaceId,
          draft.id
        ),
      });

      setSaveMessage(`Form dipublikasikan ke /form/${slug}`);
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
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...(section.questions || []), question] }
          : section
      ),
    }));
    setSelection({ type: "question", sectionId, questionId: question.id });
  };

  const addSection = () => {
    const section = createSection();
    setDraft((current) => ({
      ...current,
      sections: [...(current.sections || []), section],
    }));
    setSelection({ type: "section", sectionId: section.id, questionId: null });
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

  const publicUrl =
    typeof window !== "undefined" && draft.publicSlug
      ? `${window.location.origin}/form/${draft.publicSlug}`
      : "";

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--background)] animate-fade-in">
      <div className="w-full h-full flex flex-col bg-[var(--background)]">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div>
            <h2 className="text-lg font-semibold m-0">Skripzy Form Builder</h2>
            <p className="text-muted" style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem" }}>
              Builder dinamis untuk instrumen penelitian kuantitatif.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Status: <strong style={{ color: "var(--text-main)", textTransform: "capitalize" }}>{draft.status || FORM_STATUSES.draft}</strong>
            </span>

            {publicUrl ? (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                <PremiumIcon name="globe" size={14} />
                Link Publik
              </a>
            ) : null}

            <button className="btn btn-outline" onClick={() => void handleSave()} disabled={saving}>
              <PremiumIcon name="save" size={14} />
              {saving ? "Menyimpan..." : "Simpan"}
            </button>

            {draft.status === FORM_STATUSES.published ? (
              <button className="btn btn-outline" onClick={() => void handleUnpublish()} disabled={publishing}>
                <PremiumIcon name="pause" size={14} />
                Nonaktifkan
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => void handlePublish()} disabled={publishing}>
                <PremiumIcon name="play" size={14} />
                {publishing ? "Mempublikasikan..." : "Publish"}
              </button>
            )}

            <button className="btn btn-ghost" onClick={onClose}>
              <PremiumIcon name="x" size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr) 360px", gap: "1rem", flex: 1, minHeight: 0, padding: "1rem" }}>
          <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.9rem", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Outline Form</h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem" }}>Kelola struktur section dan butir.</p>
              </div>
              <button className="btn btn-primary" onClick={addSection}>
                <PremiumIcon name="plus" size={14} />
                Bagian
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
              {FORM_QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  className="btn btn-outline"
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.72rem" }}
                  onClick={() => setDraft((current) => addTemplateSection(current, template.key))}
                >
                  {template.label}
                </button>
              ))}
            </div>

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {draft.sections.map((section) => (
                <div key={section.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                  <button
                    className="btn btn-ghost"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      padding: "0.85rem",
                      backgroundColor: selection.sectionId === section.id && selection.type !== "question" ? "var(--primary-light)" : "var(--surface)",
                    }}
                    onClick={() => setSelection({ type: "section", sectionId: section.id, questionId: null })}
                  >
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{section.title}</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{section.questions.length} butir</span>
                  </button>
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
                        onClick={() => setSelection({ type: "question", sectionId: section.id, questionId: question.id })}
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
                      Tambah Butir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Canvas Form</h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.76rem" }}>Pilih section atau pertanyaan untuk mengubah properti detail.</p>
              </div>
              {saveMessage ? <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{saveMessage}</span> : null}
            </div>

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.25rem" }}>
              {draft.sections.map((section) => (
                <div
                  key={section.id}
                  style={{
                    border: selection.sectionId === section.id && selection.type !== "question" ? "1px solid var(--primary)" : "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "1rem",
                    backgroundColor: "var(--surface)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "1rem", margin: 0 }}>{section.title}</h4>
                      {section.description ? <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem" }}>{section.description}</p> : null}
                    </div>
                    <button className="btn btn-ghost" onClick={() => setSelection({ type: "section", sectionId: section.id, questionId: null })}>
                      <PremiumIcon name="edit3" size={14} />
                    </button>
                  </div>

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
                        onClick={() => setSelection({ type: "question", sectionId: section.id, questionId: question.id })}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                          <div style={{ fontWeight: 600 }}>{question.label}</div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{question.type}</span>
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                          {question.variableKey} {question.required ? "• wajib" : "• opsional"}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
                    {BUILDER_QUESTION_TYPES.filter((type) => type.value !== "sectionText").map((type) => (
                      <button
                        key={`${section.id}_${type.value}`}
                        className="btn btn-outline"
                        style={{ padding: "0.4rem 0.7rem", fontSize: "0.74rem" }}
                        onClick={() => addQuestionToSection(section.id, type.value)}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minHeight: 0 }}>
            <div className="glass-panel" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Properti</h3>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button className={`btn ${previewDevice === "desktop" ? "btn-primary" : "btn-outline"}`} style={{ padding: "0.3rem 0.6rem" }} onClick={() => setPreviewDevice("desktop")}>
                    Desktop
                  </button>
                  <button className={`btn ${previewDevice === "mobile" ? "btn-primary" : "btn-outline"}`} style={{ padding: "0.3rem 0.6rem" }} onClick={() => setPreviewDevice("mobile")}>
                    Mobile
                  </button>
                </div>
              </div>

              {selection.type === "form" ? (
                <>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Judul Form</label>
                    <input className="form-input" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Deskripsi</label>
                    <textarea className="form-textarea" rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Slug Publik</label>
                    <input
                      className="form-input"
                      value={draft.publicSlug || ""}
                      onChange={(event) => setDraft((current) => ({ ...current, publicSlug: slugify(event.target.value) }))}
                      placeholder="otomatis jika dikosongkan"
                    />
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
                    <label className="form-label">Label Pertanyaan</label>
                    <input className="form-input" value={selectedQuestion.label} onChange={(event) => updateSelectedQuestion({ label: event.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Variable Key</label>
                    <input className="form-input" value={selectedQuestion.variableKey || ""} onChange={(event) => updateSelectedQuestion({ variableKey: slugify(event.target.value).replace(/-/g, "_") })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Jenis Pertanyaan</label>
                    <select className="form-input" value={selectedQuestion.type} onChange={(event) => updateSelectedQuestion({ type: event.target.value })}>
                      {BUILDER_QUESTION_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Bantuan / Instruksi</label>
                    <textarea className="form-textarea" rows={3} value={selectedQuestion.helpText || ""} onChange={(event) => updateSelectedQuestion({ helpText: event.target.value })} />
                  </div>
                  {["singleChoice", "dropdown", "checkbox"].includes(selectedQuestion.type) ? (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Pilihan Jawaban</label>
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
                        placeholder="Satu pilihan per baris"
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
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem", color: "var(--text-main)" }}>
                    <input type="checkbox" checked={selectedQuestion.required} onChange={(event) => updateSelectedQuestion({ required: event.target.checked })} />
                    Pertanyaan wajib diisi
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

            <div className="glass-panel" style={{ padding: "1rem", flex: 1, minHeight: 0, overflow: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <PremiumIcon name="eye" size={16} className="text-primary" />
                <h3 style={{ fontSize: "0.95rem", margin: 0 }}>Live Preview</h3>
              </div>
              <FormRenderer form={draft} answers={previewAnswers} onAnswerChange={(question, value) => setPreviewAnswers((current) => ({ ...current, [question.id]: value }))} device={previewDevice} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
