"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { extractTextFromPDF } from "@/lib/pdfText";
import * as XLSX from "xlsx";

function createDraft() {
  return {
    title: "",
    role: "",
    interviewDate: "",
    tags: "",
    excerpt: "",
    content: "",
  };
}

export function TranscriptManager({ workspaceId, category = "wawancara" }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [transcripts, setTranscripts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(createDraft());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchTranscripts() {
      try {
        const resp = await d1Request("workspace_transcripts");
        const rawItems = resp.data || [];
        
        // Parse JSON content for backwards-compatible metadata
        const parsedItems = rawItems.filter(t => t.workspace_id === workspaceId).map(t => {
          let parsedContent = { role: "", interviewDate: "", tags: [], excerpt: "", category: "wawancara", text: t.content || "" };
          try {
            if (t.content && t.content.trim().startsWith("{")) {
              const parsed = JSON.parse(t.content);
              parsedContent = {
                role: parsed.role || "",
                interviewDate: parsed.interviewDate || "",
                tags: parsed.tags || [],
                excerpt: parsed.excerpt || "",
                category: parsed.category || "wawancara",
                text: parsed.text || "",
              };
            }
          } catch (e) {
            console.error("Gagal parse transkrip content JSON:", e);
          }
          return {
            ...t,
            ...parsedContent,
          };
        });

        // Filter by category
        const nextItems = parsedItems.filter(item => item.category === category);
        nextItems.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        
        if (!isMounted) return;
        setTranscripts(nextItems);
        
        // Auto-select first transcript if none selected
        if (!selectedId && nextItems[0]) {
          setSelectedId(nextItems[0].id);
          setDraft({
            title: nextItems[0].title || "",
            role: nextItems[0].role || "",
            interviewDate: nextItems[0].interviewDate || "",
            tags: Array.isArray(nextItems[0].tags) ? nextItems[0].tags.join(", ") : "",
            excerpt: nextItems[0].excerpt || "",
            content: nextItems[0].text || "",
          });
        }
      } catch (e) {
        console.error("Failed to fetch transcripts:", e);
      }
    }

    fetchTranscripts();
    const interval = setInterval(fetchTranscripts, 8000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [workspaceId, selectedId, category]);

  const selectedTranscript = useMemo(
    () => transcripts.find((item) => item.id === selectedId) || null,
    [selectedId, transcripts]
  );

  const handleCreate = async () => {
    const id = crypto.randomUUID();
    const contentPayload = JSON.stringify({
      role: "",
      interviewDate: "",
      tags: [],
      excerpt: "",
      category: category,
      text: "",
    });
    
    await d1Request("workspace_transcripts", {
      method: "POST",
      body: {
        id,
        workspace_id: workspaceId,
        title: category === "observasi" ? "Catatan Observasi Baru" : "Transkrip Baru",
        content: contentPayload,
      }
    });

    const newItem = {
      id,
      workspace_id: workspaceId,
      title: category === "observasi" ? "Catatan Observasi Baru" : category === "angket" ? "Data Angket Baru" : "Transkrip Baru",
      content: contentPayload,
      role: "",
      interviewDate: "",
      tags: [],
      excerpt: "",
      category: category,
      text: "",
    };

    setTranscripts(prev => [newItem, ...prev]);
    setSelectedId(id);
    setDraft({
      title: newItem.title,
      role: "",
      interviewDate: "",
      tags: "",
      content: "",
    });
  };

  const handleFileUpload = async (eventOrFile) => {
    let file = eventOrFile.target ? eventOrFile.target.files?.[0] : eventOrFile;
    if (!file) return;

    setUploading(true);
    let text = "";
    try {
      if (file.name.endsWith(".pdf")) {
        text = await extractTextFromPDF(file);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: "array" });
              let combinedText = "";
              workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                combinedText += `[Sheet: ${sheetName}]\n${csv}\n\n`;
              });
              resolve(combinedText.trim());
            } catch (err) {
              reject(new Error("Gagal membaca file Excel/CSV."));
            }
          };
          reader.onerror = (e) => reject(new Error("Gagal membaca file Excel/CSV."));
          reader.readAsArrayBuffer(file);
        });
      } else {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result || "");
          reader.onerror = (e) => reject(new Error("Gagal membaca file TXT."));
          reader.readAsText(file);
        });
      }

      const id = crypto.randomUUID();
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      const contentPayload = JSON.stringify({
        role: "",
        interviewDate: "",
        tags: [],
        category: category,
        text: text,
      });

      await d1Request("workspace_transcripts", {
        method: "POST",
        body: {
          id,
          workspace_id: workspaceId,
          title: cleanTitle,
          content: contentPayload,
        }
      });

      const newItem = {
        id,
        workspace_id: workspaceId,
        title: cleanTitle,
        content: contentPayload,
        role: "",
        interviewDate: "",
        tags: [],
        category: category,
        text: text,
      };

      setTranscripts(prev => [newItem, ...prev]);
      setSelectedId(id);
      setDraft({
        title: cleanTitle,
        role: "",
        interviewDate: "",
        tags: "",
        content: text,
      });
    } catch (err) {
      console.error(err);
      alert("Gagal membaca atau memproses dokumen: " + err.message);
    } finally {
      setUploading(false);
      if (eventOrFile.target) eventOrFile.target.value = ""; // reset input
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const contentPayload = JSON.stringify({
        role: draft.role,
        interviewDate: draft.interviewDate,
        tags: draft.tags.split(",").map(item => item.trim()).filter(Boolean),
        category: category,
        text: draft.content,
      });

      await d1Request("workspace_transcripts", {
        method: "PATCH",
        id: selectedId,
        body: {
          title: draft.title,
          content: contentPayload,
        }
      });

      setTranscripts(prev => prev.map(t => {
        if (t.id === selectedId) {
          return {
            ...t,
            title: draft.title,
            content: contentPayload,
            role: draft.role,
            interviewDate: draft.interviewDate,
            tags: draft.tags.split(",").map(item => item.trim()).filter(Boolean),
            text: draft.content,
          };
        }
        return t;
      }));
    } catch (error) {
      console.error("Gagal menyimpan transkrip:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const isObservasi = category === "observasi";
    const label = isObservasi ? "catatan observasi" : "transkrip wawancara";
    const confirmed = window.confirm(`Hapus ${label} "${draft.title}"?`);
    if (!confirmed) return;

    await d1Request("workspace_transcripts", { method: "DELETE", id: selectedId });
    setTranscripts(prev => prev.filter(t => t.id !== selectedId));
    setSelectedId(null);
    setDraft(createDraft());
  };

  const isObservasi = category === "observasi";
  const isAngket = category === "angket";
  const managerTitle = isAngket ? "Data Hasil Angket" : isObservasi ? "Observasi & Catatan Lapangan" : "Transkrip Wawancara";
  const managerDesc = isAngket ? "Unggah tabulasi (Excel/CSV/PDF) atau paste hasil survei/angket." : isObservasi ? "Unggah atau tulis hasil observasi langsung." : "Unggah rekaman transkrip atau ketik manual hasil wawancara.";
  const acceptFileTypes = isAngket ? ".pdf,.csv,.xlsx,.xls" : ".pdf,.txt";

  const isDirty = useMemo(() => {
    if (!selectedId) return false;
    const current = transcripts.find(t => t.id === selectedId);
    if (!current) return false;
    
    const currentTagsStr = Array.isArray(current.tags) ? current.tags.join(", ") : "";
    
    return (
      draft.title !== (current.title || "") ||
      draft.role !== (current.role || "") ||
      draft.interviewDate !== (current.interviewDate || "") ||
      draft.tags !== currentTagsStr ||
      draft.content !== (current.text || "")
    );
  }, [selectedId, transcripts, draft]);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(260px, 320px) minmax(0, 1fr)", gap: "1rem", minHeight: isMobile ? "auto" : "520px" }}>
      <div 
        className="glass-panel" 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ 
          padding: "1rem", 
          display: "flex", 
          flexDirection: "column", 
          gap: "0.85rem", 
          backgroundColor: isDragOver ? "var(--primary-light)" : "var(--surface)", 
          maxHeight: isMobile ? "50vh" : "auto",
          border: isDragOver ? "2px dashed var(--primary)" : "none",
          transition: "all 0.2s"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
          <div>
            <h3 style={{ fontSize: "0.96rem", margin: 0, fontWeight: 700 }}>{managerTitle}</h3>
            <p style={{ fontSize: "0.74rem", margin: "0.2rem 0 0 0", color: "var(--text-muted)", lineHeight: 1.3 }}>{managerDesc}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1, minWidth: "100px", padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
            <PremiumIcon name="plus" size={13} />
            <span>Tambah</span>
          </button>
          
          <label className="btn btn-outline" style={{ cursor: "pointer", margin: 0, display: "inline-flex", flex: 1, minWidth: "140px", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}>
            <PremiumIcon name="uploadCloud" size={13} />
            <span style={{ whiteSpace: "nowrap" }}>{uploading ? "Extracting..." : isAngket ? "Upload Excel/PDF" : "Upload PDF/TXT"}</span>
            <input
              type="file"
              accept={acceptFileTypes}
              style={{ display: "none" }}
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="workspace-scroll" style={{ display: "flex", flexDirection: "column", gap: "0.65rem", overflowY: "auto", flex: 1, maxHeight: isMobile ? "200px" : "400px" }}>
          {transcripts.length === 0 ? (
            <div style={{ padding: "1.5rem 1rem", border: "1px dashed var(--border)", borderRadius: "10px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Belum ada data.
            </div>
          ) : (
            transcripts.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  setDraft({
                    title: item.title || "",
                    role: item.role || "",
                    interviewDate: item.interviewDate || "",
                    tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
                    content: item.text || "",
                  });
                }}
                className="btn btn-ghost"
                style={{
                  display: "block",
                  textAlign: "left",
                  padding: "0.75rem",
                  border: item.id === selectedId ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                  borderRadius: "10px",
                  backgroundColor: item.id === selectedId ? "var(--primary-light)" : "var(--background)",
                  width: "100%",
                }}
              >
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title || "Tanpa Judul"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  {item.role || (isAngket ? "Data Responden" : isObservasi ? "Observasi" : "Informan")} {item.interviewDate ? `• ${item.interviewDate}` : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem", backgroundColor: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div>
            <h3 style={{ fontSize: "0.96rem", margin: 0, fontWeight: 700 }}>Editor</h3>
            <p style={{ fontSize: "0.74rem", margin: "0.2rem 0 0 0", color: "var(--text-muted)" }}>Simpan kutipan penting dan tag tema untuk dianalisis AI.</p>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={!selectedId || saving || !isDirty} style={{ padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}>
              <PremiumIcon name="save" size={13} />
              <span>{saving ? "Menyimpan..." : "Simpan"}</span>
            </button>
            <button className="btn btn-outline" style={{ color: "var(--danger)", padding: "0.4rem", minWidth: "32px" }} onClick={handleDelete} disabled={!selectedId}>
              <PremiumIcon name="trash" size={13} />
            </button>
          </div>
        </div>

        {!selectedId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "10px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            Pilih atau buat item baru untuk mulai mengedit.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.74rem" }}>Judul / Topik</label>
                <input className="form-input" style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.74rem" }}>{isAngket ? "Keterangan/Kelompok" : isObservasi ? "Lokasi / Subjek" : "Peran Informan"}</label>
                <input className="form-input" style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }} value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))} placeholder={isAngket ? "mis. Angkatan 2021" : isObservasi ? "mis. Ruang Kelas" : "mis. Guru"} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.74rem" }}>Tanggal</label>
                <input type="date" className="form-input" style={{ fontSize: "0.8rem", padding: "0.35rem 0.6rem" }} value={draft.interviewDate} onChange={(event) => setDraft((current) => ({ ...current, interviewDate: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.74rem" }}>Tag Tema</label>
                <input className="form-input" style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }} placeholder="mis. motivasi, kendala, dukungan" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0, flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="form-label" style={{ fontSize: "0.74rem" }}>{isAngket ? "Isi Data Angket (Teks/CSV)" : "Isi Transkrip / Deskripsi Detail"}</label>
              <textarea className="form-textarea" rows={10} style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem", flex: 1, resize: "none" }} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
