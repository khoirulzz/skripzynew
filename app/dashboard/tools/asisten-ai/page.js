"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGemini, MODELS } from "@/lib/callWorker";
import { deductCredits, refundCredits } from "@/lib/credits";
import { searchPapersWithFallback } from "@/lib/referenceApis";
import AnimatedLoadingScreen from "@/components/workspace/AnimatedLoadingScreen";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const COST_JUDUL = 2;
const COST_BG = 3;
const API_GROUP = "group_2"; // Group untuk Asisten AI

export default function AsistenAIPage() {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState("judul"); // "judul" | "latar_belakang"
  
  // States untuk Generator Judul
  const [topic, setTopic] = useState("");
  const [loadingJudul, setLoadingJudul] = useState(false);
  const [apiAttemptJudul, setApiAttemptJudul] = useState("core");
  const [resultJudul, setResultJudul] = useState("");
  const [errorJudul, setErrorJudul] = useState("");

  // States untuk Latar Belakang
  const [bgTitle, setBgTitle] = useState("");
  const [bgPhenomenon, setBgPhenomenon] = useState("");
  const [bgProblem, setBgProblem] = useState("");
  const [includeReferences, setIncludeReferences] = useState(true);
  const [loadingBg, setLoadingBg] = useState(false);
  const [apiAttemptBg, setApiAttemptBg] = useState("core");
  const [resultBg, setResultBg] = useState("");
  const [errorBg, setErrorBg] = useState("");

  const credits = userData?.credits ?? 0;

  // ── Fungsi Generator Judul ─────────────────────────────────
  const handleGenerateJudul = async () => {
    if (!user || !topic.trim()) return;
    if (credits < COST_JUDUL) { setErrorJudul(`Kredit tidak cukup. Butuh ${COST_JUDUL} credit.`); return; }

    setLoadingJudul(true);
    setErrorJudul("");
    setResultJudul("");
    setApiAttemptJudul("core");

    try {
      await deductCredits(user.uid, COST_JUDUL);

      // Cari referensi dulu dengan new API
      const result = await searchPapersWithFallback(topic, { limit: 5, yearRange: "10" });
      if (result.papers.length === 0) {
        throw new Error("Tidak ditemukan referensi yang relevan. Coba gunakan kata kunci yang lebih umum.");
      }
      setApiAttemptJudul(result.source);

      const referencesText = result.papers.map(p => {
        return `Judul: ${p.title}\nPenulis: ${p.authorString}\nTahun: ${p.year}\nURL: ${p.displayUrl || p.url}\nAbstrak: ${p.abstract || 'Tidak tersedia.'}`;
      }).join('\n\n---\n\n');

      const prompt = `Anda adalah ahli metodologi penelitian. Tugas Anda menganalisis daftar referensi penelitian berikut, lalu:

1.  Sajikan ulang daftar referensi yang dianalisis. <b>Judul penelitian HARUS dijadikan link (tag <a>) yang bisa diklik menuju URL aslinya</b>, lengkap dengan penulis dan tahun.
2.  Identifikasi <b>research gap</b> dari kumpulan referensi tersebut.
3.  Identifikasi Potensi <b>Novelty</b> (kebaruan) yang belum banyak dibahas.
4.  Buat 3 rekomendasi judul baru yang mengandung unsur novelty tersebut.
5.  Untuk setiap judul rekomendasi, berikan 2 rumusan masalah yang relevan.
6.  Jangan gunakan format markdown \`\`\`html atau tanda \`\`\` apapun. Sajikan hasil langsung dalam format Markdown yang bersih dan rapi.

Sajikan dalam format Markdown yang mudah dibaca. LANGSUNG TAMPILKAN HASIL TANPA KALIMAT PENGANTAR ATAU PENUTUP.

Berikut adalah data untuk dianalisis:
${referencesText}

Gunakan heading (###), list (-), dan bold (**) secara tepat agar mudah dibaca. Link referensi tetap gunakan format markdown [Judul](URL).
`;

      const aiResponse = await callGemini({
        prompt: prompt,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: 0.7,
      });

      setResultJudul(aiResponse);
    } catch (err) {
      await refundCredits(user.uid, COST_JUDUL).catch(() => {});
      setErrorJudul(err.message || "Gagal generate judul.");
    } finally {
      setLoadingJudul(false);
    }
  };

  // ── Fungsi Latar Belakang ─────────────────────────────────
  const handleGenerateBg = async () => {
    if (!user || !bgTitle.trim() || !bgPhenomenon.trim() || !bgProblem.trim()) return;
    if (credits < COST_BG) { setErrorBg(`Kredit tidak cukup. Butuh ${COST_BG} credit.`); return; }

    setLoadingBg(true);
    setErrorBg("");
    setResultBg("");
    setApiAttemptBg("core");

    try {
      await deductCredits(user.uid, COST_BG);

      let promptText = "";
      let papers = [];

      if (includeReferences) {
        const result = await searchPapersWithFallback(bgTitle, { limit: 5, yearRange: "10" });
        setApiAttemptBg(result.source);
        
        if (result.papers.length > 0) {
          papers = result.papers;
          const refs = papers.map(p => `Judul: ${p.title}\nPenulis: ${p.authorString}\nTahun: ${p.year}\nAbstrak: ${p.abstract}`).join('\n\n---\n\n');
          promptText = `Anda adalah seorang akademisi dan penulis ilmiah profesional. Tugas Anda adalah menyusun narasi latar belakang penelitian yanng manusiawi, mendalam, logis, dan mengalir dengan gaya bahasa akademik yang baik, tetap mempertahankan pola tulisan Manusia, namun tetap komunikatif.

📌 Informasi Penelitian:
- Judul: ${bgTitle}
- Fenomena Umum: ${bgPhenomenon}
- Masalah Spesifik: ${bgProblem}

📚 Referensi dari Database Akademis:
${refs}

Tujuan Penulisan:
Tulis latar belakang penelitian sepanjang 6–7 paragraf yang disusun secara deduktif:
1. Paragraf pembuka menjelaskan fenomena umum (${bgPhenomenon}).
2. Paragraf-paragraf tengah mengerucut ke masalah spesifik (${bgProblem}) serta mengintegrasikan analisis referensi.
3. Paragraf penutup menyajikan justifikasi kuat atas urgensi penelitian.

Format Penulisan:
- Gunakan format Markdown: **teks** untuk penekanan, > untuk "research gap".
- Jangan sertakan daftar pustaka di dalam teks.
- TULISKAN HANYA NARASI. Jangan gunakan markdown block (\`\`\`).`;
        }
      }

      if (!promptText) {
        promptText = `Anda adalah seorang akademisi dan penulis ilmiah. Susunlah narasi latar belakang penelitian secara deduktif: mulai dari fenomena umum, lanjut ke penajaman masalah, dan akhiri dengan urgensi.

Judul Penelitian: ${bgTitle}
Fenomena Umum: ${bgPhenomenon}
Masalah Spesifik: ${bgProblem}

Berikan hasil murni dalam format Markdown yang rapi. Tanpa markdown block dan kalimat pengantar.`;
      }

      const aiResponse = await callGemini({
        prompt: promptText,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: 0.7,
      });

      let finalHTML = aiResponse;

      if (includeReferences && papers.length > 0) {
        let referenceListMD = '\n\n### Daftar Referensi yang Digunakan\n';
        papers.forEach(p => {
          referenceListMD += `- [${p.title}](${p.displayUrl || p.url}) (${p.authorString}, ${p.year})\n`;
        });
        finalHTML += referenceListMD;
      }

      setResultBg(finalHTML);
    } catch (err) {
      await refundCredits(user.uid, COST_BG).catch(() => {});
      setErrorBg(err.message || "Gagal menyusun latar belakang.");
    } finally {
      setLoadingBg(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)" }}><PremiumIcon name="arrowLeft" size={20} /></Link>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Asisten AI</h1>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>Bantuan cerdas untuk ide dan draf penelitian Anda</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>
          <span className="text-muted">Kredit Anda:</span>
          <span style={{ color: "var(--text-main)" }}>{credits}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => setActiveTab("judul")}
          style={{
            padding: "0.75rem 1rem", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer",
            backgroundColor: "transparent", borderBottom: activeTab === "judul" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "judul" ? "var(--primary)" : "var(--text-muted)"
          }}
        >
          Generator Judul
        </button>
        <button
          onClick={() => setActiveTab("latar_belakang")}
          style={{
            padding: "0.75rem 1rem", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: "pointer",
            backgroundColor: "transparent", borderBottom: activeTab === "latar_belakang" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "latar_belakang" ? "var(--primary)" : "var(--text-muted)"
          }}
        >
          Asisten Latar Belakang
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        
        {/* === KIRI: INPUT === */}
        <div className="glass-panel p-6" style={{ alignSelf: "start" }}>
          {activeTab === "judul" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
               <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Cari Ide Judul (Novelty)</h3>
               <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                 AI akan mencari jurnal dari Core, OpenAlex, dan Unpaywall, menganalisis gap penelitian, dan merekomendasikan judul beserta rumusan masalahnya.
               </p>

               {errorJudul && (
                 <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                   {errorJudul}
                 </div>
               )}

               <div className="form-group">
                 <label className="form-label">Topik Penilitian</label>
                 <input 
                   type="text" 
                   className="form-input" 
                   placeholder="Contoh: Pengaruh AI terhadap Pendidikan Dasar" 
                   value={topic}
                   onChange={e => setTopic(e.target.value)}
                 />
               </div>

               <button 
                 className="btn btn-primary w-full"
                 onClick={handleGenerateJudul}
                 disabled={loadingJudul || !topic.trim()}
               >
                 {loadingJudul ? "Menganalisis..." : `Generate Ide Judul (-${COST_JUDUL} Kredit)`}
               </button>
             </div>
          )}

          {activeTab === "latar_belakang" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Draf Latar Belakang</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                 Susun latar belakang penelitian menggunakan pendekatan deduktif dengan narasi alami.
              </p>

               {errorBg && (
                 <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                   {errorBg}
                 </div>
               )}

              <div className="form-group">
                <label className="form-label">Judul Penelitian</label>
                <input type="text" className="form-input" value={bgTitle} onChange={e => setBgTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fenomena Umum (Paragraf Awal)</label>
                <textarea className="form-input" rows="3" value={bgPhenomenon} onChange={e => setBgPhenomenon(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Masalah Spesifik & Urgensi</label>
                <textarea className="form-input" rows="3" value={bgProblem} onChange={e => setBgProblem(e.target.value)} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input 
                  type="checkbox" 
                  id="incRef" 
                  checked={includeReferences} 
                  onChange={(e) => setIncludeReferences(e.target.checked)} 
                />
                <label htmlFor="incRef" style={{ fontSize: "0.85rem", cursor: "pointer" }}>Sertakan referensi (Core + OpenAlex + Unpaywall)</label>
              </div>

              <button 
                 className="btn btn-primary w-full"
                 onClick={handleGenerateBg}
                 disabled={loadingBg || !bgTitle.trim() || !bgPhenomenon.trim() || !bgProblem.trim()}
                 style={{ marginTop: "0.5rem" }}
               >
                 {loadingBg ? "Menyusun Draf..." : `Buat Draf Latar Belakang (-${COST_BG} Kredit)`}
               </button>
            </div>
          )}
        </div>

        {/* === KANAN: OUTPUT === */}
        <div className="glass-panel p-6" style={{ overflowY: "auto", maxHeight: "600px" }}>
           {activeTab === "judul" && !loadingJudul && !resultJudul && (
             <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "3rem", fontSize: "0.9rem" }}>
               Isi form di samping untuk mulai mencari ide judul. Hasil analisis research gap, novelty, dan judul akan tampil di sini.
             </div>
           )}
           {activeTab === "judul" && loadingJudul && (
             <AnimatedLoadingScreen isLoading={loadingJudul} apiAttempt={apiAttemptJudul} />
           )}
           {activeTab === "judul" && resultJudul && (
             <div className="markdown-body">
               <ReactMarkdown>{resultJudul}</ReactMarkdown>
             </div>
           )}

           {activeTab === "latar_belakang" && !loadingBg && !resultBg && (
             <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "3rem", fontSize: "0.9rem" }}>
               Isi variabel penelitian Anda di samping. AI akan menyusun draf latar belakang lengkap di sini.
             </div>
           )}
           {activeTab === "latar_belakang" && loadingBg && (
             <AnimatedLoadingScreen isLoading={loadingBg} apiAttempt={apiAttemptBg} />
           )}
           {activeTab === "latar_belakang" && resultBg && (
             <div className="markdown-body">
               <ReactMarkdown>{resultBg}</ReactMarkdown>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
