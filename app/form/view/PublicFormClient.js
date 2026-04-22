// d:\Projek\Skripzy2\app\form\view\page.js
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PublicFormPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  
  // Karena ini mock, kita asumsikan form schema dirender dengan data hardcode yang identik dengan builder
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: "Kuesioner Penelitian AI",
    desc: "Bantu kami memahami efektivitas penggunaan AI dalam penyusunan tugas akhir.",
    questions: [
      { id: "1", type: "section", title: "Identitas Responden", desc: "Pastikan data Anda diisi dengan benar. Kerahasiaan terjamin." },
      { id: "2", type: "short", title: "Siapa nama lengkap Anda?", options: [] },
      { id: "3", type: "section", title: "Variabel X: Penggunaan AI", desc: "Pertanyaan seputar intensitas penggunaan." },
      { id: "4", type: "multiple", title: "Seberapa sering Anda menggunakan AI?", options: ["Sangat Sering", "Sering", "Jarang", "Tidak Pernah"] }
    ]
  });

  const [answers, setAnswers] = useState({});

  const handleInputChange = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // Di sinilah form akan dikirim ke Firestore > workspaces > form_responses
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 py-8">
        <div className="glass-panel max-w-lg w-full p-6 sm:p-8 rounded-xl shadow-lg border-t-8 border-t-[var(--primary)] text-center animate-fade-in bg-[var(--surface)]">
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Terima kasih!</h2>
          <p className="text-[var(--text-muted)] mb-6 text-sm">Jawaban kuesioner Anda telah berhasil direkam. Kami menghargai waktu Anda.</p>
          <button type="button" className="btn btn-primary w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm" onClick={() => setSubmitted(false)}>
            Kirim Tanggapan Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 flex justify-center" style={{ backgroundColor: "var(--background)", backgroundImage: "radial-gradient(circle at top right, rgba(79, 70, 229, 0.05), transparent 500px)" }}>
      <form onSubmit={handleSubmit} className="max-w-[700px] w-full flex flex-col gap-6 animate-fade-in pb-16">
        
        {/* Banner / Title Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-xl shadow-md border-t-4 border-t-[var(--primary)] bg-[var(--surface)]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">{formData.title}</h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">{formData.desc}</p>
          <div className="my-5 border-b border-[var(--border)]"></div>
          <div className="text-xs text-[var(--danger)] font-medium flex items-center gap-2">
            <span className="inline-block">*</span>
            <span>Menunjukkan pertanyaan yang wajib diisi</span>
          </div>
        </div>

        {/* Question & Section Cards */}
        {formData.questions.map((q) => {
          if (q.type === "section") {
            return (
              <div key={q.id} className="pt-2 pb-4" style={{ marginTop: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "4px", height: "24px", backgroundColor: "var(--primary)", borderRadius: "2px" }}></div>
                  <h2 className="text-lg font-bold text-[var(--text-main)]">{q.title}</h2>
                </div>
                {q.desc && <p className="text-[var(--text-muted)] text-sm ml-4 m-0">{q.desc}</p>}
              </div>
            );
          }

          return (
            <div key={q.id} className="glass-panel p-6 rounded-lg shadow-sm border border-[var(--border)] bg-[var(--surface)] hover:shadow-md transition-shadow">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-[var(--text-main)] flex items-center gap-2">
                {q.title}
                <span className="text-[var(--danger)] font-bold text-lg">*</span>
              </h3>

              {q.type === "short" && (
                <input 
                  required
                  type="text" 
                  placeholder="Ketikkan jawaban Anda di sini..."
                  className="form-input-enhanced"
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                />
              )}

              {q.type === "paragraph" && (
                <textarea 
                  required
                  placeholder="Ketikkan jawaban Anda di sini..."
                  rows={4}
                  className="form-textarea"
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                />
              )}

              {q.type === "multiple" && (
                <div className="flex flex-col gap-3">
                  {q.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer group p-3 hover:bg-[var(--surface-hover)] rounded-lg transition-colors duration-200 border border-transparent hover:border-[var(--primary-light)]">
                      <input 
                        required
                        type="radio" 
                        name={`question_${q.id}`} 
                        value={opt}
                        className="w-5 h-5 text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                      />
                      <span className="text-sm font-medium text-[var(--text-main)] transition-colors group-hover:text-[var(--primary)]">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "dropdown" && (
                <select 
                  required
                  className="form-input-enhanced"
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                >
                  <option value="">Pilih jawaban...</option>
                  {q.options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}

        {/* Submit Section */}
        <div className="mt-4 space-y-3">
          <button type="submit" className="btn btn-primary w-full py-3 rounded-lg shadow-md font-semibold text-base transition-all active:scale-95 hover:shadow-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Kirim Kuesioner
          </button>
          <button type="button" className="btn btn-outline w-full py-2.5 rounded-lg font-medium text-sm" onClick={() => setAnswers({})}>
            Kosongkan Formulir
          </button>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-main)] opacity-75">Skripzy Forms</span> — Formulir ini dibuat di dalam Skripzy Workspace.
        </div>

      </form>
    </div>
  );
}
