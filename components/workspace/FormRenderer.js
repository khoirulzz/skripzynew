"use client";

import { isQuestionVisible } from "@/lib/workspaceDefaults";

function updateCheckboxValue(currentValue, option, checked) {
  const current = Array.isArray(currentValue) ? currentValue : [];
  if (checked) {
    return current.includes(option) ? current : [...current, option];
  }
  return current.filter((item) => item !== option);
}

export function FormRenderer({
  form,
  answers = {},
  onAnswerChange,
  disabled = false,
  previewMode = false,
  device = "desktop",
}) {
  if (!form?.sections?.length) {
    return (
      <div className="glass-panel" style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-muted)" }}>
        Struktur form belum tersedia.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: device === "mobile" ? "390px" : "760px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div className="glass-panel" style={{ padding: "1.5rem 1.5rem 1.25rem", borderTop: "4px solid var(--primary)" }}>
        <h2 style={{ fontSize: "1.35rem", margin: 0 }}>{form.title || "Tanpa Judul"}</h2>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>{form.description || "Deskripsi form belum diisi."}</p>
      </div>

      {form.sections.map((section) => (
        <div key={section.id} className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ paddingBottom: "0.85rem", borderBottom: "1px solid var(--border)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>{section.title || "Bagian Tanpa Judul"}</h3>
            {section.description ? (
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem" }}>{section.description}</p>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {(section.questions || [])
              .filter((question) => isQuestionVisible(question, answers))
              .map((question) => (
                <div
                  key={question.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    backgroundColor: "var(--background)",
                  }}
                >
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.6rem", color: "var(--text-main)" }}>
                    {question.label}
                    {question.required ? <span style={{ color: "var(--danger)", marginLeft: "0.25rem" }}>*</span> : null}
                  </label>

                  {question.helpText ? (
                    <p style={{ fontSize: "0.8rem", margin: "0 0 0.75rem 0" }}>{question.helpText}</p>
                  ) : null}

                  {question.type === "shortText" ? (
                    <input
                      type="text"
                      className="form-input-enhanced"
                      disabled={disabled}
                      placeholder="Ketik jawaban Anda..."
                      value={answers[question.id] || ""}
                      onChange={(event) => onAnswerChange?.(question, event.target.value)}
                    />
                  ) : null}

                  {question.type === "paragraph" ? (
                    <textarea
                      rows={4}
                      className="form-textarea"
                      disabled={disabled}
                      placeholder="Ketik jawaban Anda..."
                      value={answers[question.id] || ""}
                      onChange={(event) => onAnswerChange?.(question, event.target.value)}
                    />
                  ) : null}

                  {question.type === "number" ? (
                    <input
                      type="number"
                      className="form-input-enhanced"
                      disabled={disabled}
                      placeholder="0"
                      value={answers[question.id] ?? ""}
                      onChange={(event) => onAnswerChange?.(question, event.target.value)}
                    />
                  ) : null}

                  {question.type === "singleChoice" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {(question.options || []).map((option) => (
                        <label
                          key={option}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.8rem 0.9rem",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            cursor: disabled ? "default" : "pointer",
                            backgroundColor: answers[question.id] === option ? "var(--primary-light)" : "var(--surface)",
                          }}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            disabled={disabled}
                            checked={answers[question.id] === option}
                            onChange={() => onAnswerChange?.(question, option)}
                          />
                          <span style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {question.type === "dropdown" ? (
                    <select
                      className="form-input-enhanced"
                      disabled={disabled}
                      value={answers[question.id] || ""}
                      onChange={(event) => onAnswerChange?.(question, event.target.value)}
                    >
                      <option value="">Pilih jawaban...</option>
                      {(question.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {question.type === "checkbox" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                      {(question.options || []).map((option) => (
                        <label
                          key={option}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.75rem 0.85rem",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            cursor: disabled ? "default" : "pointer",
                            backgroundColor: Array.isArray(answers[question.id]) && answers[question.id].includes(option)
                              ? "var(--primary-light)"
                              : "var(--surface)",
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={Array.isArray(answers[question.id]) && answers[question.id].includes(option)}
                            onChange={(event) =>
                              onAnswerChange?.(
                                question,
                                updateCheckboxValue(answers[question.id], option, event.target.checked)
                              )
                            }
                          />
                          <span style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {question.type === "likert5" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                          gap: "0.5rem",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <label
                            key={value}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.45rem",
                              padding: "0.75rem 0.5rem",
                              border: "1px solid var(--border)",
                              borderRadius: "10px",
                              backgroundColor: Number(answers[question.id]) === value ? "var(--primary-light)" : "var(--surface)",
                              cursor: disabled ? "default" : "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              disabled={disabled}
                              checked={Number(answers[question.id]) === value}
                              onChange={() => onAnswerChange?.(question, value)}
                            />
                            <span style={{ fontSize: "0.92rem", fontWeight: 600 }}>{value}</span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>{question.scale?.minLabel || "Sangat Tidak Setuju"}</span>
                        <span>{question.scale?.maxLabel || "Sangat Setuju"}</span>
                      </div>
                    </div>
                  ) : null}

                  {question.type === "sectionText" ? (
                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "10px",
                        backgroundColor: "var(--surface)",
                        border: "1px dashed var(--border)",
                        fontSize: "0.82rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {question.helpText || "Catatan tambahan untuk menjelaskan bagian ini."}
                    </div>
                  ) : null}

                  {previewMode && !onAnswerChange ? (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Pratinjau komponen pertanyaan.
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
