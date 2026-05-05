"use client";

import { useMemo, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useAuth } from "@/components/providers/AuthProvider";
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
}) {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [status, setStatus] = useState("");

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

  const handleGenerate = async () => {
    if (!canGenerate || creditBalance < generationCost) {
      setStatus(`Kredit tidak cukup. Butuh ${generationCost} kredit.`);
      return;
    }

    setStatus("");
    setIsGenerating(true);

    try {
      await deductCredits(user.uid, generationCost);

      let referenceContext = "";
      if (selectedReferenceIds.length) {
        const chunks = await searchWorkspaceReferenceChunks({
          userId: user.uid,
          workspaceId: workspaceContext.id,
          queryText: `${workspaceContext.title || ""} ${workspaceContext.topic || ""} ${instruction}`.trim(),
          referenceIds: selectedReferenceIds.slice(0, 10),
          limitCount: 8,
        });

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
- Jangan mengada-ada data kuantitatif; jika data tidak cukup, tulis secara hati-hati dan netral.

TUJUAN BAB:
${config.objective}

FOKUS PENULISAN:
${config.focus}

KONTEKS WORKSPACE:
- Judul penelitian: ${workspaceContext.title || "Tanpa judul"}
- Topik/latar belakang singkat: ${workspaceContext.topic || "Belum ada topik"}
- Metodologi: ${workspaceContext.methodologyType || "kuantitatif"}
- Status dokumen: ${workspaceContext.status || "Draft"}

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
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.85rem",
    boxShadow: "var(--shadow-lg)",
  };

  return (
    <div style={shellStyle}>
      {!isOpen ? (
        <button
          className="btn btn-primary"
          style={{
            borderRadius: "999px",
            padding: floating ? "0.85rem 1rem" : "0.75rem",
            boxShadow: "0 12px 24px rgba(79,70,229,0.28)",
          }}
          onClick={() => setIsOpen(true)}
          title="Workspace AI Writer"
        >
          <PremiumIcon name="sparkles" size={18} />
          {floating ? "AI Bab" : null}
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
            <button className="btn btn-ghost" onClick={() => setIsOpen(false)} style={{ padding: "0.3rem", flexShrink: 0 }}>
              <PremiumIcon name="x" size={14} />
            </button>
          </div>

          <div style={{ padding: "0.75rem", borderRadius: "10px", backgroundColor: "var(--background)", border: "1px solid var(--border)", fontSize: "0.82rem" }}>
            <div><strong>Target:</strong> {chapter.label}</div>
            <div style={{ marginTop: "0.35rem" }}><strong>Pedoman:</strong> {chapter.promptContext || "Tidak ada pedoman spesifik."}</div>
            <div style={{ marginTop: "0.35rem" }}><strong>Referensi aktif:</strong> {selectedReferences.length}</div>
            <div style={{ marginTop: "0.35rem" }}><strong>Biaya:</strong> {generationCost} kredit</div>
          </div>

          <textarea
            className="form-textarea"
            rows={4}
            placeholder="Tambahkan instruksi khusus, misalnya fokuskan pada research gap, gaya penulisan, atau struktur subbab tertentu..."
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />

          {status ? (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "10px",
                backgroundColor: status.includes("berhasil") ? "rgba(16,185,129,0.12)" : "rgba(79,70,229,0.08)",
                color: status.includes("berhasil") ? "var(--success)" : "var(--text-main)",
                fontSize: "0.8rem",
              }}
            >
              {status}
            </div>
          ) : null}

          <button className="btn btn-primary" onClick={() => void handleGenerate()} disabled={isGenerating || !canGenerate}>
            <PremiumIcon name={isGenerating ? "loader" : "sparkles"} size={15} className={isGenerating ? "animate-spin" : ""} />
            {isGenerating ? "Menyusun Draft..." : "Generate Draft"}
          </button>
        </div>
      )}
    </div>
  );
}
