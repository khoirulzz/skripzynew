"use client";

import { useState, useRef } from "react";
import { d1Request } from "@/lib/d1Client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { extractTextFromPDF } from "@/lib/pdfText";
import { generateWorkspaceChapter } from "@/lib/workspacePublicApi";
import { createWorkspacePayload, JURNAL_IMRAD_TEMPLATE } from "@/lib/workspaceDefaults";

export default function JurnalCreatePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ title: "", topic: "" });
  const [file, setFile] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Step 1: Info Dasar
  const handleInfoSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.topic.trim()) {
      setError("Judul dan topik harus diisi.");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Step 2: Upload File & AI Extraction
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError(null);
    } else {
      setError("Pilih file PDF yang valid.");
    }
  };

  const processTemplate = async () => {
    if (!file) {
      setError("Pilih file PDF terlebih dahulu.");
      return;
    }

    setLoading(true);
    setStatusText("Mengekstrak teks dari PDF...");
    setError(null);

    try {
      const pdfText = await extractTextFromPDF(file);
      if (!pdfText || pdfText.length < 50) {
        throw new Error("Gagal membaca teks dari PDF atau teks terlalu pendek.");
      }

      setStatusText("AI sedang menganalisis struktur jurnal...");
      
      const prompt = `
Anda adalah AI penganalisis struktur jurnal akademik.
Tugas Anda adalah membaca pedoman/template jurnal di bawah ini dan mengekstrak struktur penulisannya.

ATURAN KELUARAN:
- Tuliskan section jurnal utama saja, bagian seperti identitas jurnal, daftar isi, atau bagian administratif lainnya tidak perlu dimasukkan.
- KEMBALIKAN HANYA SEBUAH JSON ARRAY, TANPA MARKDOWN FENCE, TANPA TEKS LAIN.
- Setiap elemen array harus berupa objek dengan format:
  {
    "key": "sec_1", // selalu mulai dari sec_1, sec_2, dst.
    "label": "Nama Bagian", // Contoh: "Pendahuluan", "Kajian Pustaka", "Metode"
    "promptContext": "Pedoman singkat penulisan untuk bagian ini berdasarkan panduan jurnal." // Contoh: "Maksimal 500 kata, berisi latar belakang masalah dan state of the art."
  }
- Jika panduan jurnal tidak eksplisit menyebutkan bagian, gunakan pendekatan standar (IMRAD).

TEKS PANDUAN JURNAL:
${pdfText.substring(0, 30000)} // Potong teks agar tidak melebihi token
      `.trim();

      const result = await generateWorkspaceChapter({
        prompt,
        group: "group_3",
        model: "gemini-2.5-flash",
        temperature: 0.2, // Rendah agar konsisten
      });

      let jsonMatch = result.text.trim();
      if (jsonMatch.startsWith("```json")) {
         jsonMatch = jsonMatch.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      const parsedSections = JSON.parse(jsonMatch);
      if (!Array.isArray(parsedSections) || parsedSections.length === 0) {
        throw new Error("Struktur yang dikembalikan AI tidak valid.");
      }

      setSections(parsedSections);
      setStep(3);
    } catch (err) {
      console.error("Gagal memproses template:", err);
      setError(err.message || "Gagal memproses template. Coba opsi standar IMRAD.");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  const useImradTemplate = () => {
    setSections(JURNAL_IMRAD_TEMPLATE);
    setStep(3);
  };

  // Step 3: Review & Create
  const handleSectionChange = (index, field, value) => {
    const updated = [...sections];
    updated[index][field] = value;
    setSections(updated);
  };

  const removeSection = (index) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated.map((sec, i) => ({ ...sec, key: `sec_${i + 1}` })));
  };

  const addSection = () => {
    const key = `sec_${sections.length + 1}`;
    setSections([...sections, { key, label: "Bagian Baru", promptContext: "Isi pedoman bagian ini." }]);
  };

  const finalizeWorkspace = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const payload = createWorkspacePayload({
        userId: user.uid,
        type: "jurnal",
        title: formData.title,
        topic: formData.topic,
      });

      // Inject dynamic content placeholders
      const dynamicContent = {};
      sections.forEach((sec) => {
        dynamicContent[sec.key] = "";
      });

      const id = crypto.randomUUID();
      await d1Request("workspaces", {
        method: "POST",
        body: {
          id,
          title: formData.title,
          description: formData.topic,
          type: "jurnal",
          status: "Draft",
          topic: formData.topic,
          journalSections: JSON.stringify(sections),
        }
      });
      
      router.push(`/dashboard/jurnal/edit?id=${id}`);
    } catch (err) {
      console.error("Gagal membuat workspace jurnal:", err);
      setError(err.message || "Gagal membuat workspace.");
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: "1rem" }}>
      <div style={{ maxWidth: "700px", margin: "2rem auto" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <Link href="/dashboard" className="btn btn-ghost" style={{ padding: "0.5rem" }}>
            <PremiumIcon name="arrowLeft" size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Buat Workspace Jurnal</h1>
            <p className="text-muted" style={{ margin: 0 }}>Step {step} of 3</p>
          </div>
        </div>

        {error && (
          <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "10px", marginBottom: "1.5rem", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PremiumIcon name="alertCircle" size={18} />
            {error}
          </div>
        )}

        <div className="glass-panel" style={{ padding: "2rem" }}>
          {step === 1 && (
            <form onSubmit={handleInfoSubmit} className="animate-fade-in">
              <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>1. Informasi Jurnal</h2>
              
              <div className="form-group">
                <label className="form-label">Judul Artikel Jurnal</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Contoh: Pengaruh Implementasi AI pada Pembelajaran..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Latar Belakang / Topik Utama</label>
                <textarea 
                  className="form-input" 
                  placeholder="Jelaskan secara singkat topik jurnal Anda untuk memberikan konteks pada AI Writer..."
                  rows={4}
                  value={formData.topic}
                  onChange={e => setFormData({...formData, topic: e.target.value})}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem" }}>
                <button type="submit" className="btn btn-primary">
                  Selanjutnya <PremiumIcon name="arrowRight" size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>2. Template Jurnal</h2>
              <p className="text-muted" style={{ marginBottom: "2rem", lineHeight: 1.6 }}>
                Unggah panduan/template jurnal (dalam format PDF). Sistem AI kami akan membaca struktur dan instruksi penulisannya untuk menyesuaikan Workspace Anda.
              </p>

              <div 
                style={{ 
                  border: "2px dashed var(--border)", 
                  borderRadius: "12px", 
                  padding: "3rem 1.5rem", 
                  textAlign: "center",
                  backgroundColor: "var(--surface)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf" 
                  style={{ display: "none" }} 
                />
                <PremiumIcon name="fileOutput" size={48} className="text-primary" style={{ margin: "0 auto 1rem" }} />
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                  {file ? file.name : "Klik untuk unggah PDF Template"}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Maksimal 10MB"}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", gap: "1rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={loading}>
                  <PremiumIcon name="arrowLeft" size={16} /> Kembali
                </button>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button type="button" className="btn btn-outline" onClick={useImradTemplate} disabled={loading}>
                    Gunakan Standar IMRAD
                  </button>
                  <button type="button" className="btn btn-primary" onClick={processTemplate} disabled={!file || loading}>
                    {loading ? (
                      <><LoadingSpinner size={16} className="text-white" /> {statusText || "Memproses..."}</>
                    ) : (
                      <><PremiumIcon name="sparkles" size={16} /> Ekstrak Struktur</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>3. Review Struktur Jurnal</h2>
              <p className="text-muted" style={{ marginBottom: "2rem", lineHeight: 1.6 }}>
                Berikut adalah struktur yang berhasil diekstrak. Anda bisa merapikan nama bagian dan panduannya sebelum membuat workspace.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                {sections.map((section, idx) => (
                  <div key={section.key} style={{ padding: "1rem", backgroundColor: "var(--surface)", borderRadius: "10px", border: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>Nama Bagian</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: "0.5rem", fontSize: "0.9rem" }}
                          value={section.label} 
                          onChange={(e) => handleSectionChange(idx, "label", e.target.value)} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "block" }}>Konteks / Pedoman Penulisan (Untuk AI)</label>
                        <textarea 
                          className="form-input" 
                          style={{ padding: "0.5rem", fontSize: "0.85rem" }}
                          rows={2}
                          value={section.promptContext} 
                          onChange={(e) => handleSectionChange(idx, "promptContext", e.target.value)} 
                        />
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost" style={{ padding: "0.5rem", color: "var(--danger)" }} onClick={() => removeSection(idx)}>
                      <PremiumIcon name="trash" size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
                <button type="button" className="btn btn-outline" onClick={addSection}>
                  <PremiumIcon name="plus" size={16} /> Tambah Bagian
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)} disabled={loading}>
                  <PremiumIcon name="arrowLeft" size={16} /> Kembali
                </button>
                <button type="button" className="btn btn-primary" onClick={finalizeWorkspace} disabled={loading || sections.length === 0}>
                  {loading ? (
                    <><LoadingSpinner size={16} className="text-white" /> Membuat Workspace...</>
                  ) : (
                    <><PremiumIcon name="check" size={16} /> Buat Workspace Sekarang</>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
