"use client";

import { useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function ReferenceManager({ workspaceId, onClose }) {
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showDataDashboard, setShowDataDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState("jurnal");
  const [journals, setJournals] = useState([
    // Mock data for initial UI
    { id: "1", title: "Implementasi Artificial Intelligence dalam Pendidikan", author: "Budi, dkk.", year: 2023, selected: false },
    { id: "2", title: "Pengaruh Teknologi LLM Terhadap Kinerja Mahasiswa", author: "Susi Susanti", year: 2024, selected: false },
  ]);

  const [citationStyle, setCitationStyle] = useState("APA");

  const toggleSelectJournal = (id) => {
    setJournals(journals.map(j => j.id === id ? { ...j, selected: !j.selected } : j));
  };

  const handleExportBibtex = () => {
    const selected = journals.filter(j => j.selected);
    if (selected.length === 0) {
      alert("Pilih minimal satu jurnal untuk diekspor!");
      return;
    }
    alert(`File .bib berhasil dibuat untuk ${selected.length} jurnal dan siap diimpor ke Mendeley! (Mock)`);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      alert(`File "${e.target.files[0].name}" siap diunggah & diekstrak full-textnya untuk Context Caching Gemini!`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "slideInRight 0.3s ease" }}>
      {/* Drawer Header */}
      <div style={{ 
        padding: "0.8rem 1rem", 
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        backgroundColor: "var(--surface)", flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PremiumIcon name="bookMarked" size={18} className="text-primary" />
          <h3 style={{ fontSize: "0.95rem", margin: 0, fontWeight: 600 }}>Reference Hub</h3>
        </div>
        <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.25rem", color: "var(--text-muted)" }}>
          <PremiumIcon name="x" size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)", flexShrink: 0 }}>
        {["jurnal", "catatan", "data"].map((tabLabel) => (
          <button
            key={tabLabel}
            onClick={() => setActiveTab(tabLabel)}
            style={{
              flex: 1, padding: "0.6rem 0", fontSize: "0.8rem", fontWeight: 600,
              textTransform: "capitalize", border: "none", cursor: "pointer",
              backgroundColor: "transparent",
              color: activeTab === tabLabel ? "var(--primary)" : "var(--text-muted)",
              borderBottom: activeTab === tabLabel ? "2px solid var(--primary)" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            {tabLabel}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {activeTab === "jurnal" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* Upload Area */}
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "1.5rem 1rem", border: "2px dashed var(--border)", borderRadius: "8px",
              cursor: "pointer", backgroundColor: "var(--surface-hover)", gap: "0.5rem", textAlign: "center"
            }}>
              <PremiumIcon name="uploadCloud" size={24} className="text-muted" />
              <span style={{ fontSize: "0.80rem", color: "var(--text-muted)" }}>Upload Jurnal (PDF)</span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", opacity: 0.7 }}>File akan diekstrak untuk Gemini Context</span>
              <input type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>

            {/* Citations Control */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
               <select 
                 value={citationStyle} 
                 onChange={(e) => setCitationStyle(e.target.value)}
                 style={{ 
                   fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "4px", 
                   backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-main)", outline: "none"
                 }}
               >
                 <option value="APA">Style: APA (American Psych.)</option>
                 <option value="IEEE">Style: IEEE</option>
               </select>

               <button 
                 onClick={handleExportBibtex}
                 className="btn btn-outline" 
                 style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", gap: "0.25rem" }}
                 title="Ekspor ke .bib untuk Mendeley"
               >
                 <PremiumIcon name="download" size={12} /> BibTeX
               </button>
            </div>

            {/* List Jurnal */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {journals.map(j => (
                <div key={j.id} className="glass-panel" style={{ 
                  padding: "0.75rem", borderRadius: "8px", 
                  border: j.selected ? "1px solid var(--primary)" : "1px solid var(--border)",
                  display: "flex", gap: "0.5rem", alignItems: "flex-start", cursor: "pointer", transition: "all 0.2s"
                }} onClick={() => toggleSelectJournal(j.id)}>
                  
                  <input type="checkbox" checked={j.selected} readOnly style={{ marginTop: "4px", cursor: "pointer" }} />
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: "0.8rem", margin: "0 0 0.2rem 0", lineHeight: "1.3" }}>{j.title}</h4>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0 }}>
                      {j.author} ({j.year})
                    </p>
                  </div>
                  
                  <button className="btn btn-ghost" style={{ padding: "0.2rem" }} title="Lihat Abstract">
                    <PremiumIcon name="chevronRight" size={14} className="text-muted" />
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {activeTab === "catatan" && (
          <div className="animate-fade-in" style={{ textAlign: "center", paddingTop: "2rem" }}>
            <PremiumIcon name="edit3" size={32} className="text-muted" style={{ margin: "0 auto 1rem" }}/>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Tulis catatan ide atau insight penting di sini.</p>
            <button className="btn btn-primary mt-2" style={{ fontSize: "0.8rem", margin: "0 auto" }}>+ Tambah Catatan</button>
          </div>
        )}

        {activeTab === "data" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            <div className="glass-panel p-5 text-center" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
               <PremiumIcon name="database" size={36} className="text-muted opacity-50" />
               <h4 style={{ margin: 0 }}>Data & Kuesioner Telah Dipindah!</h4>
               <p className="text-muted text-xs m-0 mb-2">Semua fitur desain Form, Olah Wawancara, dan SPSS dipusatkan pada opsi <strong>"Manajemen Data"</strong> (klik di Menu Bar Atas, sebelah kiri tombol Referensi).</p>
               <button className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }} onClick={onClose}>
                 Tutup Referensi & Buka DataHub
               </button>
            </div>

            <div className="glass-panel p-5">
               <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>Manual Input (Ringkasan Hasil)</h4>
               <p className="text-muted text-xs mb-3">Jika Anda telah melakukan analisis di DataHub atau dari software luar (SPSS/PLS), masukkan nilai jadinya di sini agar bisa ditarik AI saat menulis Bab 4.</p>
               <textarea 
                 className="form-input" 
                 rows={6} 
                 placeholder="Contoh:\n- Validitas: Pearson r (0.81) Valid.\n- Reliabilitas: Alpha 0.89.\n- Hasil Wawancara: Responden mayoritas puas dengan kecepatan layanan." 
                 style={{ fontSize: "0.8rem" }}
               />
               <button className="btn btn-primary" style={{ marginTop: "0.5rem", width: "100%", fontSize: "0.8rem" }}>Simpan Data Internal</button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
