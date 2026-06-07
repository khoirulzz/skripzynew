"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/components/providers/AuthProvider";
import { d1Request } from "@/lib/d1Client";
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import { summarizeTranscriptThemes } from "@/lib/workspaceDefaults";
import { searchWorkspaceReferenceChunks } from "@/lib/ragService";
import { generateWorkspaceChapter } from "@/lib/workspacePublicApi";

// Credit cost is now dynamic from useBillingCatalog

export function JurnalChapterAiAssistant({
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
  isMobile = false,
  onTriggerContextFill,
}) {
  const { user, userData, refreshUserData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [isOpen, setIsOpen] = useState(false);
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

  const chapter = (workspaceContext?.journalSections || [])[activeChapter] || { key: "unknown", label: "Bagian Jurnal", promptContext: "Susun draft ilmiah." };
  
  const config = useMemo(() => ({
    title: `Generate ${chapter.label}`,
    objective: chapter.promptContext || "Susun narasi jurnal sesuai konteks workspace dan referensi yang tersedia.",
    focus: "Gunakan bahasa akademik yang padat, rapi, dan sesuai standar publikasi jurnal. Hindari gaya penulisan yang bertele-tele.",
  }), [chapter]);
  const generationCost = toolMap["journal-chapter-generation"]?.creditCost ?? 2;

  const canGenerate = !!workspaceContext?.id && !!user;
  const selectedReferenceIds = selectedReferences.map((item) => item.id);
  const creditBalance = userData?.credits ?? 0;

  // Check if context has been filled
  const isContextEmpty = useMemo(() => {
    return !rootContext.rumusanMasalah && !rootContext.fenomenaUmum && !rootContext.faktaLapangan;
  }, [rootContext]);

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return;
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
      
      // Auto-RAG: Akan mencari di referensi terpilih, ATAU di SEMUA referensi workspace jika kosong
      const chunks = await searchWorkspaceReferenceChunks({
        userId: user.uid,
        workspaceId: workspaceContext.id,
        queryText: `${chapter.label} ${workspaceContext.title || ""} ${workspaceContext.topic || ""} ${instruction}`.trim(),
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
Anda adalah co-writer akademik untuk penyusunan naskah publikasi jurnal.
Tugas Anda adalah menulis bagian **${chapter.label}** dalam format HTML siap tempel.

ATURAN KELUARAN:
- Kembalikan HTML saja, tanpa markdown fence, tanpa pengantar tambahan.
- Gunakan hanya elemen: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>.
- Tulis dalam bahasa Indonesia akademik yang rapi, mengalir, dan tidak kaku.
- Jika konteks referensi tersedia, gunakan konteks itu untuk memperkaya isi.
- Kutipan/sitasi harus ditulis dalam format Penulis (Tahun) atau (Penulis, Tahun) secara konsisten dan akurat sesuai referensi terpilih. Jangan gunakan format sitasi angka seperti [1] atau format lainnya.
- PENTING: Terapkan prinsip anti-halusinasi yang ketat. Jika suatu informasi tidak terdapat dalam referensi/sumber yang terunggah, nyatakan secara jujur bahwa informasi tersebut tidak ada, dan hanya tulis fakta yang benar-benar tercantum dalam data referensi.
- Jangan mengada-ada data kuantitatif; jika data tidak cukup, tulis secara hati-hati dan netral.

TUJUAN BAB:
${config.objective}

FOKUS PENULISAN:
${config.focus}

KONTEKS WORKSPACE (BRAIN ROOT):
- Judul penelitian: ${workspaceContext.title || "Tanpa judul"}
- Topik/latar belakang singkat: ${workspaceContext.topic || "Belum ada topik"}
- Metodologi: ${workspaceContext.methodologyType || "kuantitatif"}
- Status dokumen: ${workspaceContext.status || "Draft"}
- Fenomena Umum: ${rootContext.fenomenaUmum || "Belum ada"}
- Fakta/Permasalahan Lapangan: ${rootContext.faktaLapangan || "Belum ada"}
- Rumusan Masalah: ${rootContext.rumusanMasalah || "Belum ada"}
- Metode Penelitian Utama: ${rootContext.metode || "Belum ada"}
${rootContext.gapAnalysis ? `- Gap Analysis: ${rootContext.gapAnalysis}` : ""}
${rootContext.kebaruanNovelty ? `- Kebaruan / Novelty: ${rootContext.kebaruanNovelty}` : ""}

KONTEN BAB SAAT INI:
${workspaceContext[chapter.key] || "(masih kosong)"}

FORM AKTIF:
${activeForm ? JSON.stringify({
        title: activeForm.title,
        description: activeForm.description,
        sectionCount: activeForm.sections?.length || 0,
        questionCount: activeForm.sections?.reduce((sum, section) => sum + (section.questions?.length || 0), 0) || 0,
      }, null, 2) : "Tidak ada form aktif."}

SNAPSHOT ANALISIS TERAKHIR:
${latestAnalysis ? JSON.stringify({
        responseCount: latestAnalysis.responseCount,
        cronbachAlpha: latestAnalysis.cronbachAlpha,
        narrative: latestAnalysis.narrative,
        interpretationNotes: latestAnalysis.interpretationNotes,
      }, null, 2) : "Belum ada snapshot analisis."}

RINGKASAN TRANSKRIP:
${transcriptSummary || "Belum ada transkrip."}
${thematicAnalysis ? `POIN-POIN TEMATIK HASIL ANALISIS DATA (Angket, Wawancara, Observasi):\n${thematicAnalysis}\n` : ""}

CATATAN WORKSPACE:
${notes || "Belum ada catatan tambahan."}

REFERENSI TERPILIH:
${selectedReferenceSummary || "Belum ada referensi yang ditandai untuk bab ini."}

KONTEKS EKSTRAK REFERENSI:
${referenceContext || "Belum ada chunk referensi yang tersedia."}

ARAHAN TAMBAHAN PENGGUNA:
${instruction || "Tidak ada arahan tambahan."}
      `.trim();

      const result = await generateWorkspaceChapter({
        prompt,
        group: "group_3",
        model: "gemini-2.5-flash",
        temperature: activeChapter === 3 ? 0.55 : 0.7,
      });

      onInsertContent(result.text);
      setStatus("Draft AI berhasil disisipkan ke editor.");
      setIsOpen(false);
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
          title="Workspace AI Writer"
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
              AI Bab
            </span>
          )}
        </button>
      ) : (
        <div className="glass-panel workspace-scroll" style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Workspace AI
              </div>
              <h4 style={{ fontSize: "0.98rem", margin: "0.2rem 0 0 0" }}>{config.title}</h4>
            </div>
            <button className="btn btn-ghost" onClick={() => setIsOpen(false)} style={{ padding: "0.3rem", flexShrink: 0 }} disabled={isGenerating}>
              <PremiumIcon name="x" size={14} />
            </button>
          </div>

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
                Lengkapi Konteks Utama (Brain Root) terlebih dahulu agar AI memahami arah penelitian Jurnal Anda.
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
          ) : (
            <>
              <div style={{ padding: isMobile ? "0.6rem" : "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)", border: "1px solid var(--border)", fontSize: isMobile ? "0.74rem" : "0.82rem" }}>
                <div><strong>Target:</strong> {chapter.label}</div>
                <div style={{ marginTop: "0.35rem" }}><strong>Pedoman:</strong> {chapter.promptContext || "Tidak ada pedoman spesifik."}</div>
                
                <div style={{ marginTop: "0.5rem", padding: isMobile ? "0.3rem 0.5rem" : "0.4rem 0.6rem", backgroundColor: "rgba(16, 185, 129, 0.1)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: isMobile ? "0.68rem" : "0.74rem" }}>
                  <PremiumIcon name="database" size={14} className="text-success" />
                  <span>
                    <strong>Sumber Data: </strong> 
                    {selectedReferences.length > 0 
                      ? `${selectedReferences.length} referensi dipilih` 
                      : "Auto-RAG (Semua referensi workspace)"}
                  </span>
                </div>
                
                <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: isMobile ? "0.72rem" : "0.78rem" }}>
                  <span><strong>Biaya:</strong> {generationCost} kredit</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", backgroundColor: "var(--primary-light)", color: "var(--primary)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontWeight: "bold" }}>
                    <PremiumIcon name="brainCircuit" size={12} />
                    <span>Context Ready</span>
                  </span>
                </div>
              </div>

              <textarea
                className="form-textarea"
                rows={isMobile ? 3 : 4}
                placeholder="Tambahkan instruksi khusus, misalnya fokuskan pada research gap, gaya penulisan, atau struktur subbab tertentu..."
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                disabled={isGenerating}
                style={{ opacity: isGenerating ? 0.6 : 1, cursor: isGenerating ? "not-allowed" : "text", fontSize: isMobile ? "0.74rem" : "0.8rem" }}
              />

              {status ? (
                <div
                  style={{
                    padding: isMobile ? "0.6rem" : "0.75rem",
                    borderRadius: "10px",
                    backgroundColor: status.includes("berhasil") ? "rgba(16,185,129,0.12)" : "rgba(79,70,229,0.08)",
                    color: status.includes("berhasil") ? "var(--success)" : "var(--text-main)",
                    fontSize: isMobile ? "0.74rem" : "0.8rem",
                  }}
                >
                  {status}
                </div>
              ) : null}

              <button className="btn btn-primary" onClick={() => void handleGenerate()} disabled={isGenerating || !canGenerate}>
                {isGenerating ? <LoadingSpinner size={15} className="text-white mr-2" /> : <PremiumIcon name="sparkles" size={15} />}
                {isGenerating ? "Menyusun Draft..." : "Generate Draft"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
