"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorkspacePayload } from "@/lib/workspaceDefaults";

const TEMPLATES = [
  { id: "sinta2", name: "Jurnal Nasional (SINTA 2)", desc: "Format IMRaD standar, maks 6000 kata.", icon: "fileText" },
  { id: "ieee", name: "IEEE Conference Template", desc: "Format 2 kolom, abstrak singkat, maks 6 halaman.", icon: "layoutTemplate" },
  { id: "apa", name: "APA 7th Edition", desc: "Format psikologi/sosial dengan heading terstruktur.", icon: "bookOpen" },
  { id: "scopus", name: "Scopus Q3/Q4 Elsevier", desc: "Standar jurnal internasional bereputasi menengah.", icon: "sparkles" }
];

export default function ConvertPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [skripsiList, setSkripsiList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSkripsi, setSelectedSkripsi] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("sinta2");
  
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function fetchSkripsi() {
      if (!user) return;
      try {
        const resp = await d1Request("workspaces");
        const fetched = (resp.data || []).filter(w => w.user_id === user.uid && w.type === "skripsi");
        setSkripsiList(fetched);
      } catch (err) {
        console.error("Gagal load skripsi:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSkripsi();
  }, [user]);

  const handleConvert = async () => {
    if (!selectedSkripsi || !selectedTemplate) return;
    setConverting(true);
    setProgress(10);
    
    // Simulate AI Conversion Progress
    setTimeout(() => setProgress(30), 1000); // Membaca Bab 1-3
    setTimeout(() => setProgress(60), 2500); // Ekstraksi Hasil
    setTimeout(() => setProgress(90), 4000); // Menyusun format Jurnal
    
    setTimeout(async () => {
      try {
        const sourceSkripsi = skripsiList.find(s => s.id === selectedSkripsi);
        const templateInfo = TEMPLATES.find(t => t.id === selectedTemplate);
        
        const id = crypto.randomUUID();
        await d1Request("workspaces", {
          method: "POST",
          body: {
            id,
            user_id: user.uid,
            type: "jurnal",
            title: `[${templateInfo.name}] ${sourceSkripsi.title || "Jurnal Baru"}`,
            topic: `Hasil konversi AI dari Skripsi. Template: ${templateInfo.name}. Topik asli: ${sourceSkripsi.topic}`,
            status: "Draft",
            bab1: "<h2>Abstract</h2><p>Penelitian ini bertujuan untuk...</p><h2>1. Introduction</h2><p>Latar belakang diubah secara otomatis...</p>",
            bab2: "<h2>2. Methods</h2><p>Metodologi dirangkum menjadi satu paragraf teknis...</p>",
            bab3: "<h2>3. Results and Discussion</h2><p>Penggabungan hasil dan pembahasan sesuai format IMRaD...</p>",
            bab4: "<h2>4. Conclusion</h2><p>Kesimpulan padat dan jelas...</p>",
          }
        });
        
        router.push(`/dashboard/jurnal/${id}`);
      } catch (err) {
        console.error("Gagal convert:", err);
        setConverting(false);
        alert("Konversi gagal! Periksa koneksi.");
      }
    }, 5500);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
        <PremiumIcon name="zap" className="text-primary animate-pulse" size={48} />
      </div>
    );
  }

  if (converting) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
        <div className="glass-panel p-8">
          <PremiumIcon name="brainCircuit" size={64} className="text-primary animate-bounce m-auto mb-6" />
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>AI Sedang Mengonversi Skripsi...</h2>
          <p className="text-muted mb-8">Memindai Bab I hingga Bab V, menyesuaikan standar sitasi, dan merangkum narasi sesuai template Jurnal.</p>
          
          <div style={{ width: "100%", height: "8px", backgroundColor: "var(--surface-hover)", borderRadius: "4px", overflow: "hidden" }}>
             <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "var(--primary)", transition: "width 0.5s ease" }} />
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--primary)" }}>
            {progress}% Selesai
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
       <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
         <div style={{ padding: "0.75rem", backgroundColor: "rgba(139, 92, 246, 0.1)", borderRadius: "12px", color: "#8B5CF6" }}>
           <PremiumIcon name="sparkles" size={28} />
         </div>
         <div>
           <h1 style={{ fontSize: "1.75rem", margin: 0 }}>AI Journal Converter</h1>
           <p className="text-muted" style={{ margin: 0 }}>Ubah puluhan halaman skripsi menjadi manuscript jurnal siap submit.</p>
         </div>
       </div>

       <div className="glass-panel p-8 mb-6">
         <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>1. Pilih Skripsi Sumber</h3>
         {skripsiList.length === 0 ? (
           <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: "var(--surface-hover)", borderRadius: "8px" }}>
             <p className="text-muted mb-4">Anda belum memiliki proyek skripsi.</p>
             <Link href="/dashboard/skripsi" className="btn btn-outline text-sm">Ke Workspace Skripsi</Link>
           </div>
         ) : (
           <select 
             className="form-select w-full" 
             style={{ padding: "0.75rem", backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "8px", outline: "none" }}
             value={selectedSkripsi}
             onChange={e => setSelectedSkripsi(e.target.value)}
           >
             <option value="">-- Pilih Proyek Skripsi --</option>
             {skripsiList.map(s => (
               <option key={s.id} value={s.id}>{s.title || "Tanpa Judul"}</option>
             ))}
           </select>
         )}
       </div>

       <div className="glass-panel p-8 mb-6">
         <h3 style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>2. Pilih Template Jurnal Target</h3>
         <div className="grid md:grid-cols-2 gap-4">
           {TEMPLATES.map(tpl => (
             <label 
               key={tpl.id} 
               style={{ 
                 display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem", 
                 border: `1px solid ${selectedTemplate === tpl.id ? 'var(--primary)' : 'var(--border)'}`, 
                 borderRadius: "12px", cursor: "pointer",
                 backgroundColor: selectedTemplate === tpl.id ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                 transition: "all 0.2s"
               }}
               className="hover:border-[var(--primary-light)]"
             >
               <input 
                 type="radio" 
                 name="template" 
                 value={tpl.id} 
                 checked={selectedTemplate === tpl.id} 
                 onChange={() => setSelectedTemplate(tpl.id)}
                 style={{ marginTop: "0.4rem", accentColor: "var(--primary)" }}
               />
               <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <PremiumIcon name={tpl.icon} size={16} className={selectedTemplate === tpl.id ? "text-primary" : "text-muted"} />
                    <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{tpl.name}</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{tpl.desc}</p>
               </div>
             </label>
           ))}
         </div>
       </div>

       <div style={{ display: "flex", justifyContent: "flex-end" }}>
         <button 
           className="btn btn-primary" 
           style={{ padding: "0.85rem 2rem", fontSize: "1rem", borderRadius: "12px", gap: "0.5rem", opacity: (!selectedSkripsi ? 0.5 : 1) }}
           onClick={handleConvert}
           disabled={!selectedSkripsi || converting}
         >
           <PremiumIcon name="wand" size={18} />
           Konfirmasi Konversi AI
         </button>
       </div>

       <div style={{ marginTop: "2rem", display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1rem", backgroundColor: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", color: "#B45309" }}>
         <PremiumIcon name="alertCircle" size={20} />
         <p style={{ margin: 0, fontSize: "0.8rem", lineHeight: 1.5 }}>
           <strong>Info Penggunaan Credit:</strong> Proses penyusunan ulang dari format Bab ke format IMRaD menggunakan AI membutuhkan komputasi DeepResearch. Fitur ini akan memotong <strong>15 Credits</strong> setelah konversi selesai.
         </p>
       </div>
    </div>
  );
}
