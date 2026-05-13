"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGemini, MODELS } from "@/lib/callWorker";
import { deductCredits, refundCredits } from "@/lib/credits";
import { searchPapersWithFallback } from "@/lib/referenceApis";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

const API_GROUP = "group_2"; // Group untuk Asisten AI

export default function AsistenAIPage() {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const titleCost = toolMap["asisten-ai-judul"]?.creditCost ?? 2;
  const backgroundCost = toolMap["asisten-ai-latar-belakang"]?.creditCost ?? 3;
  const [activeTab, setActiveTab] = useState("judul"); // "judul" | "latar_belakang"
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    if (credits < titleCost) { setErrorJudul(`Kredit tidak cukup. Butuh ${titleCost} credit.`); return; }

    setLoadingJudul(true);
    setErrorJudul("");
    setResultJudul("");
    setApiAttemptJudul("core");

    try {
      await deductCredits(user.uid, titleCost);

      let referencesText = "";
      let prompt = "";
      let foundReferences = false;

      // Cari referensi dulu dengan new API
      try {
        const result = await searchPapersWithFallback(topic, { limit: 5, yearRange: "10" });
        if (result.papers && result.papers.length > 0) {
          setApiAttemptJudul(result.source);
          foundReferences = true;
          referencesText = result.papers.map(p => {
            return `Judul: ${p.title}\nPenulis: ${p.authorString}\nTahun: ${p.year}\nURL: ${p.displayUrl || p.url}\nAbstrak: ${p.abstract || 'Tidak tersedia.'}`;
          }).join('\n\n---\n\n');
        }
      } catch (err) {
        console.warn("Gagal menemukan referensi, melanjutkan tanpa referensi.", err);
        setApiAttemptJudul("error");
      }

      if (foundReferences) {
        prompt = `Anda adalah ahli metodologi penelitian. Tugas Anda menganalisis daftar referensi penelitian berikut, lalu:

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
      } else {
        prompt = `Anda adalah ahli metodologi penelitian. Tugas Anda adalah memberikan rekomendasi judul penelitian berdasarkan topik berikut: "${topic}".

**PENTING: Sistem saat ini gagal menemukan referensi jurnal yang relevan dari database.**
Harap tambahkan catatan ramah di awal output Anda yang menyatakan bahwa referensi tidak ditemukan (atau terjadi gangguan pencarian), sehingga hasil ini hanya memuat rekomendasi judul dan rumusan masalah tanpa analisis *Research Gap* dari literatur.

Lalu, sajikan:
1.  3 rekomendasi judul penelitian baru yang inovatif dan relevan dengan topik tersebut.
2.  Untuk setiap judul rekomendasi, berikan 2 rumusan masalah yang tepat.
3.  Berikan sedikit penjelasan teoritis terkait potensi novelty yang bisa diangkat meskipun tanpa referensi literatur.

Sajikan dalam format Markdown yang mudah dibaca. LANGSUNG TAMPILKAN HASIL TANPA KALIMAT PENGANTAR (kecuali catatan terkait referensi tadi).
Gunakan heading (###), list (-), dan bold (**) secara tepat agar mudah dibaca.`;
      }

      const aiResponse = await callGemini({
        prompt: prompt,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: 0.7,
      });

      setResultJudul(aiResponse);
    } catch (err) {
      await refundCredits(user.uid, titleCost).catch(() => { });
      setErrorJudul(err.message || "Gagal generate judul.");
    } finally {
      setLoadingJudul(false);
    }
  };

  // ── Fungsi Latar Belakang ─────────────────────────────────
  const handleGenerateBg = async () => {
    if (!user || !bgTitle.trim() || !bgPhenomenon.trim() || !bgProblem.trim()) return;
    if (credits < backgroundCost) { setErrorBg(`Kredit tidak cukup. Butuh ${backgroundCost} credit.`); return; }

    setLoadingBg(true);
    setErrorBg("");
    setResultBg("");
    setApiAttemptBg("core");

    try {
      await deductCredits(user.uid, backgroundCost);

      let promptText = "";
      let papers = [];

      if (includeReferences) {
        try {
          const result = await searchPapersWithFallback(bgTitle, { limit: 5, yearRange: "10" });
          setApiAttemptBg(result.source);

          if (result.papers && result.papers.length > 0) {
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
        } catch (err) {
          console.warn("Gagal menemukan referensi untuk latar belakang.", err);
          setApiAttemptBg("error");
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
      await refundCredits(user.uid, backgroundCost).catch(() => { });
      setErrorBg(err.message || "Gagal menyusun latar belakang.");
    } finally {
      setLoadingBg(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: isMobile ? "2rem" : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {!isMobile && <Link href="/dashboard" style={{ color: "var(--text-muted)" }}><PremiumIcon name="arrowLeft" size={20} /></Link>}
          <div>
            <h1 style={{ fontSize: isMobile ? "1rem" : "1.5rem", margin: 0 }}>Asisten AI</h1>
            <p style={{ margin: "0.1rem 0 0 0", fontSize: isMobile ? "0.65rem" : "0.75rem", color: "var(--text-muted)" }}>Bantuan cerdas untuk ide & draf penelitian</p>
          </div>
        </div>
        <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontWeight: 600 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "1rem" : "2rem" }}>

        {/* === KIRI: INPUT === */}
        <div className="glass-panel" style={{ alignSelf: "start", padding: isMobile ? "0.85rem" : "1.5rem", borderRadius: isMobile ? "16px" : "24px" }}>
          {activeTab === "judul" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: isMobile ? "0.95rem" : "1.1rem", margin: 0 }}>Cari Ide Judul (Novelty)</h3>
              <p style={{ fontSize: isMobile ? "0.75rem" : "0.8rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                AI akan mencari jurnal dari Database Paper dan menganalisis gap penelitian, dan merekomendasikan judul beserta rumusan masalahnya.
              </p>

              {errorJudul && (
                <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                  {errorJudul}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: isMobile ? "0.5rem" : "1rem" }}>
                <label className="form-label" style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", marginBottom: "0.2rem" }}>Topik Penelitian</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: isMobile ? "0.8rem" : "0.95rem", padding: isMobile ? "0.6rem" : "0.75rem" }}
                  placeholder="Contoh: Pengaruh AI terhadap Pendidikan Dasar"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>

              {!isMobile && (
              <button
                className="btn btn-primary w-full"
                onClick={handleGenerateJudul}
                disabled={loadingJudul || !topic.trim()}
              >
                {loadingJudul ? "Menganalisis..." : `Generate Ide Judul (-${titleCost} Kredit)`}
              </button>
              )}
            </div>
          )}

          {activeTab === "latar_belakang" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ fontSize: isMobile ? "0.95rem" : "1.1rem", margin: 0 }}>Draf Latar Belakang</h3>
              <p style={{ fontSize: isMobile ? "0.75rem" : "0.8rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                Susun latar belakang penelitian dengan narasi alami.
              </p>

              {errorBg && (
                <div style={{ padding: "0.75rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem" }}>
                  {errorBg}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: isMobile ? "0.5rem" : "1rem" }}>
                <label className="form-label" style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", marginBottom: "0.2rem" }}>Judul Penelitian</label>
                <input type="text" className="form-input" style={{ fontSize: isMobile ? "0.8rem" : "0.95rem", padding: isMobile ? "0.6rem" : "0.75rem" }} value={bgTitle} onChange={e => setBgTitle(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: isMobile ? "0.5rem" : "1rem" }}>
                <label className="form-label" style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", marginBottom: "0.2rem" }}>Fenomena Umum (Paragraf Awal)</label>
                <textarea className="form-input" rows="3" style={{ fontSize: isMobile ? "0.8rem" : "0.95rem", padding: isMobile ? "0.6rem" : "0.75rem" }} value={bgPhenomenon} onChange={e => setBgPhenomenon(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: isMobile ? "0.5rem" : "1rem" }}>
                <label className="form-label" style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", marginBottom: "0.2rem" }}>Masalah Spesifik & Urgensi</label>
                <textarea className="form-input" rows="3" style={{ fontSize: isMobile ? "0.8rem" : "0.95rem", padding: isMobile ? "0.6rem" : "0.75rem" }} value={bgProblem} onChange={e => setBgProblem(e.target.value)} />
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

              {!isMobile && (
              <button
                className="btn btn-primary w-full"
                onClick={handleGenerateBg}
                disabled={loadingBg || !bgTitle.trim() || !bgPhenomenon.trim() || !bgProblem.trim()}
                style={{ marginTop: "0.5rem" }}
              >
                {loadingBg ? "Menyusun Draf..." : `Buat Draf Latar Belakang (-${backgroundCost} Kredit)`}
              </button>
              )}
            </div>
          )}
        </div>

        {/* === KANAN: OUTPUT === */}
        <div className="glass-panel" style={{ overflowY: "auto", maxHeight: isMobile ? "none" : "600px", padding: isMobile ? "0.85rem" : "1.5rem", borderRadius: isMobile ? "16px" : "24px", marginBottom: isMobile ? "5rem" : 0 }}>
          {activeTab === "judul" && !loadingJudul && !resultJudul && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "3rem", fontSize: "0.9rem" }}>
              Isi form untuk mulai mencari ide judul. Hasil analisis research gap, novelty, dan judul akan tampil di sini.
            </div>
          )}
          {activeTab === "judul" && loadingJudul && (
            <div style={{ padding: "1.5rem", backgroundColor: "rgba(79, 70, 229, 0.05)", border: "1px solid rgba(79, 70, 229, 0.2)", borderRadius: "var(--radius-md)", textAlign: "center" }} className="animate-pulse">
              <PremiumIcon name="sparkles" size={24} style={{ color: "var(--primary)", margin: "0 auto 0.5rem" }} className="animate-spin-slow" />
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--primary)", marginBottom: "0.5rem", margin: 0 }}>
                {apiAttemptJudul === "" || apiAttemptJudul === "core" || apiAttemptJudul === "openalex" || apiAttemptJudul === "unpaywall" ? "Mencari referensi jurnal..." : "Menyusun ide dan rekomendasi..."}
              </p>
              <div style={{ height: "4px", backgroundColor: "rgba(79, 70, 229, 0.2)", borderRadius: "9999px", overflow: "hidden", maxWidth: "200px", margin: "0.5rem auto 0" }}>
                <div className="animate-progress-loading" style={{ height: "100%", backgroundColor: "var(--primary)", width: "60%" }}></div>
              </div>
            </div>
          )}
          {activeTab === "judul" && resultJudul && (
            <div className="markdown-body" style={{ fontSize: isMobile ? "0.75rem" : "0.9rem" }}>
              <ReactMarkdown>{resultJudul}</ReactMarkdown>
            </div>
          )}

          {activeTab === "latar_belakang" && !loadingBg && !resultBg && (
            <div style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "3rem", fontSize: "0.9rem" }}>
              Isi variabel penelitian Anda. AI akan menyusun draf latar belakang lengkap di sini.
            </div>
          )}
          {activeTab === "latar_belakang" && loadingBg && (
            <div style={{ padding: "1.5rem", backgroundColor: "rgba(79, 70, 229, 0.05)", border: "1px solid rgba(79, 70, 229, 0.2)", borderRadius: "var(--radius-md)", textAlign: "center" }} className="animate-pulse">
              <PremiumIcon name="sparkles" size={24} style={{ color: "var(--primary)", margin: "0 auto 0.5rem" }} className="animate-spin-slow" />
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--primary)", marginBottom: "0.5rem", margin: 0 }}>
                {apiAttemptBg === "" || apiAttemptBg === "core" || apiAttemptBg === "openalex" || apiAttemptBg === "unpaywall" ? "Mencari referensi yang relevan..." : "Menyusun draf latar belakang..."}
              </p>
              <div style={{ height: "4px", backgroundColor: "rgba(79, 70, 229, 0.2)", borderRadius: "9999px", overflow: "hidden", maxWidth: "200px", margin: "0.5rem auto 0" }}>
                <div className="animate-progress-loading" style={{ height: "100%", backgroundColor: "var(--primary)", width: "60%" }}></div>
              </div>
            </div>
          )}
          {activeTab === "latar_belakang" && resultBg && (
            <div className="markdown-body" style={{ fontSize: isMobile ? "0.75rem" : "0.9rem" }}>
              <ReactMarkdown>{resultBg}</ReactMarkdown>
            </div>
          )}
        </div>

      </div>

      {/* ── Mobile Sticky Bottom Bar ────────────── */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "1rem", right: "1rem", zIndex: 50, display: "flex", pointerEvents: "none" }}>
          {activeTab === "judul" && (
            <button className="btn btn-primary" style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 600, borderRadius: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "auto" }} onClick={handleGenerateJudul} disabled={loadingJudul || !topic.trim()}>
              {loadingJudul ? <><PremiumIcon name="sparkles" size={14} className="animate-pulse" /> Menganalisis...</> : <><PremiumIcon name="sparkles" size={14} /> Generate Judul</>}
            </button>
          )}
          {activeTab === "latar_belakang" && (
            <button className="btn btn-primary" style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 600, borderRadius: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "auto" }} onClick={handleGenerateBg} disabled={loadingBg || !bgTitle.trim() || !bgPhenomenon.trim() || !bgProblem.trim()}>
              {loadingBg ? <><PremiumIcon name="sparkles" size={14} className="animate-pulse" /> Menyusun Draf...</> : <><PremiumIcon name="sparkles" size={14} /> Buat Latar Belakang</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
