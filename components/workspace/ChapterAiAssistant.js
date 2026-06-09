"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/components/providers/AuthProvider";
import { d1Request } from "@/lib/d1Client";
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import { CHAPTERS, summarizeTranscriptThemes } from "@/lib/workspaceDefaults";
import { searchWorkspaceReferenceChunks } from "@/lib/ragService";
import { generateWorkspaceChapter } from "@/lib/workspacePublicApi";

const CHAPTER_ACTIONS = {
  0: [ // Bab I
    { id: "latar_belakang", title: "Buat Latar Belakang", desc: "Buat paragraf latar belakang yang kuat dan terarah.", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: "fileText" },
    { id: "rumusan_masalah", title: "Buat Rumusan Masalah", desc: "Bantu merumuskan masalah penelitian secara terfokus.", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "helpCircle" },
    { id: "tujuan_penelitian", title: "Buat Tujuan Penelitian", desc: "Bantu menyusun tujuan penelitian berdasarkan rumusan.", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "compass" },
    { id: "manfaat_penelitian", title: "Buat Manfaat Penelitian", desc: "Bantu menyusun manfaat penelitian akademik dan praktis.", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "shieldCheck" }
  ],
  1: [ // Bab II
    { id: "landasan_teori", title: "Buat Landasan Teori", desc: "Susun landasan teori pendukung variabel penelitian.", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: "bookOpen" },
    { id: "analisis_terdahulu", title: "Analisis Penelitian Terdahulu", desc: "Buat analisis komparatif penelitian-penelitian terdahulu.", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "barChart" },
    { id: "kajian_terdahulu", title: "Kajian Penelitian Terdahulu", desc: "Tinjau relevansi penelitian terdahulu dengan topik Anda.", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "layers" },
    { id: "kerangka_pemikiran", title: "Kerangka Pemikiran", desc: "Susun alur berpikir logis hubungan antar variabel.", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "brainCircuit" },
    { id: "hipotesis", title: "Hipotesis Penelitian", desc: "Bantu rumuskan hipotesis sementara penelitian.", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", icon: "sparkles" }
  ],
  2: [ // Bab III
    { id: "pendekatan_metode", title: "Buat Pendekatan & Metode", desc: "Jelaskan metode kuantitatif/kualitatif yang dipilih.", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: "settings" },
    { id: "populasi_sampel", title: "Buat Populasi & Sampel", desc: "Tentukan populasi, sampel, dan teknik sampling.", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "users" },
    { id: "pengumpulan_data", title: "Buat Teknik Pengumpulan Data", desc: "Jelaskan cara pengumpulan data penelitian.", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "download" },
    { id: "analisis_data", title: "Buat Teknik Analisis Data", desc: "Deskripsikan teknik pengujian dan analisis data.", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "activity" }
  ],
  3: [ // Bab IV
    { id: "deskripsi_data", title: "Buat Deskripsi Data / Temuan", desc: "Sajikan data temuan lapangan secara sistematis.", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: "pieChart" },
    { id: "hasil_analisis", title: "Buat Hasil Analisis Data", desc: "Interpretasikan angka statistik atau tema wawancara.", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "activity" },
    { id: "pembahasan_akademik", title: "Buat Pembahasan Akademik", desc: "Bahas temuan dengan teori dan penelitian sebelumnya.", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)", icon: "globe" }
  ],
  4: [ // Bab V
    { id: "kesimpulan", title: "Buat Kesimpulan Penelitian", desc: "Rumuskan kesimpulan padat menjawab pertanyaan penelitian.", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)", icon: "checkCircle" },
    { id: "implikasi", title: "Buat Implikasi Penelitian", desc: "Jelaskan implikasi teoritis dan praktis hasil penelitian.", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", icon: "alertTriangle" },
    { id: "saran", title: "Buat Saran Penelitian", desc: "Berikan saran konstruktif untuk pembaca & peneliti selanjutnya.", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", icon: "messageSquare" }
  ]
};

export function ChapterAiAssistant({
  activeChapter,
  workspaceContext,
  onInsertContent,
  selectedReferences = [],
  activeForm = null,
  latestAnalysis = null,
  transcripts = [],
  notes = "",
  floating = false,
  offsetRight = 16,
  rootContext = {},
  chapterContext = {},
  isMobile = false,
  onTriggerContextFill,
}) {
  const { user, userData, refreshUserData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState("");
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const isGeneratingRef = useRef(false);
  const [thematicAnalysis, setThematicAnalysis] = useState("");

  useEffect(() => {
    if (!workspaceContext?.id) return;
    let isMounted = true;
    async function fetchThematic() {
      try {
        const res = await d1Request("workspace_notes", { method: "GET", id: `thematic_analysis_${workspaceContext.id}` });
        if (isMounted && res && res.data) {
          setThematicAnalysis(res.data.content || "");
        }
      } catch (err) {
        console.error("Gagal mengambil thematic analysis:", err);
      }
    }
    fetchThematic();
    return () => {
      isMounted = false;
    };
  }, [workspaceContext?.id]);

  const chapter = CHAPTERS[activeChapter];
  const generationCost = toolMap["chapter-generation"]?.creditCost ?? 2;
  const creditBalance = userData?.credits ?? 0;
  const canGenerate = !!workspaceContext?.id && !!user;

  // Check if context has been filled
  const isContextEmpty = useMemo(() => {
    const hasNoRoot = !rootContext.rumusanMasalah && !rootContext.fenomenaUmum && !rootContext.faktaLapangan;
    const hasNoCh = !chapterContext.struktur && !chapterContext.panduan;
    return hasNoRoot && hasNoCh;
  }, [rootContext, chapterContext]);

  const actions = useMemo(() => CHAPTER_ACTIONS[activeChapter] || [], [activeChapter]);

  const handleGenerate = async () => {
    if (isGeneratingRef.current || !selectedAction) return;
    if (!canGenerate || creditBalance < generationCost) {
      setStatus(`Kredit tidak cukup. Butuh ${generationCost} kredit.`);
      return;
    }

    setStatus("");
    setIsGenerating(true);
    isGeneratingRef.current = true;

    try {
      await deductCredits(user.uid, generationCost);
      await refreshUserData();

      let referenceContext = "";
      const selectedReferenceIds = selectedReferences.map((item) => item.id);

      // Auto-RAG fetch chunks
      const chunks = await searchWorkspaceReferenceChunks({
        userId: user.uid,
        workspaceId: workspaceContext.id,
        queryText: `${chapter.title} ${selectedAction.title} ${workspaceContext.title || ""} ${instruction}`.trim(),
        referenceIds: selectedReferenceIds.slice(0, 10),
        limitCount: 12,
      });

      if (chunks.length > 0) {
        referenceContext = chunks
          .map((item, index) => `[Sumber ${index + 1}] ${item.document_title} - Hal ${item.page_number}\n${item.text_content}`)
          .join("\n\n");
      }

      const transcriptSummary = summarizeTranscriptThemes(transcripts);
      const selectedReferenceSummary = selectedReferences
        .map((item) => `- ${item.title} (${item.authorString || (item.authors || []).join(", ")}, ${item.year || "tanpa tahun"})`)
        .join("\n");

      const prompt = `
Anda adalah mahasiswa peneliti tingkat akhir yang cerdas, analitis, dan sangat mahir menyusun narasi akademik.
Tugas Anda adalah menulis sub-bab khusus: "${selectedAction.title}" (${selectedAction.desc}) untuk ${chapter.longLabel}.

PANDUAN GAYA BAHASA & DIKSI:
- Tulis dalam bahasa Indonesia baku yang natural, mengalir, dan tidak kaku ("skripsi banget"). 
- Hasilkan kalimat yang detail, panjang, dan naratif secara fleksibel. Minimalisir penggunaan kalimat klise atau ungkapan robotik khas AI.
- Pembahasan harus mengalir antar paragraf. Gunakan kata transisi dengan luwes (misal: "Sejalan dengan hal tersebut", "Lebih lanjut", "Menariknya", "Kondisi ini mengindikasikan bahwa", "Di sisi lain").
- Penggunaan poin-poin (bullet points) HARUS FLEKSIBEL dan BUKAN KEWAJIBAN. Lebur informasi menjadi narasi paragraf yang kohesif. Gunakan bullet points HANYA jika benar-benar diperlukan (misal: menjabarkan sub-aspek yang terstruktur kaku atau menyebutkan faktor-faktor yang banyak).

PANDUAN PENYAJIAN DATA KHUSUS (TERUTAMA BAB 4):
- Jika ini adalah bagian Hasil dan Pembahasan, JANGAN sekadar "melempar" angka dari angket atau kutipan dari wawancara/observasi secara mentah.
- Narasikan data tersebut secara analitis. Contoh: Daripada "Responden A mengatakan: 'X'", gunakan "Hal ini diperkuat oleh penuturan salah satu informan yang mengungkapkan bahwa...".
- Selalu berikan interpretasi analitis di balik setiap sajian data, dan pastikan terhubung dengan teori atau temuan lain.

ATURAN KELUARAN:
- Kembalikan HTML saja, tanpa markdown fence, tanpa pengantar tambahan.
- Gunakan hanya elemen: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>.
- Gunakan kutipan & sitasi yang relevan jika konteks referensi tersedia. Format harus konsisten (Penulis, Tahun). Dilarang keras menggunakan format angka seperti [1].
- PENTING: Anti-halusinasi! Jika informasi tidak ada di sumber, jangan mengarang.

SINKRONISASI KONTEKS (PENTING! JANGAN SAMPAI BENTROK):
Pastikan output Anda meleburkan harmonisasi antara "Konteks Utama", "Sistematika Bab", dan "Arahan Khusus". Setiap paragraf harus memiliki benang merah yang sejalan dengan Fenomena Umum dan Rumusan Masalah.

KONTEKS UTAMA PENELITIAN (BRAIN ROOT):
- Judul penelitian: ${workspaceContext.title || "Tanpa judul"}
- Fenomena Umum: ${rootContext.fenomenaUmum || "Belum ada"}
- Fakta/Permasalahan Lapangan: ${rootContext.faktaLapangan || "Belum ada"}
- Rumusan Masalah: ${rootContext.rumusanMasalah || "Belum ada"}
- Metode: ${rootContext.metode || "Belum ada"}
${rootContext.gapAnalysis ? `- Gap Analysis: ${rootContext.gapAnalysis}` : ""}
${rootContext.kebaruanNovelty ? `- Kebaruan / Novelty: ${rootContext.kebaruanNovelty}` : ""}

SISTEMATIKA & PEDOMAN PENULISAN BAB INI:
- Struktur Bab: ${chapterContext.struktur || "Ikuti struktur standar akademik."}
- Panduan Isi Bab: ${chapterContext.panduan || "Tulis secara akademis dan ilmiah."}

KONTEN BAB SAAT INI (Gunakan sebagai referensi posisi penulisan):
${workspaceContext[chapter.key] || "(masih kosong)"}

${activeForm ? `FORM AKTIF / INSTRUMEN RESIDU:\n${JSON.stringify(activeForm, null, 2)}` : ""}
${latestAnalysis ? `SNAPSHOT ANALISIS TERAKHIR:\n${JSON.stringify(latestAnalysis, null, 2)}` : ""}
${transcriptSummary ? `RINGKASAN TRANSKRIP WAWANCARA:\n${transcriptSummary}` : ""}
${activeChapter === 3 && thematicAnalysis ? `POIN-POIN TEMATIK HASIL ANALISIS DATA (Angket, Wawancara, Observasi):\n${thematicAnalysis}\n` : ""}

REFERENSI TERPILIH:
${selectedReferenceSummary || "Belum ada referensi yang ditandai untuk bab ini."}

KONTEKS EKSTRAK REFERENSI (Auto-RAG):
${referenceContext || "Belum ada chunk referensi yang tersedia."}

ARAHAN KHUSUS TAMBAHAN PENGGUNA:
${instruction || "Tidak ada arahan tambahan."}
`.trim();

      const result = await generateWorkspaceChapter({
        prompt,
        group: "group_1,group_2",
        model: "gemini-flash-latest",
        temperature: activeChapter === 3 ? 0.55 : 0.7,
      });

      onInsertContent(result.text);
      setStatus("Draft AI berhasil disisipkan ke editor.");
      setIsOpen(false);
      setSelectedAction(null);
      setInstruction("");
    } catch (error) {
      await refundCredits(user.uid, generationCost).catch(() => {});
      console.error("Gagal generate bab:", error);
      setStatus(error.message || "Gagal menghasilkan draft AI.");
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  const shellStyle = floating
    ? {
        position: "fixed",
        right: `${offsetRight}px`,
        bottom: "1rem",
        zIndex: 36,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.75rem",
        maxWidth: "calc(100vw - 1.25rem)",
      }
    : { position: "relative" };

  const panelStyle = {
    width: floating ? "min(360px, calc(100vw - 1.25rem))" : "320px",
    maxWidth: "calc(100vw - 1.25rem)",
    maxHeight: "min(78vh, 560px)",
    overflowY: "auto",
    padding: isMobile ? "0.75rem" : "1rem",
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "0.65rem" : "0.85rem",
    backgroundColor: "var(--surface)",
    boxShadow: "var(--shadow-lg)",
  };

  return (
    <div style={shellStyle}>
      {!isOpen ? (
        <button
          className="btn btn-primary"
          onMouseEnter={() => setIsBtnHovered(true)}
          onMouseLeave={() => setIsBtnHovered(false)}
          style={{
            borderRadius: "999px",
            boxShadow: "0 12px 24px rgba(79,70,229,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            height: "46px",
            cursor: "pointer",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            whiteSpace: "nowrap",
            outline: "none",
            border: "none",
            ...(floating
              ? {
                  width: isBtnHovered ? "130px" : "46px",
                  paddingLeft: isBtnHovered ? "0.95rem" : "0",
                  paddingRight: isBtnHovered ? "0.95rem" : "0",
                }
              : {
                  padding: "0.75rem 1.2rem",
                })
          }}
          onClick={() => {
            setIsOpen(true);
            setIsBtnHovered(false);
          }}
          title="AI Copilot Penulisan"
        >
          <PremiumIcon name="sparkles" size={18} style={{ flexShrink: 0 }} />
          {floating && (
            <span
              style={{
                opacity: isBtnHovered ? 1 : 0,
                width: isBtnHovered ? "auto" : "0px",
                transform: isBtnHovered ? "scale(1)" : "scale(0.85)",
                transition: "opacity 0.2s ease, transform 0.2s ease, width 0.25s ease",
                fontSize: "0.82rem",
                fontWeight: 700,
                pointerEvents: "none",
                display: "inline-block",
                verticalAlign: "middle"
              }}
            >
              AI Copilot
            </span>
          )}
        </button>
      ) : (
        <div className="glass-panel workspace-scroll" style={panelStyle}>
          {/* Header Panel */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                AI Assistant
              </div>
              <h4 style={{ fontSize: "0.98rem", margin: "0.1rem 0 0 0", fontWeight: 750 }}>
                {selectedAction ? "Konfigurasi Draft" : "AI Copilot"}
              </h4>
            </div>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                setIsOpen(false);
                setSelectedAction(null);
                setInstruction("");
                setStatus("");
              }} 
              style={{ padding: "0.3rem", flexShrink: 0 }} 
              disabled={isGenerating}
            >
              <PremiumIcon name="x" size={15} />
            </button>
          </div>

          {/* Context Empty Check Redirect */}
          {isContextEmpty ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center", padding: "1.5rem 0.5rem" }}>
              <div style={{ 
                width: "48px", 
                height: "48px", 
                borderRadius: "50%", 
                backgroundColor: "rgba(79, 70, 229, 0.08)", 
                color: "var(--primary)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 8px 16px rgba(79,70,229,0.05)"
              }}>
                <PremiumIcon name="brainCircuit" size={24} />
              </div>
              <h5 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>Isi Konteks Dulu</h5>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                Lengkapi Konteks Utama (Brain Root) dan Panduan Bab terlebih dahulu agar AI memahami arah penelitian Anda.
              </p>
              <button 
                className="btn btn-primary" 
                style={{ width: "100%", padding: "0.6rem", fontSize: "0.8rem", marginTop: "0.5rem", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                onClick={() => {
                  setIsOpen(false);
                  if (onTriggerContextFill) onTriggerContextFill();
                }}
              >
                <PremiumIcon name="edit3" size={14} />
                <span>Lengkapi Konteks</span>
              </button>
            </div>
          ) : !selectedAction ? (
            /* Screen 1: Chapter Action List */
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ padding: isMobile ? "0.6rem" : "0.75rem", borderRadius: "10px", backgroundColor: "rgba(79, 70, 229, 0.04)", border: "1px solid rgba(79, 70, 229, 0.1)", fontSize: isMobile ? "0.72rem" : "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                <PremiumIcon name="info" size={15} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "1px" }} />
                <span>Sedang menulis <strong>{chapter.longLabel}</strong>. Pilih bagian yang ingin disusun oleh AI Copilot di bawah:</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {actions.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      setSelectedAction(act);
                      setStatus("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      padding: isMobile ? "0.6rem 0.75rem" : "0.8rem",
                      borderRadius: "12px",
                      border: "1.5px solid var(--border)",
                      backgroundColor: "var(--background)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outline: "none"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.05)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Icon Square with specific background & text color */}
                    <div style={{ 
                      width: "36px", 
                      height: "36px", 
                      borderRadius: "8px", 
                      backgroundColor: act.bg, 
                      color: act.color, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <PremiumIcon name={act.icon} size={18} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: isMobile ? "0.78rem" : "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.15rem" }}>
                        {act.title}
                      </div>
                      <div style={{ fontSize: isMobile ? "0.68rem" : "0.74rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {act.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Screen 2: Action Setup & Generation */
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* Back Button */}
              <button 
                onClick={() => setSelectedAction(null)}
                style={{ 
                  background: "none", 
                  border: "none", 
                  color: "var(--primary)", 
                  fontSize: "0.78rem", 
                  fontWeight: 700, 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.3rem",
                  padding: 0,
                  alignSelf: "flex-start"
                }}
              >
                <PremiumIcon name="chevronLeft" size={13} />
                Kembali ke Menu
              </button>

              {/* Task Details */}
              <div style={{ padding: isMobile ? "0.6rem" : "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: isMobile ? "0.78rem" : "0.84rem", fontWeight: 750, color: "var(--text-main)" }}>{selectedAction.title}</div>
                <div style={{ fontSize: isMobile ? "0.68rem" : "0.74rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{selectedAction.desc}</div>
              </div>

              {/* RAG Status Check */}
              {selectedReferences.length > 0 ? (
                <div style={{ padding: isMobile ? "0.4rem 0.55rem" : "0.5rem 0.65rem", borderRadius: "8px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)", fontSize: isMobile ? "0.68rem" : "0.74rem", color: "#065f46", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <PremiumIcon name="check" size={14} style={{ color: "var(--success)" }} />
                  <span>RAG Aktif: Menggunakan <strong>{selectedReferences.length}</strong> referensi Bab ini.</span>
                </div>
              ) : (
                <div style={{ padding: isMobile ? "0.4rem 0.55rem" : "0.5rem 0.65rem", borderRadius: "8px", backgroundColor: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.15)", fontSize: isMobile ? "0.68rem" : "0.74rem", color: "#92400e", display: "flex", alignItems: "flex-start", gap: "0.4rem", lineHeight: 1.4 }}>
                  <PremiumIcon name="alertCircle" size={14} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
                  <span>Tidak ada jurnal referensi terdaftar/terpilih untuk bab ini. AI akan menggunakan data secara umum.</span>
                </div>
              )}

              {/* Cost & Balance */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: isMobile ? "0.72rem" : "0.76rem" }}>
                <span>Biaya: <strong>{generationCost} kredit</strong></span>
                <span style={{ fontSize: isMobile ? "0.68rem" : "0.72rem", backgroundColor: "var(--primary-light)", color: "var(--primary)", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: "bold" }}>
                  Kredit Anda: {creditBalance}
                </span>
              </div>

              {/* Instruction Area */}
              <textarea
                className="form-textarea"
                rows={isMobile ? 3 : 4}
                placeholder="Tambahkan arahan khusus (opsional), contoh: 'Uraikan secara detail pengaruh positif media sosial terhadap pemikiran logis...'"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                disabled={isGenerating}
                style={{ opacity: isGenerating ? 0.6 : 1, cursor: isGenerating ? "not-allowed" : "text", fontSize: isMobile ? "0.74rem" : "0.8rem" }}
              />

              {status && (
                <div
                  style={{
                    padding: isMobile ? "0.6rem" : "0.75rem",
                    borderRadius: "10px",
                    backgroundColor: status.includes("berhasil") ? "rgba(16,185,129,0.12)" : "rgba(79,70,229,0.08)",
                    color: status.includes("berhasil") ? "var(--success)" : "var(--text-main)",
                    fontSize: isMobile ? "0.74rem" : "0.8rem",
                    lineHeight: 1.4
                  }}
                >
                  {status}
                </div>
              )}

              <button 
                className="btn btn-primary" 
                onClick={() => void handleGenerate()} 
                disabled={isGenerating || !canGenerate}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              >
                {isGenerating ? <LoadingSpinner size={15} className="text-white" /> : <PremiumIcon name="sparkles" size={15} />}
                {isGenerating ? "Menyusun Draft..." : "Generate Draft"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
