"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useAuth } from "@/components/providers/AuthProvider";
import { searchPapersWithFallback, getErrorMessage } from "@/lib/referenceApis";
import { indexDocument } from "@/lib/ragService";
import { extractTextFromPDF } from "@/lib/pdfText";
import { CHAPTERS } from "@/lib/workspaceDefaults";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

function buildBibtex(reference) {
  const author = Array.isArray(reference.authors) ? reference.authors.join(" and ") : reference.authorString || "Unknown";
  const keyBase = (reference.title || "referensi").split(" ").slice(0, 3).join("").toLowerCase();
  return `@article{${keyBase || "referensi"}${reference.year || ""},\n  title={${reference.title || "Tanpa Judul"}},\n  author={${author}},\n  year={${reference.year || ""}},\n  url={${reference.displayUrl || reference.url || ""}}\n}`;
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ReferenceManager({ workspaceId, currentChapterKey = null, onClose = null, compact = false }) {
  const { user } = useAuth();
  const [references, setReferences] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearRange, setYearRange] = useState("5");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploadingId, setUploadingId] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");

  useEffect(() => {
    if (!workspaceId) return undefined;

    const refsCollection = collection(db, "workspaces", workspaceId, "references");
    const unsubscribe = onSnapshot(refsCollection, (snapshot) => {
      const nextItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      nextItems.sort((left, right) => {
        const leftTime = left.updatedAt?.seconds || 0;
        const rightTime = right.updatedAt?.seconds || 0;
        return rightTime - leftTime;
      });
      setReferences(nextItems);
    });

    return unsubscribe;
  }, [workspaceId]);

  const chapterReferences = useMemo(() => {
    if (!currentChapterKey) return references;
    return references.filter((reference) => (reference.chapterKeys || []).includes(currentChapterKey));
  }, [currentChapterKey, references]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setError("");

    try {
      const result = await searchPapersWithFallback(searchTerm, { limit: 8, yearRange });
      setSearchResults(result.papers || []);
    } catch (searchError) {
      console.error(searchError);
      setError(getErrorMessage(searchError));
    } finally {
      setSearching(false);
    }
  };

  const handleImportReference = async (paper) => {
    await addDoc(collection(db, "workspaces", workspaceId, "references"), {
      title: paper.title,
      authors: paper.authors || [],
      authorString: paper.authorString,
      year: paper.year || "",
      abstract: paper.abstract || "",
      url: paper.url || "",
      displayUrl: paper.displayUrl || paper.url || "",
      venue: paper.venue || "",
      citationApa: `${paper.authorString} (${paper.year}). ${paper.title}. ${paper.venue || "Sumber tidak diketahui"}.`,
      chapterKeys: currentChapterKey ? [currentChapterKey] : [],
      notes: "",
      hasFullText: !!paper.hasFullText,
      pdfUrl: "",
      indexedAt: null,
      chunkCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const toggleSelected = (referenceId) => {
    setSelectedIds((current) =>
      current.includes(referenceId) ? current.filter((item) => item !== referenceId) : [...current, referenceId]
    );
  };

  const toggleChapterLink = async (reference, chapterKey) => {
    const nextChapterKeys = (reference.chapterKeys || []).includes(chapterKey)
      ? reference.chapterKeys.filter((item) => item !== chapterKey)
      : [...(reference.chapterKeys || []), chapterKey];

    await updateDoc(doc(db, "workspaces", workspaceId, "references", reference.id), {
      chapterKeys: nextChapterKeys,
      updatedAt: serverTimestamp(),
    });
  };

  const updateReferenceNotes = async (referenceId, notes) => {
    await updateDoc(doc(db, "workspaces", workspaceId, "references", referenceId), {
      notes,
      updatedAt: serverTimestamp(),
    });
  };

  const handleUploadPdf = async (reference, file) => {
    if (!file || !user) return;
    setUploadingId(reference.id);
    setUploadLabel("Mengekstrak PDF...");

    try {
      const text = await extractTextFromPDF(file);

      setUploadLabel("Meminta signature Cloudinary...");
      const signatureResponse = await fetch(`${WORKER_URL}/api/cloudinary-sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-skripzy-secret": WORKER_SECRET,
        },
        body: JSON.stringify({ folder: "Referensi" }),
      });

      if (!signatureResponse.ok) {
        throw new Error("Gagal mendapatkan signature Cloudinary.");
      }

      const { signature, timestamp, apiKey, cloudName } = await signatureResponse.json();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("folder", "Referensi");

      setUploadLabel("Mengunggah PDF...");
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload PDF ke Cloudinary gagal.");
      }

      const uploadData = await uploadResponse.json();

      setUploadLabel("Membangun index RAG...");
      const chunkCount = await indexDocument(
        user.uid,
        {
          workspaceId,
          referenceId: reference.id,
          documentId: reference.id,
          title: reference.title,
          text,
          cloudinaryUrl: uploadData.secure_url,
          author: reference.authorString || "",
          year: reference.year || "",
        }
      );

      await updateDoc(doc(db, "workspaces", workspaceId, "references", reference.id), {
        pdfUrl: uploadData.secure_url,
        fileName: file.name,
        indexedAt: serverTimestamp(),
        chunkCount,
        updatedAt: serverTimestamp(),
      });
    } catch (uploadError) {
      console.error("Gagal mengunggah referensi:", uploadError);
      setError(uploadError.message || "Gagal mengunggah PDF referensi.");
    } finally {
      setUploadingId("");
      setUploadLabel("");
    }
  };

  const handleExportBibtex = () => {
    const selectedReferences = references.filter((reference) => selectedIds.includes(reference.id));
    if (!selectedReferences.length) return;
    downloadText("skripzy-referensi.bib", selectedReferences.map((reference) => buildBibtex(reference)).join("\n\n"));
  };

  const handleExportApa = () => {
    const selectedReferences = references.filter((reference) => selectedIds.includes(reference.id));
    if (!selectedReferences.length) return;
    downloadText(
      "skripzy-referensi-apa.txt",
      selectedReferences
        .map((reference) => reference.citationApa || `${reference.authorString} (${reference.year}). ${reference.title}.`)
        .join("\n")
    );
  };

  const displayedReferences = compact ? chapterReferences.slice(0, 5) : references;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
      <div className="glass-panel" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Reference Hub</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem" }}>
              Cari jurnal, upload PDF, dan tandai referensi yang dipakai tiap bab.
            </p>
          </div>
          {onClose ? (
            <button className="btn btn-ghost" onClick={onClose}>
              <PremiumIcon name="x" size={16} />
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSearch} style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "minmax(0,1fr) 160px auto", gap: "0.65rem" }}>
          <input
            type="text"
            className="form-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari referensi ilmiah..."
          />
          {!compact ? (
            <select className="form-input" value={yearRange} onChange={(event) => setYearRange(event.target.value)}>
              <option value="3">3 tahun</option>
              <option value="5">5 tahun</option>
              <option value="10">10 tahun</option>
              <option value="all">Semua</option>
            </select>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={searching}>
            <PremiumIcon name="search" size={14} />
            {searching ? "Mencari..." : "Cari"}
          </button>
        </form>

        {error ? (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", color: "var(--danger)", fontSize: "0.82rem" }}>
            {error}
          </div>
        ) : null}

        {searchResults.length ? (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {searchResults.map((paper) => (
              <div key={paper.id} style={{ padding: "0.85rem", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>{paper.title}</div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      {paper.authorString} • {paper.year || "Tanpa tahun"} {paper.venue ? `• ${paper.venue}` : ""}
                    </div>
                  </div>
                  <button className="btn btn-outline" onClick={() => void handleImportReference(paper)}>
                    <PremiumIcon name="plus" size={14} />
                    Import
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="glass-panel" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", margin: 0 }}>Referensi Workspace</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem" }}>
                Pilih referensi untuk ekspor BibTeX atau APA.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline" onClick={handleExportBibtex} disabled={!selectedIds.length}>
                <PremiumIcon name="download" size={14} />
                BibTeX
              </button>
              <button className="btn btn-outline" onClick={handleExportApa} disabled={!selectedIds.length}>
                <PremiumIcon name="downloadCloud" size={14} />
                APA
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", overflowY: "auto", paddingRight: "0.15rem" }}>
        {displayedReferences.length === 0 ? (
          <div className="glass-panel" style={{ padding: "1.2rem", textAlign: "center" }}>
            <PremiumIcon name="bookMarked" size={30} className="text-muted" style={{ margin: "0 auto 0.65rem" }} />
            <h4 style={{ margin: 0 }}>Belum Ada Referensi</h4>
            <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.82rem" }}>
              Import jurnal dari pencarian di atas atau unggah PDF setelah referensi ditambahkan.
            </p>
          </div>
        ) : (
          displayedReferences.map((reference) => (
            <div key={reference.id} className="glass-panel" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                {!compact ? (
                  <input type="checkbox" checked={selectedIds.includes(reference.id)} onChange={() => toggleSelected(reference.id)} style={{ marginTop: "0.25rem" }} />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)" }}>{reference.title}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {reference.authorString || (reference.authors || []).join(", ")} • {reference.year || "Tanpa tahun"}
                      </div>
                    </div>
                    {reference.displayUrl ? (
                      <a href={reference.displayUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: "0.35rem" }}>
                        <PremiumIcon name="globe" size={15} />
                      </a>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.8rem" }}>
                    {CHAPTERS.map((chapter) => {
                      const selected = (reference.chapterKeys || []).includes(chapter.key);
                      return (
                        <button
                          key={`${reference.id}_${chapter.key}`}
                          className={`btn ${selected ? "btn-primary" : "btn-outline"}`}
                          style={{ padding: "0.28rem 0.55rem", fontSize: "0.72rem" }}
                          onClick={() => void toggleChapterLink(reference, chapter.key)}
                        >
                          {chapter.label}
                        </button>
                      );
                    })}
                  </div>

                  {!compact ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                        <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                          <PremiumIcon name="uploadCloud" size={14} />
                          {uploadingId === reference.id ? uploadLabel || "Memproses..." : reference.pdfUrl ? "Ganti PDF" : "Upload PDF"}
                          <input
                            type="file"
                            accept=".pdf"
                            style={{ display: "none" }}
                            onChange={(event) => void handleUploadPdf(reference, event.target.files?.[0])}
                          />
                        </label>
                        {reference.pdfUrl ? (
                          <a href={reference.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                            <PremiumIcon name="fileText" size={14} />
                            PDF
                          </a>
                        ) : null}
                        {reference.chunkCount ? (
                          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                            {reference.chunkCount} chunk terindeks
                          </span>
                        ) : null}
                      </div>

                      <textarea
                        className="form-textarea"
                        rows={3}
                        style={{ marginTop: "0.85rem" }}
                        defaultValue={reference.notes || ""}
                        placeholder="Catatan teori, kutipan penting, atau alasan memilih referensi ini..."
                        onBlur={(event) => void updateReferenceNotes(reference.id, event.target.value)}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
