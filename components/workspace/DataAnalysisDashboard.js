"use client";

import { useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function DataAnalysisDashboard({ workspaceId, onClose }) {
  const [activeTab, setActiveTab] = useState("kuantitatif");
  const [showReport, setShowReport] = useState(false);

  // Mock data for table
  const mockHeaders = ["Timestamp", "Nama Lengkap", "P1 (Skala 1-5)", "P2 (Skala 1-5)", "P3 (Skala 1-5)"];
  const mockScores = [
    [4, 5, 4],
    [5, 5, 5],
    [3, 4, 3],
    [4, 4, 4],
    [5, 3, 4],
    [4, 4, 5],
    [3, 3, 3],
    [5, 4, 5],
    [4, 5, 5],
    [2, 3, 2]
  ];
  const mockData = mockScores.map((scores, i) => [`2024-05-${12 + (i%3)} 10:0${i}`, `Responden ${i+1}`, ...scores.map(String)]);

  const handleExportExcel = () => {
    alert("Data berhasil diekspor ke format .xlsx!");
  };

  // ---- Mathematical Calculation (Validitas & Reliabilitas) ----
  const calculateStats = () => {
    const k = mockScores[0].length; // num items
    const totals = mockScores.map(row => row.reduce((a,b) => a+b, 0));
    const meanTotal = totals.reduce((a,b) => a+b, 0) / totals.length;
    const varTotal = totals.reduce((acc, val) => acc + Math.pow(val - meanTotal, 2), 0) / (totals.length - 1);

    const itemVars = [];
    const itemCorrelations = [];

    for (let c = 0; c < k; c++) {
      const colScores = mockScores.map(row => row[c]);
      const meanCol = colScores.reduce((a,b) => a+b, 0) / colScores.length;
      const varCol = colScores.reduce((acc, val) => acc + Math.pow(val - meanCol, 2), 0) / (colScores.length - 1);
      itemVars.push(varCol);

      // Pearson r (Item vs Total)
      let sumProduct = 0, sumSqX = 0, sumSqY = 0;
      for (let r = 0; r < colScores.length; r++) {
        const dx = colScores[r] - meanCol;
        const dy = totals[r] - meanTotal;
        sumProduct += dx * dy;
        sumSqX += dx * dx;
        sumSqY += dy * dy;
      }
      itemCorrelations.push(sumProduct / Math.sqrt(sumSqX * sumSqY));
    }

    const sumItemVars = itemVars.reduce((a,b) => a+b, 0);
    const alpha = (k / (k - 1)) * (1 - (sumItemVars / varTotal));

    return { alpha: alpha.toFixed(3), itemCorrelations: itemCorrelations.map(r => r.toFixed(3)) };
  };

  const handleMathAnalysis = () => {
    setShowReport(true);
  };

  const handleAiCoding = () => {
    alert("AI sedang membaca sekumpulan transkrip wawancara Anda, membuat tema-tema (Thematic Analysis / Coding), dan merangkum kutipan responden untuk dimasukkan ke Bab IV.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-5xl h-[85vh] flex flex-col rounded-xl overflow-hidden shadow-2xl bg-[var(--background)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <PremiumIcon name="pieChart" size={24} className="text-primary" />
            <h2 className="text-lg font-semibold m-0">Dashboard Analisis Lapangan</h2>
          </div>
          
          <div className="flex bg-[var(--surface-hover)] rounded-lg border border-[var(--border)] p-1">
            <button 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'kuantitatif' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              onClick={() => setActiveTab("kuantitatif")}
            >
              Kuesioner (Kuanti)
            </button>
            <button 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'kualitatif' ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
              onClick={() => setActiveTab("kualitatif")}
            >
              Wawancara (Kuali)
            </button>
          </div>

          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "0.5rem" }}>
             <PremiumIcon name="x" size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[rgba(0,0,0,0.02)]">
          
          {activeTab === "kuantitatif" && (
            <div className="flex flex-col gap-6 animate-fade-in h-full">
               
               {/* Toolbar Kuanti */}
               <div className="flex justify-between items-center bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                 <div>
                   <h3 className="font-semibold m-0 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                     10 Respons Terkumpul
                   </h3>
                   <p className="text-xs text-muted m-0 mt-1">Data dari Kuesioner (Variabel X dan Y).</p>
                 </div>
                 <div className="flex gap-3">
                   <button className="btn btn-outline flex items-center gap-2 !text-sm" onClick={handleExportExcel}>
                     <PremiumIcon name="downloadCloud" size={16} className="text-green-600" /> Export Excel
                   </button>
                   <button className="btn btn-primary flex items-center gap-2 !text-sm" onClick={handleMathAnalysis}>
                     <PremiumIcon name="barChart" size={16} /> Uji Validitas & Reliabilitas
                   </button>
                 </div>
               </div>

               {showReport ? (
                 <div className="flex-1 bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] shadow-sm overflow-y-auto animate-fade-in">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h3 className="font-semibold text-lg m-0 text-[var(--primary)]">Hasil Uji Statistik Instrumen</h3>
                      <button className="btn btn-ghost !p-2" onClick={() => setShowReport(false)}>Tutup Laporan</button>
                    </div>
                    
                    <div style={{ padding: "1rem", backgroundColor: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px dashed var(--border)", marginBottom: "1.5rem" }}>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#B45309", fontWeight: 500 }}>
                        <PremiumIcon name="alertCircle" size={16} style={{ display: "inline", marginBottom: "2px", marginRight: "4px" }} />
                        <strong>Disclaimer:</strong> Perhitungan matematis JS ini menggunakan rumus Pearson Product Moment & Cronbach Alpha. Untuk keperluan bab resmi, pertimbangkan mengekspor data ke Excel dan verifikasi dengan <strong>SPSS</strong> atau <strong>SMART PLS</strong> agar format output lebih komprehensif.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                       {/* Reliabilitas */}
                       <div className="glass-panel p-5">
                          <h4 style={{ margin: "0 0 1rem 0" }}>Uji Reliabilitas (Cronbach's Alpha)</h4>
                          <div style={{ fontSize: "2.5rem", fontWeight: 700, color: calculateStats().alpha > 0.6 ? 'var(--success)' : 'var(--danger)' }}>
                            {calculateStats().alpha}
                          </div>
                          <p style={{ fontSize: "0.8frem", margin: "0.5rem 0 0 0", color: "var(--text-muted)" }}>
                            N of Items = 3 <br/>
                            {calculateStats().alpha > 0.6 ? 
                              <span className="text-success font-medium">Berdasarkan kaidah Nunnally (1994), nilai &gt; 0.6 dapat dikatakan Reliabel.</span> : 
                              <span className="text-danger font-medium">Nilai di bawah 0.6 mengindikasikan instrumen kurang konsisten.</span>}
                          </p>
                       </div>

                       {/* Validitas */}
                       <div className="glass-panel p-5">
                          <h4 style={{ margin: "0 0 1rem 0" }}>Uji Validitas (Item-Total Correlation / Pearson r)</h4>
                          <table style={{ width: "100%", fontSize: "0.85rem", textAlign: "left", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                <th style={{ padding: "0.5rem 0" }}>Item Pertanyaan</th>
                                <th style={{ padding: "0.5rem 0" }}>Nilai r Hitung</th>
                                <th style={{ padding: "0.5rem 0" }}>Status (Asumsi r-tabel 0.3)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculateStats().itemCorrelations.map((val, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                  <td style={{ padding: "0.5rem 0" }}>P{idx+1}</td>
                                  <td style={{ padding: "0.5rem 0", fontWeight: 600 }}>{val}</td>
                                  <td style={{ padding: "0.5rem 0" }}>
                                    {val > 0.3 ? <span style={{ color: "var(--success)" }}>Valid</span> : <span style={{ color: "var(--danger)" }}>Gugur</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col">
                   <div className="overflow-x-auto flex-1">
                     <table className="w-full text-left text-sm border-collapse">
                       <thead>
                         <tr className="bg-[var(--surface-hover)] text-[var(--text-muted)] border-b border-[var(--border)]">
                           {mockHeaders.map((h, i) => <th key={i} className="p-3 font-semibold whitespace-nowrap">{h}</th>)}
                         </tr>
                       </thead>
                       <tbody>
                         {mockData.map((row, rIdx) => (
                           <tr key={rIdx} className="border-b border-[var(--border)] last:border-0 hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                             {row.map((cell, cIdx) => <td key={cIdx} className="p-3 text-[var(--text-main)]">{cell}</td>)}
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <div className="p-3 bg-[var(--surface-hover)] border-t border-[var(--border)] flex justify-between items-center text-xs text-muted">
                      <span>Menampilkan 10 data dummy.</span>
                      <button className="hover:underline">Lihat semua data &rarr;</button>
                   </div>
                 </div>
               )}
            </div>
          )}

          {activeTab === "kualitatif" && (
            <div className="flex flex-col gap-6 animate-fade-in h-full">
               
               {/* Toolbar Kuali */}
               <div className="flex justify-between items-center bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
                 <div>
                   <h3 className="font-semibold m-0 flex items-center gap-2">
                     <PremiumIcon name="mic" size={18} className="text-blue-500" />
                     Repositori Transkrip Wawancara
                   </h3>
                   <p className="text-xs text-muted m-0 mt-1">Unggah rekaman/transkrip manual untuk dianalisa maknanya.</p>
                 </div>
                 <div className="flex gap-3">
                   <button className="btn btn-primary flex items-center gap-2 !text-sm" onClick={handleAiCoding}>
                     <PremiumIcon name="sparkles" size={16} /> Thematic Analysis (Bab IV)
                   </button>
                 </div>
               </div>

               {/* Transcript Items */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-5 rounded-xl border border-[var(--border)] shadow-sm bg-[var(--surface)] cursor-pointer hover:border-[var(--primary)] transition-colors">
                     <div className="flex justify-between items-start mb-3">
                       <h4 className="font-medium m-0 flex items-center gap-2"><PremiumIcon name="fileText" size={16} className="text-muted"/> Informan 1 (Kepala Sekolah)</h4>
                       <span className="text-xs bg-[var(--surface-hover)] px-2 py-1 rounded text-muted">12 Mei 2024</span>
                     </div>
                     <p className="text-sm text-muted line-clamp-3">
                       "Jadi pada awalnya penerapan teknologi ini memang mengalami hambatan, terutama dari sisi adaptasi guru-guru senior. Namun pelan-pelan dengan pelatihan intensif..."
                     </p>
                  </div>
                  
                  <div className="glass-panel p-5 rounded-xl border border-dashed border-[var(--border)] shadow-sm bg-[var(--surface-hover)] cursor-pointer hover:border-[var(--primary-light)] transition-colors flex flex-col justify-center items-center text-center text-muted gap-2 min-h-[140px]">
                     <PremiumIcon name="plus" size={24} />
                     <span className="text-sm font-medium">Unggah Transkrip Baru</span>
                  </div>
               </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
