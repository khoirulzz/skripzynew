"use client";

import { useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function ChapterAiAssistant({ activeChapter, workspaceContext, onInsertContent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState("");
  
  // Wizard states
  const [wizardMode, setWizardMode] = useState(null);
  const [methodData, setMethodData] = useState({ jenis: "Kuantitatif", lokasi: "", populasi: "Seratus Karyawan", pengumpulan: "Kuesioner" });
  const [bab4Data, setBab4Data] = useState({ jenis: "kuantitatif", temuanUtama: "" });
  const [bab2Data, setBab2Data] = useState({ varX: "", varY: "", sumber: "jurnal_upload", mode: "outline" });

  // activeChapter index: 0=Bab1, 1=Bab2, 2=Bab3, 3=Bab4, 4=Bab5

  const handleGenerate = (type, mockResultText) => {
    setGenerationType(type);
    setIsGenerating(true);
    
    // Simulate AI generation delay
    setTimeout(() => {
      onInsertContent(mockResultText);
      setIsGenerating(false);
      setIsOpen(false);
    }, 4000);
  };

  const getChapterActions = () => {
    switch(activeChapter) {
      case 0:
        return [
          {
            title: "Buat Latar Belakang Lengkap",
            desc: "Menyusun problem statement dan landasan masalah berdasarkan referensi jurnal terupload.",
            icon: "sparkles",
            action: () => handleGenerate("Bab 1 Lengkap", "<h2>1.1 Latar Belakang</h2><p>Menurut perkembangan teknologi saat ini, penerapan Artificial Intelligence (AI) dalam pendidikan telah memicu transformasi besar (Budi dkk., 2023). ... [Teks Hasil AI]</p>"),
            isDeepResearch: false
          }
        ];
      case 1:
        return [
          {
            title: "Wizard: Kajian Pustaka & DeepResearch",
            desc: "Ekstrak variabel untuk menyusun outline teori atau menginisiasi DeepResearch dari jurnal terupload.",
            icon: "brainCircuit",
            action: () => setWizardMode("kajianpustaka"),
            isDeepResearch: true
          }
        ];
      case 2:
        return [
          {
            title: "Wizard: Susun Metode Penelitian",
            desc: "Konfigurasi populasi, sampel, teknik pengumpulan & alat analisis.",
            icon: "box",
            action: () => setWizardMode("metodologi"),
            isDeepResearch: false
          }
        ];
      case 3:
        return [
          {
            title: "Wizard: Analisis & Pembahasan",
            desc: "Tarik insight dari kuesioner/wawancara dan konversi jadi narasi ilmiah Bab IV.",
            icon: "network",
            action: () => setWizardMode("pembahasan"),
            isDeepResearch: false
          }
        ];
      case 4:
         return [
           {
             title: "Buat Kesimpulan & Saran",
             desc: "Tarik simpulan dari hasil Bab 4 untuk menjawab rumusan masalah.",
             icon: "checkCircle",
             action: () => handleGenerate("Bab 5 Lengkap", "<h2>5.1 Kesimpulan</h2><p>Penelitian ini menyimpulkan bahwa...</p>"),
             isDeepResearch: false
           }
         ];
      default:
        return [];
    }
  };

  const actions = getChapterActions();

  if (actions.length === 0) return null;

  return (
    <div className="absolute right-6 top-1/4 z-[40]">
      {/* Floating Button Button */}
      {!isOpen && !isGenerating && (
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary)] text-white shadow-[0_4px_20px_rgba(79,70,229,0.4)] hover:scale-110 transition-transform animate-bounce"
          title="AI Co-Writer"
        >
          <PremiumIcon name="sparkles" size={24} />
        </button>
      )}

      {/* Generating State Overlay */}
      {isGenerating && (
        <div className="glass-panel p-4 rounded-xl shadow-lg border border-[var(--primary)] flex flex-col items-center gap-3 w-56 animate-fade-in bg-[var(--surface)]">
           <PremiumIcon name="loader" size={28} className="text-primary animate-spin" />
           <div className="text-sm font-medium text-center text-[var(--text-main)]">
              AI sedang menyusun<br/> <span className="text-[var(--primary)]">{generationType}</span>...
           </div>
           {generationType.includes("DeepResearch") && (
             <div className="text-xs text-[var(--text-muted)] text-center mt-1">Mengumpulkan data dari Jurnal terupload... Ini akan memakan waktu sejenak.</div>
           )}
        </div>
      )}

      {/* Open Menu State */}
      {isOpen && !isGenerating && !wizardMode && (
        <div className="glass-panel p-2 rounded-xl shadow-2xl border border-[var(--border)] w-80 flex flex-col gap-2 animate-fade-in bg-[var(--surface)]">
          <div className="flex justify-between items-center p-2 border-b border-[var(--border)]">
             <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary)] flex items-center gap-1.5 focus:outline-none">
               <PremiumIcon name="sparkles" size={14} /> AI Co-Writer (Bab {["I", "II", "III", "IV", "V"][activeChapter] || ""})
             </div>
             <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
               <PremiumIcon name="x" size={16} />
             </button>
          </div>
          
          <div className="flex flex-col gap-1 mt-2">
            {actions.map((act, i) => (
              <button 
                key={i}
                onClick={act.action}
                className="btn btn-ghost !justify-start !p-3 rounded-lg border border-transparent hover:border-[var(--primary-light)] text-left flex items-start gap-3 w-full group transition-all h-auto"
                style={{ height: 'auto', backgroundColor: act.isDeepResearch ? 'rgba(79,70,229,0.05)' : 'transparent' }}
              >
                 <div className={`mt-0.5 ${act.isDeepResearch ? 'p-1.5 bg-[var(--primary)] text-white rounded-md' : 'text-primary'}`}>
                   <PremiumIcon name={act.icon || "wand"} size={16} />
                 </div>
                 <div className="flex-1">
                   <div className="text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--primary)] leading-tight">{act.title}</div>
                   <div className="text-xs text-[var(--text-muted)] mt-1 whitespace-normal leading-snug">
                     {act.desc}
                   </div>
                   {act.isDeepResearch && (
                     <span className="inline-block mt-2 text-[10px] bg-[rgba(234,179,8,0.15)] text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                       ⚡️ DeepResearch Model
                     </span>
                   )}
                 </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wizard Mode: Metodologi */}
      {isOpen && !isGenerating && wizardMode === "metodologi" && (
        <div className="glass-panel p-4 rounded-xl shadow-2xl border-t-4 border-t-[var(--primary)] border-l-[var(--border)] border-r-[var(--border)] border-b-[var(--border)] w-[340px] flex flex-col gap-3 animate-fade-in bg-[var(--surface)]">
           <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
             <div className="font-semibold text-sm flex items-center gap-2"><PremiumIcon name="box" size={16}/> Wizard Metodologi</div>
             <button onClick={() => setWizardMode(null)} className="text-muted"><PremiumIcon name="x" size={14} /></button>
           </div>

           <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Pendekatan</label>
              <select className="form-input w-full p-2 text-sm" value={methodData.jenis} onChange={(e) => setMethodData({...methodData, jenis: e.target.value})}>
                 <option value="Kuantitatif">Kuantitatif (Survei)</option>
                 <option value="Kualitatif">Kualitatif (Studi Kasus)</option>
                 <option value="R&D">Research & Development</option>
              </select>
           </div>
           <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Setting / Lokasi</label>
              <input type="text" className="form-input w-full p-2 text-sm" placeholder="Contoh: PT. ABC Jakarta" value={methodData.lokasi} onChange={(e) => setMethodData({...methodData, lokasi: e.target.value})} />
           </div>
           <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Populasi & Sampel</label>
              <input type="text" className="form-input w-full p-2 text-sm" placeholder="Contoh: 150 Siswa Kelas X" value={methodData.populasi} onChange={(e) => setMethodData({...methodData, populasi: e.target.value})} />
           </div>
           <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Instrumen Utama</label>
              <input type="text" className="form-input w-full p-2 text-sm" placeholder="Contoh: Kuesioner Skala Likert" value={methodData.pengumpulan} onChange={(e) => setMethodData({...methodData, pengumpulan: e.target.value})} />
           </div>

           <button className="btn btn-primary mt-2 w-full flex items-center justify-center gap-2" onClick={() => {
              const html = `
                <h2>3.1 Desain Penelitian</h2>
                <p>Pendekatan yang digunakan dalam penelitian ini adalah <b>pendekatan ${methodData.jenis.toLowerCase()}</b>. Penggunaan metode ini bertujuan untuk mendapatkan gambaran komprehensif mengenai fenomena yang diukur.</p>
                <h2>3.2 Setting Penelitian</h2>
                <p>Penelitian ini dilangsungkan di <b>${methodData.lokasi || "lokasi spesifik"}</b> dengan pertimbangan kemudahan akses dan urgensi masalah.</p>
                <h2>3.3 Populasi dan Sampel</h2>
                <p>Populasi dalam riset ini mencakup target yakni <b>${methodData.populasi}</b>. Teknik sampling disesuaikan agar mampu merepresentasikan karakteristik umum populasi tersebut.</p>
                <h2>3.4 Teknik Pengumpulan Data</h2>
                <p>Data primer dikumpulkan utamanya menggunakan <b>${methodData.pengumpulan}</b> yang telah melalui uji standar validitas.</p>
              `;
              setWizardMode(null);
              handleGenerate("Draft Bab 3 (Narasi Penuh)", html);
           }}>
              <PremiumIcon name="sparkles" size={16} /> Mulai Generate Narasi AI
           </button>
        </div>
      )}

      {/* Wizard Mode: Pembahasan Bab 4 */}
      {isOpen && !isGenerating && wizardMode === "pembahasan" && (
        <div className="glass-panel p-4 rounded-xl shadow-2xl border-t-4 border-t-[var(--success)] border-l-[var(--border)] border-r-[var(--border)] border-b-[var(--border)] w-[340px] flex flex-col gap-3 animate-fade-in bg-[var(--surface)]">
           <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
             <div className="font-semibold text-sm flex items-center gap-2"><PremiumIcon name="barChart" size={16}/> Wizard Ekstraksi Data</div>
             <button onClick={() => setWizardMode(null)} className="text-muted"><PremiumIcon name="x" size={14} /></button>
           </div>

           <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Sumber Data</label>
              <select className="form-input w-full p-2 text-sm" value={bab4Data.jenis} onChange={(e) => setBab4Data({...bab4Data, jenis: e.target.value})}>
                 <option value="kuantitatif">📊 Hasil Kuesioner (Kuantitatif)</option>
                 <option value="kualitatif">🎤 Transkrip Wawancara (Kualitatif)</option>
              </select>
           </div>
           
           <div>
              <label className="text-xs font-semibold text-muted mb-1 block">Poin Temuan Utama (Insight)</label>
              <textarea 
                className="form-input w-full p-2 text-sm" 
                rows={3} 
                placeholder={bab4Data.jenis === "kuantitatif" ? "Cth: C. Alpha 0.82 (Reliabel). Hipotesis didukung..." : "Cth: Informan puas dengan kecepatan pelayanan..."} 
                value={bab4Data.temuanUtama} 
                onChange={(e) => setBab4Data({...bab4Data, temuanUtama: e.target.value})} 
              />
           </div>
           
           <div className="p-2 mb-1 bg-[rgba(16,185,129,0.1)] border border-[var(--border)] rounded-lg text-[0.7rem] text-emerald-600 flex items-start gap-2">
             <PremiumIcon name="checkCircle" size={14} className="mt-0.5 flex-shrink-0" />
             <span>Sistem akan mendeteksi temuan manual ini atau membaca tabel DataHub, lalu mengekstraknya menjadi narasi paragraf penuh Bab IV.</span>
           </div>

           <button className="btn btn-primary mt-1 w-full flex items-center justify-center gap-2" style={{ backgroundColor: "var(--success)" }} onClick={() => {
              const baseHtml = bab4Data.jenis === "kuantitatif" 
                ? `<h2>4.1 Penyajian Data Demografis</h2><p>Gambaran umum sampel data diperoleh melalui kuesioner.</p><h2>4.2 Hasil Uji Instrumen (Validitas & Reliabilitas)</h2><p>Berdasarkan analisis statistik yang dijalankan di platform, terbukti nilai indikator memenuhi standar kelayakan ukur.</p><h2>4.3 Pengujian Hipotesis dan Analisis Temuan</h2><p>Uji utama mengarah pada temuan bahwa: <b>${bab4Data.temuanUtama || "Mayoritas responden setuju dengan probabilitas yang sangat meyakinkan."}</b>.</p><h2>4.4 Pembahasan</h2><p>Secara teori, fenomena ini dapat dijelaskan...</p>`
                : `<h2>4.1 Paparan Hasil Wawancara Mendalam</h2><p>Transkrip hasil interaksi dikodekan ke dalam beberapa tema penting.</p><h2>4.2 Sintesis Tematik</h2><p>Kategori paling signifikan dari informan menunjukkan: <b>${bab4Data.temuanUtama || "Konsistensi visi organisasi"}</b>.</p><h2>4.3 Pembahasan Kontekstual</h2><p>Temuan kualitatif ini mengkonfirmasi dan menjembatani gap observasi yang ada pada Bab sebelumnya.</p>`;
              
              setWizardMode(null);
              handleGenerate("Sintesis Bab 4 (" + bab4Data.jenis + ")", baseHtml);
           }}>
              <PremiumIcon name="sparkles" size={16} /> Tarik Data & Auto-Generate
           </button>
        </div>
      )}

     {/* Wizard Mode: Bab 2 Kajian Pustaka */}
     {isOpen && !isGenerating && wizardMode === "kajianpustaka" && (
       <div className="glass-panel p-4 rounded-xl shadow-2xl border-t-4 border-t-[var(--primary)] border-l-[var(--border)] border-r-[var(--border)] border-b-[var(--border)] w-[340px] flex flex-col gap-3 animate-fade-in bg-[var(--surface)]">
          <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
            <div className="font-semibold text-sm flex items-center gap-2"><PremiumIcon name="bookOpen" size={16}/> Wizard Kajian Pustaka</div>
            <button onClick={() => setWizardMode(null)} className="text-muted"><PremiumIcon name="x" size={14} /></button>
          </div>

          <div>
             <label className="text-xs font-semibold text-muted mb-1 block">Variabel Bebas (X)</label>
             <input type="text" className="form-input w-full p-2 text-sm" placeholder="Contoh: Kualitas Pelayanan" value={bab2Data.varX} onChange={(e) => setBab2Data({...bab2Data, varX: e.target.value})} />
          </div>
          <div>
             <label className="text-xs font-semibold text-muted mb-1 block">Variabel Terikat (Y)</label>
             <input type="text" className="form-input w-full p-2 text-sm" placeholder="Contoh: Kepuasan Pelanggan" value={bab2Data.varY} onChange={(e) => setBab2Data({...bab2Data, varY: e.target.value})} />
          </div>

          <div>
             <label className="text-xs font-semibold text-muted mb-1 block">Sumber Referensi Utama</label>
             <select className="form-input w-full p-2 text-sm" value={bab2Data.sumber} onChange={(e) => setBab2Data({...bab2Data, sumber: e.target.value})}>
                <option value="jurnal_upload">📚 Jurnal PDF Upload (Reference Hub)</option>
                <option value="sintesis_ai">⚡ Web / Database Eksternal (Gemini)</option>
             </select>
          </div>

          <div className="flex gap-2 w-full mt-3">
            <button className="btn btn-outline flex-1 flex flex-col items-center justify-center p-2 text-xs h-auto gap-1" onClick={() => {
               const html = `<h2>2.1 Tinjauan Pustaka</h2><ul><li>Konsep Dasar <b>${bab2Data.varX || "Variabel X"}</b></li><li>Dimensi dan Pengukuran <b>${bab2Data.varY || "Variabel Y"}</b></li><li>Penyusunan Kerangka Berpikir</li></ul><p><em>*Catatan: Ini adalah outline kerangka yang disarankan oleh AI.</em></p>`;
               setWizardMode(null);
               handleGenerate("Outline Bab 2", html);
            }}>
               <PremiumIcon name="list" size={14} /> Buat Outline
            </button>
            
            <button className="btn btn-primary flex-1 flex flex-col items-center justify-center p-2 text-xs h-auto gap-1" onClick={() => {
               const html = `<h2>2.1 Pengertian ${bab2Data.varX || "Variabel X"}</h2><p>Berdasarkan referensi utama dari ${bab2Data.sumber === "jurnal_upload" ? "Jurnal terupload" : "literatur eksternal"}, ditemukan bahwa variabel ini berfokus pada...</p><h2>2.2 Pengertian ${bab2Data.varY || "Variabel Y"}</h2><p>Konstruksi teori menunjukkan korelasi kuat.</p><h2>2.3 Kerangka Konseptual & Tinjauan Terdahulu</h2><p>Rangkuman <i>DeepResearch</i> menegaskan adanya hipotesis positif di antara kedua variabel...</p>`;
               setWizardMode(null);
               handleGenerate("DeepResearch Bab 2", html);
            }}>
               <PremiumIcon name="brainCircuit" size={14} /> DeepResearch
            </button>
          </div>
       </div>
     )}

    </div>
  );
}
