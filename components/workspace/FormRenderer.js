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
      className="form-renderer-container"
      style={{
        width: "100%",
        maxWidth: device === "mobile" ? "100%" : "800px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        padding: device === "mobile" ? "1rem" : "2rem",
        transition: "all 0.3s ease"
      }}
    >
      <div className="techy-card" style={{ padding: "2rem", borderTop: "5px solid var(--primary)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: "radial-gradient(circle at top right, rgba(79, 70, 229, 0.08), transparent 60%)", pointerEvents: "none" }} />
        <h2 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>{form.title || "Tanpa Judul"}</h2>
        <p style={{ margin: "0.75rem 0 0 0", fontSize: "1rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{form.description || "Deskripsi form belum diisi."}</p>
      </div>

      {form.sections.map((section, sIdx) => (
        <div key={section.id} className="techy-card" style={{ padding: device === "mobile" ? "1.25rem" : "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ paddingBottom: "1rem", borderBottom: "1px solid rgba(var(--primary-rgb), 0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "8px", background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", fontSize: "0.85rem", fontWeight: 700 }}>{sIdx + 1}</span>
              <h3 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700, color: "var(--text-main)" }}>{section.title || "Bagian Tanpa Judul"}</h3>
            </div>
            {section.description ? (
              <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{section.description}</p>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {(section.questions || [])
              .filter((question) => isQuestionVisible(question, answers))
              .map((question) => (
                <div
                  key={question.id}
                  style={{
                    padding: device === "mobile" ? "1.25rem" : "1.75rem",
                    border: "1px solid rgba(var(--primary-rgb), 0.1)",
                    borderRadius: "14px",
                    backgroundColor: "rgba(var(--surface-rgb), 0.5)",
                    boxShadow: "0 4px 20px -10px rgba(0,0,0,0.05)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(var(--primary-rgb), 0.1)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.85rem" }}>
                    <label style={{ display: "block", fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.4 }}>
                      {question.label}
                      {question.required ? <span style={{ color: "var(--danger)", marginLeft: "0.35rem" }}>*</span> : null}
                    </label>
                    {previewMode && question.variableKey ? (
                      <span style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "6px", backgroundColor: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        Var: {question.variableKey}
                      </span>
                    ) : null}
                  </div>

                  {question.helpText ? (
                    <p style={{ fontSize: "0.85rem", margin: "0 0 1rem 0", color: "var(--text-muted)", fontStyle: "italic" }}>{question.helpText}</p>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {(question.options || []).map((option) => (
                        <label
                          key={option}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.85rem",
                            padding: "0.95rem 1.1rem",
                            border: answers[question.id] === option ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                            borderRadius: "12px",
                            cursor: disabled ? "default" : "pointer",
                            backgroundColor: answers[question.id] === option ? "rgba(var(--primary-rgb), 0.04)" : "var(--background)",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ 
                            width: "20px", height: "20px", borderRadius: "50%", 
                            border: answers[question.id] === option ? "6px solid var(--primary)" : "2px solid var(--border)", 
                            backgroundColor: "transparent", transition: "all 0.2s ease", flexShrink: 0 
                          }} />
                          <input
                            type="radio"
                            name={question.id}
                            disabled={disabled}
                            checked={answers[question.id] === option}
                            onChange={() => onAnswerChange?.(question, option)}
                            style={{ display: "none" }}
                          />
                          <span style={{ fontSize: "0.95rem", color: answers[question.id] === option ? "var(--text-main)" : "var(--text-muted)", fontWeight: answers[question.id] === option ? 600 : 400 }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {question.type === "dropdown" ? (
                    <select
                      className="form-input-enhanced form-select"
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {(question.options || []).map((option) => {
                        const isChecked = Array.isArray(answers[question.id]) && answers[question.id].includes(option);
                        return (
                          <label
                            key={option}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.85rem",
                              padding: "0.95rem 1.1rem",
                              border: isChecked ? "1.5px solid var(--primary)" : "1.5px solid var(--border)",
                              borderRadius: "12px",
                              cursor: disabled ? "default" : "pointer",
                              backgroundColor: isChecked ? "rgba(var(--primary-rgb), 0.04)" : "var(--background)",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <div style={{
                              width: "20px", height: "20px", borderRadius: "6px",
                              border: isChecked ? "none" : "2px solid var(--border)",
                              backgroundColor: isChecked ? "var(--primary)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s ease", flexShrink: 0
                            }}>
                              {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={isChecked}
                              onChange={(event) =>
                                onAnswerChange?.(
                                  question,
                                  updateCheckboxValue(answers[question.id], option, event.target.checked)
                                )
                              }
                              style={{ display: "none" }}
                            />
                            <span style={{ fontSize: "0.95rem", color: isChecked ? "var(--text-main)" : "var(--text-muted)", fontWeight: isChecked ? 600 : 400 }}>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}

                  {question.type === "likert5" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                          gap: "0.5rem",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((value) => {
                          const isSelected = Number(answers[question.id]) === value;
                          return (
                            <label
                              key={value}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                                padding: device === "mobile" ? "0.85rem 0" : "1.25rem 0.5rem",
                                border: isSelected ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                                borderRadius: "12px",
                                backgroundColor: isSelected ? "rgba(var(--primary-rgb), 0.06)" : "var(--background)",
                                cursor: disabled ? "default" : "pointer",
                                transition: "all 0.2s ease",
                                boxShadow: isSelected ? "0 4px 12px rgba(var(--primary-rgb), 0.15)" : "none"
                              }}
                            >
                              <div style={{
                                width: "18px", height: "18px", borderRadius: "50%",
                                border: isSelected ? "5px solid var(--primary)" : "2px solid var(--border)",
                                backgroundColor: "transparent", transition: "all 0.2s ease",
                                display: device === "mobile" ? "none" : "block"
                              }} />
                              <input
                                type="radio"
                                name={question.id}
                                disabled={disabled}
                                checked={isSelected}
                                onChange={() => onAnswerChange?.(question, value)}
                                style={{ display: "none" }}
                              />
                              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: isSelected ? "var(--primary)" : "var(--text-main)" }}>{value}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500, paddingInline: "0.25rem" }}>
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
