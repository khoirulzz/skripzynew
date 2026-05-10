"use client";

import { useEffect, useMemo, useState } from "react";
import { d1Request } from "@/lib/d1Client";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useAuth } from "@/components/providers/AuthProvider";
import { searchPapersWithFallback, getErrorMessage } from "@/lib/referenceApis";
import { indexDocument } from "@/lib/ragService";
import { extractTextFromPDF } from "@/lib/pdfText";
import { CHAPTERS } from "@/lib/workspaceDefaults";
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

function buildPdfPreviewUrl(url = "") {
  if (!url) return "";
  return `${url}${url.includes("#") ? "" : "#toolbar=0&navpanes=0&scrollbar=1"}`;
}

function normalizeText(value = "") {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeUrl(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

function parseAuthors(authorString = "") {
  return authorString
    .split(/,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildReferenceFingerprint(reference = {}) {
  const doi = normalizeText(reference.doi || reference.DOI || "");
  if (doi) return `doi:${doi}`;

  const url = normalizeUrl(reference.url || reference.displayUrl || reference.pdfUrl || "");
  if (url) return `url:${url}`;

  const title = normalizeText(reference.title || "");
  const year = String(reference.year || "").trim();
  if (title) return `title:${title}|year:${year}`;

  return "";
}

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

function createManualReferenceState() {
  return {
    title: "",
    authorString: "",
    year: "",
    venue: "",
    url: "",
    abstract: "",
  };
}

export function ReferenceManager({ workspaceId, currentChapterKey = null, onClose = null, compact = false }) {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [references, setReferences] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [yearRange, setYearRange] = useState("5");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploadingId, setUploadingId] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualReference, setManualReference] = useState(createManualReferenceState());
  const [expandedReferenceIds, setExpandedReferenceIds] = useState([]);
  const [expandedNoteIds, setExpandedNoteIds] = useState([]);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [previewReference, setPreviewReference] = useState(null);

  // Credit cost configuration (default 1 credit per search)
  const REFERENCE_SEARCH_COST = toolMap["referensi-ringkas"]?.creditCost ?? 1;
  const creditBalance = userData?.credits ?? 0;

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchRefs() {
      try {
        const resp = await d1Request("workspace_references");
        const nextItems = (resp.data || []).filter(r => r.workspace_id === workspaceId);
        nextItems.sort((left, right) => {
          const leftTime = new Date(left.updated_at || 0).getTime();
          const rightTime = new Date(right.updated_at || 0).getTime();
          return rightTime - leftTime;
        });
        if (!isMounted) return;
        setReferences(nextItems);
        setNoteDrafts((current) => {
          const nextDrafts = { ...current };
          nextItems.forEach((item) => {
            if (!(item.id in nextDrafts)) {
              nextDrafts[item.id] = item.notes || "";
            }
          });
          Object.keys(nextDrafts).forEach((referenceId) => {
            if (!nextItems.some((item) => item.id === referenceId)) {
              delete nextDrafts[referenceId];
            }
          });
          return nextDrafts;
        });
      } catch (e) {
        console.error("Failed to fetch references:", e);
      }
    }

    fetchRefs();
    const interval = setInterval(fetchRefs, 8000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [workspaceId]);

  const chapterReferences = useMemo(() => {
    if (!currentChapterKey) return references;
    return references.filter((reference) => (reference.chapterKeys || []).includes(currentChapterKey));
  }, [currentChapterKey, references]);

  const importedReferenceMap = useMemo(() => {
    const nextMap = new Map();
    references.forEach((reference) => {
      const fingerprint = reference.fingerprint || buildReferenceFingerprint(reference);
      if (fingerprint && !nextMap.has(fingerprint)) {
        nextMap.set(fingerprint, reference);
      }
    });
    return nextMap;
  }, [references]);

  const findExistingReference = (source) => {
    const fingerprint = buildReferenceFingerprint(source);
    if (fingerprint && importedReferenceMap.has(fingerprint)) {
      return importedReferenceMap.get(fingerprint);
    }

    const normalizedTitle = normalizeText(source.title || "");
    const year = String(source.year || "").trim();

    return (
      references.find((reference) => {
        const sameTitle = normalizeText(reference.title || "") === normalizedTitle;
        const sameYear = String(reference.year || "").trim() === year;
        return sameTitle && sameYear;
      }) || null
    );
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    
    // Check credit balance before search
    if (!user) {
      setError("Silakan login untuk mencari referensi.");
      return;
    }
    if (creditBalance < REFERENCE_SEARCH_COST) {
      setError(`Kredit tidak cukup. Dibutuhkan ${REFERENCE_SEARCH_COST} kredit, tersisa ${creditBalance}.`);
      return;
    }

    setSearching(true);
    setError("");

    try {
      // Deduct credits for search
      await deductCredits(user.uid, REFERENCE_SEARCH_COST);

      const result = await searchPapersWithFallback(searchTerm, { limit: 8, yearRange });
      setSearchResults(result.papers || []);
    } catch (searchError) {
      // Refund credits if search fails
      if (user) {
        await refundCredits(user.uid, REFERENCE_SEARCH_COST).catch(() => {});
      }
      console.error(searchError);
      setError(getErrorMessage(searchError));
    } finally {
      setSearching(false);
    }
  };

  const saveReference = async (payload) => {
    const id = crypto.randomUUID();
    await d1Request("workspace_references", {
      method: "POST",
      body: {
        id,
        workspace_id: workspaceId,
        title: payload.title || "",
        authorString: payload.authorString || "",
        year: payload.year || "",
        pdfUrl: payload.pdfUrl || "",
        venue: payload.venue || "",
        chunkCount: payload.chunkCount || 0,
        fileName: payload.fileName || "",
        notes: payload.notes || "",
        chapterKeys: JSON.stringify(payload.chapterKeys || []),
        url: payload.url || payload.displayUrl || "",
        displayUrl: payload.displayUrl || payload.url || "",
        abstract: payload.abstract || "",
        citationApa: payload.citationApa || "",
        hasFullText: payload.hasFullText ? 1 : 0,
        fingerprint: payload.fingerprint || "",
        sourceType: payload.sourceType || "search",
      }
    });
    // Optimistic update
    setReferences(prev => [{ id, ...payload, workspace_id: workspaceId, chapterKeys: payload.chapterKeys || [] }, ...prev]);
  };

  const handleImportReference = async (paper) => {
    const existingReference = findExistingReference(paper);
    if (existingReference) {
      setError("Referensi ini sudah ada di workspace.");
      return;
    }

    await saveReference({
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
      fingerprint: buildReferenceFingerprint(paper),
      sourceType: "search",
    });
    setError("");
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    if (!manualReference.title.trim()) {
      setError("Judul referensi manual wajib diisi.");
      return;
    }

    const payload = {
      ...manualReference,
      authorString: manualReference.authorString.trim(),
      authors: parseAuthors(manualReference.authorString),
      year: manualReference.year.trim(),
      url: manualReference.url.trim(),
      displayUrl: manualReference.url.trim(),
      venue: manualReference.venue.trim(),
      abstract: manualReference.abstract.trim(),
      citationApa: `${manualReference.authorString || "Penulis"} (${manualReference.year || "tanpa tahun"}). ${manualReference.title}. ${manualReference.venue || "Sumber pribadi"}.`,
      chapterKeys: currentChapterKey ? [currentChapterKey] : [],
      notes: "",
      hasFullText: false,
      pdfUrl: "",
      indexedAt: null,
      chunkCount: 0,
      fingerprint: buildReferenceFingerprint(manualReference),
      sourceType: "manual",
    };

    const existingReference = findExistingReference(payload);
    if (existingReference) {
      setError("Referensi manual ini sudah ada di workspace.");
      return;
    }

    await saveReference(payload);
    setManualReference(createManualReferenceState());
    setManualOpen(false);
    setError("");
  };

  const toggleSelected = (referenceId) => {
    setSelectedIds((current) =>
      current.includes(referenceId) ? current.filter((item) => item !== referenceId) : [...current, referenceId]
    );
  };

  const toggleReferenceExpanded = (referenceId) => {
    setExpandedReferenceIds((current) =>
      current.includes(referenceId) ? current.filter((item) => item !== referenceId) : [...current, referenceId]
    );
  };

  const toggleNotesExpanded = (referenceId) => {
    setExpandedNoteIds((current) =>
      current.includes(referenceId) ? current.filter((item) => item !== referenceId) : [...current, referenceId]
    );
  };

  const toggleChapterLink = async (reference, chapterKey) => {
    const currentKeys = Array.isArray(reference.chapterKeys) ? reference.chapterKeys : JSON.parse(reference.chapterKeys || "[]");
    const nextChapterKeys = currentKeys.includes(chapterKey)
      ? currentKeys.filter((item) => item !== chapterKey)
      : [...currentKeys, chapterKey];

    await d1Request("workspace_references", {
      method: "PATCH",
      id: reference.id,
      body: { chapterKeys: JSON.stringify(nextChapterKeys) }
    });
    // Optimistic update
    setReferences(prev => prev.map(r => r.id === reference.id ? { ...r, chapterKeys: nextChapterKeys } : r));
  };

  const updateReferenceNotes = async (referenceId, notes) => {
    setNoteDrafts((current) => ({ ...current, [referenceId]: notes }));
    await d1Request("workspace_references", {
      method: "PATCH",
      id: referenceId,
      body: { notes }
    });
  };

  const handleDeleteReference = async (reference) => {
    const confirmed = window.confirm(`Hapus referensi "${reference.title}" dari workspace?`);
    if (!confirmed) return;

    await d1Request("workspace_references", { method: "DELETE", id: reference.id });
    setReferences(prev => prev.filter(r => r.id !== reference.id));
    setSelectedIds((current) => current.filter((item) => item !== reference.id));
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
      const chunkCount = await indexDocument(user.uid, {
        workspaceId,
        referenceId: reference.id,
        documentId: reference.id,
        title: reference.title,
        text,
        cloudinaryUrl: uploadData.secure_url,
        author: reference.authorString || "",
        year: reference.year || "",
      });

      await d1Request("workspace_references", {
        method: "PATCH",
        id: reference.id,
        body: {
          pdfUrl: uploadData.secure_url,
          fileName: file.name,
          chunkCount,
        }
      });
      // Optimistic update
      setReferences(prev => prev.map(r => r.id === reference.id ? { ...r, pdfUrl: uploadData.secure_url, fileName: file.name, chunkCount } : r));
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
      <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>Reference Hub</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.82rem" }}>
              Cari jurnal, tambah referensi manual, upload PDF, dan tandai referensi untuk tiap bab.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {!compact ? (
              <button className={`btn ${manualOpen ? "btn-primary" : "btn-outline"}`} onClick={() => setManualOpen((current) => !current)}>
                <PremiumIcon name={manualOpen ? "x" : "plus"} size={14} />
                {manualOpen ? "Tutup Manual" : "Tambah Manual"}
              </button>
            ) : null}
            {onClose ? (
              <button className="btn btn-ghost" onClick={onClose}>
                <PremiumIcon name="x" size={16} />
              </button>
            ) : null}
          </div>
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

        {manualOpen && !compact ? (
          <form onSubmit={handleManualSubmit} className="glass-panel" style={{ marginTop: "0.9rem", padding: "1rem", backgroundColor: "var(--background)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
              <div>
                <h4 style={{ fontSize: "0.94rem", margin: 0 }}>Tambah Referensi Manual</h4>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.78rem" }}>Masukkan jurnal atau sumber referensi milik Anda sendiri.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
              <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                <label className="form-label">Judul Referensi</label>
                <input className="form-input" value={manualReference.title} onChange={(event) => setManualReference((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Penulis</label>
                <input className="form-input" value={manualReference.authorString} onChange={(event) => setManualReference((current) => ({ ...current, authorString: event.target.value }))} placeholder="Pisahkan dengan koma" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tahun</label>
                <input className="form-input" value={manualReference.year} onChange={(event) => setManualReference((current) => ({ ...current, year: event.target.value }))} placeholder="2025" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Jurnal / Venue</label>
                <input className="form-input" value={manualReference.venue} onChange={(event) => setManualReference((current) => ({ ...current, venue: event.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">URL</label>
                <input className="form-input" value={manualReference.url} onChange={(event) => setManualReference((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." />
              </div>
              <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                <label className="form-label">Abstrak / Catatan Singkat</label>
                <textarea className="form-textarea" rows={3} value={manualReference.abstract} onChange={(event) => setManualReference((current) => ({ ...current, abstract: event.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.85rem" }}>
              <button className="btn btn-primary" type="submit">
                <PremiumIcon name="plus" size={14} />
                Simpan Referensi
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", color: "var(--danger)", fontSize: "0.82rem" }}>
            {error}
          </div>
        ) : null}

        {searchResults.length ? (
          <div className="workspace-scroll" style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem", maxHeight: compact ? "220px" : "320px", paddingRight: "0.15rem" }}>
            {searchResults.map((paper) => {
              const importedReference = findExistingReference(paper);

              return (
                <div key={paper.id} style={{ padding: "0.85rem", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>{paper.title}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {paper.authorString} | {paper.year || "Tanpa tahun"} {paper.venue ? `| ${paper.venue}` : ""}
                      </div>
                    </div>
                    <button className={`btn ${importedReference ? "btn-outline" : "btn-primary"}`} onClick={() => void handleImportReference(paper)} disabled={!!importedReference}>
                      <PremiumIcon name={importedReference ? "checkCircle" : "plus"} size={14} />
                      {importedReference ? "Sudah Diimpor" : "Import"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", margin: 0 }}>Referensi Workspace</h3>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem" }}>
                Pilih referensi untuk ekspor BibTeX atau APA, lalu kelola file dan catatan per sumber.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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

      <div className="workspace-scroll" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", overflowY: "auto", paddingRight: "0.15rem", flex: 1, minHeight: 0, maxHeight: compact ? "360px" : "calc(100vh - 300px)" }}>
        {displayedReferences.length === 0 ? (
          <div className="glass-panel" style={{ padding: "1.2rem", textAlign: "center", backgroundColor: "var(--surface)" }}>
            <PremiumIcon name="bookMarked" size={30} className="text-muted" style={{ margin: "0 auto 0.65rem" }} />
            <h4 style={{ margin: 0 }}>Belum Ada Referensi</h4>
            <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.82rem" }}>
              Import jurnal dari pencarian di atas, tambah manual, atau unggah PDF setelah referensi ditambahkan.
            </p>
          </div>
        ) : (
          displayedReferences.map((reference) => {
            const isExpanded = expandedReferenceIds.includes(reference.id);
            const isNotesExpanded = expandedNoteIds.includes(reference.id);

            return (
            <div key={reference.id} className="glass-panel" style={{ padding: "1rem", backgroundColor: "var(--surface)" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                {!compact ? (
                  <input type="checkbox" checked={selectedIds.includes(reference.id)} onChange={() => toggleSelected(reference.id)} style={{ marginTop: "0.25rem" }} />
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)" }}>{reference.title}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {reference.authorString || (reference.authors || []).join(", ")} | {reference.year || "Tanpa tahun"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      {reference.displayUrl ? (
                        <a href={reference.displayUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: "0.35rem" }} title="Buka sumber">
                          <PremiumIcon name="download" size={15} />
                        </a>
                      ) : null}
                      {reference.pdfUrl ? (
                        <button className="btn btn-ghost" style={{ padding: "0.35rem" }} onClick={() => setPreviewReference(reference)} title="Preview PDF">
                          <PremiumIcon name="eye" size={15} />
                        </button>
                      ) : null}
                      {!compact ? (
                        <button className="btn btn-ghost" style={{ padding: "0.35rem", color: "var(--danger)" }} onClick={() => void handleDeleteReference(reference)} title="Hapus referensi">
                          <PremiumIcon name="trash" size={15} />
                        </button>
                      ) : null}
                      <button className="btn btn-ghost" style={{ padding: "0.35rem" }} onClick={() => toggleReferenceExpanded(reference.id)} title={isExpanded ? "Tutup detail" : "Buka detail"}>
                        <PremiumIcon name={isExpanded ? "chevronDown" : "chevronRight"} size={15} />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ padding: "0.8rem", borderRadius: "12px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.7rem" }}>
                          <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Tautkan ke Bab
                          </span>
                        </div>
                        <div className="workspace-scroll" style={{ display: "flex", gap: "0.45rem", overflowX: "auto", paddingBottom: "0.15rem" }}>
                          {CHAPTERS.map((chapter) => {
                            const selected = (reference.chapterKeys || []).includes(chapter.key);
                            return (
                              <button
                                key={`${reference.id}_${chapter.key}`}
                                className={`btn ${selected ? "btn-primary" : "btn-outline"}`}
                                style={{ padding: "0.28rem 0.55rem", fontSize: "0.72rem", flexShrink: 0 }}
                                onClick={() => void toggleChapterLink(reference, chapter.key)}
                              >
                                {chapter.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {!compact ? (
                        <div style={{ padding: "0.8rem", borderRadius: "12px", border: "1px solid var(--border)", backgroundColor: "var(--background)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
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
                              <>
                                <button className="btn btn-ghost" onClick={() => setPreviewReference(reference)}>
                                  <PremiumIcon name="eye" size={14} />
                                  Preview PDF
                                </button>
                                <a href={reference.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                                  <PremiumIcon name="fileText" size={14} />
                                  PDF
                                </a>
                              </>
                            ) : null}
                            {reference.chunkCount ? (
                              <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                {reference.chunkCount} chunk terindeks
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {!compact ? (
                        <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", backgroundColor: "var(--background)" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ width: "100%", justifyContent: "space-between", padding: "0.8rem 0.9rem", borderRadius: 0, color: "var(--text-main)" }}
                            onClick={() => toggleNotesExpanded(reference.id)}
                          >
                            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>Catatan Referensi</span>
                            <PremiumIcon name={isNotesExpanded ? "chevronDown" : "chevronRight"} size={15} />
                          </button>
                          {isNotesExpanded ? (
                            <div style={{ padding: "0.85rem", borderTop: "1px solid var(--border)" }}>
                              <textarea
                                className="form-textarea"
                                rows={4}
                                value={noteDrafts[reference.id] ?? reference.notes ?? ""}
                                placeholder="Catatan teori, kutipan penting, atau alasan memilih referensi ini..."
                                onChange={(event) =>
                                  setNoteDrafts((current) => ({ ...current, [reference.id]: event.target.value }))
                                }
                                onBlur={(event) => void updateReferenceNotes(reference.id, event.target.value)}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>

      {previewReference?.pdfUrl ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            backgroundColor: "rgba(11,15,25,0.62)",
            backdropFilter: "blur(4px)",
            padding: "4.75rem 1rem 1rem",
          }}
        >
          <div className="glass-panel" style={{ width: "min(1080px, 100%)", height: "calc(100vh - 5.75rem)", maxHeight: "860px", margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(79,70,229,0.08), transparent)" }}>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: "1rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{previewReference.title}</h3>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem" }}>
                  {previewReference.fileName || "Preview PDF referensi"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <a href={previewReference.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-outline">
                  <PremiumIcon name="download" size={14} />
                  Buka File
                </a>
                <button className="btn btn-ghost" onClick={() => setPreviewReference(null)}>
                  <PremiumIcon name="x" size={16} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, backgroundColor: "#eef2ff", padding: "0.85rem" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(79,70,229,0.12)", backgroundColor: "white" }}>
              <iframe
                src={buildPdfPreviewUrl(previewReference.pdfUrl)}
                title={`Preview ${previewReference.title}`}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
