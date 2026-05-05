"use client";

import { useState, useEffect, useRef, use } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { callGeminiStream, MODELS } from "@/lib/callWorker";
import { deductCredits } from "@/lib/credits";
import { indexDocument, searchSimilarChunks } from "@/lib/ragService";
import { collection, query, where, getDocs, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { searchPapersWithFallback, getErrorMessage } from "@/lib/referenceApis";
import AnimatedLoadingScreen from "@/components/workspace/AnimatedLoadingScreen";

// PDF.js import is now dynamically loaded in extractTextFromPDF to prevent SSR errors

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

// Credit costs are now dynamic from useBillingCatalog
const MAX_FILE_SIZE_MB = 3;
const MAX_JOURNALS_PER_NOTEBOOK = 10;

export default function NotebookDetailPage({ params }) {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const credits = userData?.credits ?? 0;

  // Dynamic costs from useBillingCatalog
  const indexingCost = toolMap["notebook-referensi"]?.creditCost ?? 5;
  const queryCost = toolMap["notebook-referensi"]?.creditCost ?? 1; // Same tool, different operation

  // In Next.js 15, params is a promise
  const unwrappedParams = use(params);
  const notebookId = unwrappedParams.id;

  const [notebook, setNotebook] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const [selectedDocForViewer, setSelectedDocForViewer] = useState(null);
  const [viewerPage, setViewerPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Search state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchYear, setSearchYear] = useState("5");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchApiAttempt, setSearchApiAttempt] = useState("core");
  const [searchError, setSearchError] = useState("");

  // Local query caching
  const [queryCache, setQueryCache] = useState({});

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (user && notebookId) {
      fetchNotebookDetails();
      fetchDocuments();
    }
  }, [user, notebookId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchNotebookDetails = async () => {
    try {
      const q = query(collection(db, "notebooks"), where("user_id", "==", user.uid));
      const snapshot = await getDocs(q);
      const nb = snapshot.docs.find(doc => doc.id === notebookId);
      if (nb) {
        setNotebook({ id: nb.id, ...nb.data() });
      }
    } catch (err) {
      console.error("Error fetching notebook details:", err);
    }
  };

  const fetchDocuments = async () => {
    if (!notebookId) return;
    try {
      const q = query(
        collection(db, "reference_chunks"),
        where("user_id", "==", user.uid),
        where("notebook_id", "==", notebookId)
      );
      const snapshot = await getDocs(q);

      const docsMap = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!docsMap[data.document_id]) {
          docsMap[data.document_id] = {
            id: data.document_id,
            title: data.document_title,
            url: data.cloudinary_url,
            createdAt: data.created_at?.toDate() || new Date()
          };
        }
      });

      const docsArray = Object.values(docsMap);
      docsArray.sort((a, b) => b.createdAt - a.createdAt);
      setDocuments(docsArray);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const extractTextFromPDF = async (file) => {
    // Dynamic import to prevent SSR issues on Firebase/Vercel
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += `[Halaman ${i}]\n` + strings.join(" ") + "\n\n";
    }

    return fullText;
  };

  const processFiles = async (files) => {
    if (!user) return;

    // Filter files
    const pdfFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith(".pdf"));

    if (pdfFiles.length === 0) {
      alert("Hanya file PDF yang diperbolehkan.");
      return;
    }

    let processedCount = 0;

    for (const file of pdfFiles) {
      if (documents.length + processedCount >= MAX_JOURNALS_PER_NOTEBOOK) {
        alert(`Maksimal ${MAX_JOURNALS_PER_NOTEBOOK} jurnal per notebook. Upload dihentikan.`);
        break;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`Ukuran file ${file.name} terlalu besar (maks ${MAX_FILE_SIZE_MB}MB). Dilewati.`);
        continue;
      }

      if (credits < indexingCost) {
        alert(`Kredit tidak cukup untuk memproses ${file.name}. Butuh ${indexingCost} kredit.`);
        break;
      }

      setIsUploading(true);
      setUploadProgress(`Membaca dokumen ${file.name}...`);

      try {
        console.log(`Starting PDF text extraction for ${file.name}...`);
        const text = await extractTextFromPDF(file);

        setUploadProgress(`Menyiapkan ruang penyimpanan...`);
        const sigRes = await fetch(`${WORKER_URL}/api/cloudinary-sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-skripzy-secret": WORKER_SECRET },
          body: JSON.stringify({ folder: "Referensi" })
        });

        if (!sigRes.ok) throw new Error(`Cloudinary signature failed: ${sigRes.status}`);

        const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("signature", signature);
        formData.append("timestamp", timestamp);
        formData.append("api_key", apiKey);
        formData.append("folder", "Referensi");

        setUploadProgress(`Menyiapkan unggahan...`);
        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) throw new Error(`Cloudinary upload failed: ${uploadRes.status}`);

        const uploadData = await uploadRes.json();

        setUploadProgress(`Menyusun pemahaman AI untuk dokumen...`);
        const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await indexDocument(user.uid, notebookId, docId, file.name, text, uploadData.secure_url);

        await deductCredits(user.uid, indexingCost);
        processedCount++;

        await fetchDocuments();
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        alert(`Gagal memproses ${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);
    setUploadProgress("");
  };

  const handleUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const getCloudinaryPublicId = (url) => {
    try {
      if (!url) return null;
      const parts = url.split('/');
      const folderIndex = parts.findIndex(p => p === 'Referensi');
      if (folderIndex !== -1) {
        const fileWithExt = parts.slice(folderIndex).join('/');
        return fileWithExt.split('.')[0];
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleDeleteDoc = async (e, docToDelete) => {
    e.stopPropagation();
    if (!confirm(`Apakah Anda yakin ingin menghapus jurnal "${docToDelete.title}"?`)) return;

    try {
      // 1. Hapus dari Firestore
      const q = query(
        collection(db, "reference_chunks"),
        where("document_id", "==", docToDelete.id)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();

      // 2. Hapus dari Cloudinary
      const publicId = getCloudinaryPublicId(docToDelete.url);
      if (publicId) {
        await fetch(`${WORKER_URL}/api/cloudinary-delete`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-skripzy-secret": WORKER_SECRET 
          },
          body: JSON.stringify({ publicId })
        });
      }

      // 3. Update UI
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id));
      setSelectedDocs(prev => prev.filter(id => id !== docToDelete.id));
      alert("Jurnal berhasil dihapus.");
    } catch (err) {
      console.error("Gagal menghapus dokumen:", err);
      alert("Terjadi kesalahan saat menghapus dokumen.");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isQuerying || !user) {
      console.log("Query blocked:", { hasInput: !!input.trim(), isQuerying, hasUser: !!user });
      return;
    }

    if (credits < queryCost) {
      alert(`Kredit tidak cukup. Butuh ${queryCost} kredit.`);
      return;
    }

    console.log("Starting query process...");
    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);

    // Cek cache
    const cacheKey = input.trim().toLowerCase();
    if (queryCache[cacheKey]) {
      console.log("Cache hit for query:", input);
      setMessages(prev => [...prev, { role: "assistant", text: queryCache[cacheKey] }]);
      setInput("");
      return;
    }

    setInput("");
    setIsQuerying(true);

    try {
      console.log(`Searching for chunks with ${selectedDocs.length} selected documents...`);
      // 1. Cari chunk relevan (tingkatkan limit dari 5 ke 12 agar konteks lebih kaya)
      const chunks = await searchSimilarChunks(user.uid, input, selectedDocs, 12);
      console.log(`Found ${chunks.length} relevant chunks`);

      // 2. Rakit context
      const context = chunks.map((c, i) =>
        `[Document ID: ${c.document_id} | Judul: ${c.document_title} | Hal: ${c.page_number}]:\n${c.text_content}`
      ).join("\n\n");
      console.log(`Context length: ${context.length} characters`);

      const systemInstruction = `Kamu adalah Asisten Notebook Skripzy. Tugasmu adalah menjawab pertanyaan pengguna HANYA berdasarkan referensi yang diberikan di bawah ini.
      
REFERENSI:
${context}

ATURAN:
1. Jawab dalam bahasa Indonesia yang profesional namun mudah dimengerti.
2. Jika jawaban tidak ada di referensi, katakan "Maaf, informasi tersebut tidak ditemukan dalam referensi yang Anda pilih."
3. WAJIB memberikan sitasi di akhir setiap poin atau paragraf menggunakan format Markdown Link.
   Contoh format yang BENAR: \`[Nama Penulis/Judul, Hal X](#doc_12345)\`
   Pastikan kamu mengambil \`Document ID\` dan \`Hal\` dari bagian referensi di atas untuk mengisi link dan teks.
4. Fokus pada fakta yang ada di teks.`;

      const aiMessage = { role: "assistant", text: "" };
      setMessages(prev => [...prev, aiMessage]);

      console.log("Starting AI streaming response...");
      let fullAiResponse = "";
      await callGeminiStream({
        prompt: input,
        systemInstruction,
        model: MODELS.primary,
        onStream: (text) => {
          fullAiResponse = text;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = text;
            return updated;
          });
        }
      });

      console.log("AI response completed, deducting credits...");

      // Simpan ke cache
      setQueryCache(prev => ({ ...prev, [cacheKey]: fullAiResponse }));

      // Potong kredit query
      await deductCredits(user.uid, queryCost);
      console.log("Query process completed successfully");

    } catch (err) {
      console.error("Query error:", err);
      setMessages(prev => [...prev, { role: "assistant", text: "Maaf, terjadi kesalahan: " + err.message }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);
    setSearchApiAttempt("core");
    try {
      const result = await searchPapersWithFallback(searchQuery, { limit: 10, yearRange: searchYear });
      setSearchResults(result.papers);
      setSearchApiAttempt(result.source);
      if (result.papers.length === 0) {
        setSearchError("Tidak ditemukan hasil. Coba ubah kata kunci.");
      }
    } catch (err) {
      setSearchError(getErrorMessage(err));
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (paper) => {
    if (documents.length >= MAX_JOURNALS_PER_NOTEBOOK) {
      alert(`Maksimal ${MAX_JOURNALS_PER_NOTEBOOK} jurnal per notebook.`);
      return;
    }
    if (credits < indexingCost) {
      alert(`Kredit tidak cukup. Butuh ${indexingCost} kredit.`);
      return;
    }

    setIsUploading(true);
    setShowSearchModal(false); // Close modal
    setUploadProgress(`Mengambil ${paper.title}...`);

    try {
      // 1. Ambil PDF (coba langsung, fallback ke allorigins proxy jika CORS diblokir)
      let res;
      try {
        res = await fetch(paper.pdfUrl);
        if (!res.ok) throw new Error("Direct fetch failed");
      } catch (directErr) {
        // Fallback to allorigins public proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(paper.pdfUrl)}`;
        res = await fetch(proxyUrl);
      }
      
      if (!res.ok) throw new Error(`Gagal mengambil PDF: HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], `${paper.title.substring(0, 30)}.pdf`, { type: "application/pdf" });

      setUploadProgress("Mengekstrak teks...");
      // 2. Ekstrak teks
      const text = await extractTextFromPDF(file);
      
      setUploadProgress("Membuat index vektor (AI)...");
      // 3. Index ke Firestore menggunakan URL external
      const docId = `doc_${Date.now()}`;
      await indexDocument(user.uid, notebookId, docId, paper.title, text, paper.pdfUrl);

      // 4. Potong kredit
      await deductCredits(user.uid, indexingCost);
      
      setUploadProgress("Selesai!");
      fetchDocuments();
    } catch (err) {
      console.error("Add from search error:", err);
      alert("Gagal menambahkan referensi: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const openPdfViewer = (doc) => {
    setSelectedDocForViewer(doc);
    setViewerPage(1);
  };

  const closePdfViewer = () => {
    setSelectedDocForViewer(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", color: "var(--text-main)", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/dashboard/tools/notebook" style={{ color: "var(--text-muted)", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--text-main)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
            <PremiumIcon name="arrowLeft" size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{notebook ? notebook.title : "Notebook Referensi"}</h1>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>{notebook ? notebook.description : "Kelola jurnal & tanya jawab berbasis RAG"}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.75rem",
              borderRadius: "var(--radius-sm)", border: "1px solid", transition: "all 0.2s",
              backgroundColor: isSidebarOpen ? "var(--primary)" : "var(--surface-hover)",
              color: isSidebarOpen ? "white" : "var(--text-main)",
              borderColor: isSidebarOpen ? "var(--primary)" : "var(--border)",
              cursor: "pointer"
            }}
          >
            <PremiumIcon name="bookMarked" size={16} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{isSidebarOpen ? "Tutup Referensi" : "Pilih Referensi"}</span>
            {selectedDocs.length > 0 && !isSidebarOpen && (
              <span style={{ marginLeft: "0.25rem", backgroundColor: "var(--primary)", color: "white", fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", fontWeight: "bold" }}>
                {selectedDocs.length}
              </span>
            )}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.75rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <PremiumIcon name="zap" size={14} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{credits} Kredit</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, gap: "1.5rem", minHeight: 0, position: "relative", overflow: "hidden" }}>
        {/* Sidebar: Documents */}
        <div style={{
          display: "flex", flexDirection: "column", transition: "all 0.3s ease-in-out", height: "100%", overflow: "hidden",
          width: isSidebarOpen ? "320px" : "0px", opacity: isSidebarOpen ? 1 : 0, margin: 0
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1, minHeight: 0, width: "320px", boxShadow: "var(--shadow-md)",
              border: isDragging ? "2px dashed var(--primary)" : "1px solid var(--border)",
              backgroundColor: isDragging ? "rgba(79, 70, 229, 0.05)" : "var(--background)",
              transition: "all 0.2s ease"
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", justifyContent: "space-between" }}>
              <h3 style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>Referensi Saya</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => setShowSearchModal(true)} 
                  style={{ padding: 0, background: "transparent", border: "none", cursor: "pointer", display: "flex" }} 
                  disabled={isUploading}
                >
                  <div style={{ padding: "0.4rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success)", borderRadius: "var(--radius-sm)", transition: "background-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.2)"} onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.1)"}>
                    <PremiumIcon name="search" size={16} />
                  </div>
                </button>
                <label style={{ cursor: "pointer", display: "flex", margin: 0 }}>
                  <input type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={handleUpload} disabled={isUploading} />
                  <div style={{ padding: "0.4rem", backgroundColor: "rgba(79, 70, 229, 0.1)", color: "var(--primary)", borderRadius: "var(--radius-sm)", transition: "background-color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(79, 70, 229, 0.2)"} onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(79, 70, 229, 0.1)"}>
                    <PremiumIcon name="plus" size={16} />
                  </div>
                </label>
              </div>
            </div>

            {isUploading && (
              <div style={{ padding: "0.75rem", backgroundColor: "rgba(79, 70, 229, 0.05)", border: "1px solid rgba(79, 70, 229, 0.2)", borderRadius: "var(--radius-sm)" }} className="animate-pulse">
                <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--primary)", marginBottom: "0.25rem", margin: 0 }}>{uploadProgress}</p>
                <div style={{ height: "4px", backgroundColor: "rgba(79, 70, 229, 0.2)", borderRadius: "9999px", overflow: "hidden", marginTop: "0.5rem" }}>
                  <div className="animate-progress-loading" style={{ height: "100%", backgroundColor: "var(--primary)", width: "60%" }}></div>
                </div>
              </div>
            )}

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", paddingRight: "0.25rem" }}>
              {documents.length === 0 && !isUploading && (
                <div style={{ textAlign: "center", padding: "2.5rem 0", opacity: 0.5, pointerEvents: "none" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}><PremiumIcon name="fileText" size={32} /></div>
                  <p style={{ fontSize: "0.75rem", margin: 0 }}>Belum ada jurnal.<br />Klik + atau tarik (drag & drop) file PDF ke sini.</p>
                </div>
              )}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid", transition: "all 0.2s", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "0.75rem",
                    borderColor: selectedDocs.includes(doc.id) ? "var(--primary)" : "var(--border)",
                    backgroundColor: selectedDocs.includes(doc.id) ? "rgba(79, 70, 229, 0.05)" : "var(--surface-hover)"
                  }}
                  onClick={() => toggleDocSelection(doc.id)}
                >
                  <div style={{
                    marginTop: "0.125rem", width: "16px", height: "16px", borderRadius: "4px", border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", transition: "colors 0.2s", flexShrink: 0,
                    backgroundColor: selectedDocs.includes(doc.id) ? "var(--primary)" : "transparent",
                    borderColor: selectedDocs.includes(doc.id) ? "var(--primary)" : "var(--border)"
                  }}>
                    {selectedDocs.includes(doc.id) && <PremiumIcon name="check" size={10} style={{ color: "white" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</p>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                      {doc.createdAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openPdfViewer(doc); }}
                      style={{ padding: "0.25rem", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                      onMouseOver={(e) => e.currentTarget.style.color = "var(--primary)"}
                      onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                      title="Lihat PDF"
                    >
                      <PremiumIcon name="eye" size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteDoc(e, doc)}
                      style={{ padding: "0.25rem", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                      onMouseOver={(e) => e.currentTarget.style.color = "var(--danger)"}
                      onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                      title="Hapus PDF"
                    >
                      <PremiumIcon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
              <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                * Pilih jurnal di atas untuk mengaktifkan konteks chat. Indexing membutuhkan 5 kredit.
              </p>
            </div>
          </div>
        </div>

        {/* Main: Chat */}
        <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat Messages */}
          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {messages.length === 0 && (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "24rem", margin: "0 auto" }}>
                <div style={{ width: "64px", height: "64px", backgroundColor: "rgba(79, 70, 229, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                  <PremiumIcon name="messageSquare" size={32} style={{ color: "var(--primary)" }} />
                </div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem", margin: 0 }}>Mulai Diskusi</h2>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
                  Unggah jurnal penelitianmu, centang di sidebar, lalu tanyakan apa saja. AI akan menjawab berdasarkan referensi tersebut.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "1rem", borderRadius: "1rem",
                  backgroundColor: msg.role === "user" ? "var(--primary)" : "var(--surface-hover)",
                  color: msg.role === "user" ? "white" : "var(--text-main)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border)",
                  borderTopRightRadius: msg.role === "user" ? 0 : "1rem",
                  borderTopLeftRadius: msg.role === "user" ? "1rem" : 0
                }}>
                  <div className={`markdown-body ${msg.role === "user" ? "text-white" : ""}`}>
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => {
                          if (props.href && props.href.startsWith("#doc_")) {
                            return (
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const docId = props.href.substring(1);
                                  const doc = documents.find(d => d.id === docId);
                                  if (doc) {
                                    // Parse page if possible e.g. [Hal 5](#doc_123)
                                    const pageMatch = props.children[0]?.match(/Hal\.?\s*(\d+)/i);
                                    openPdfViewer(doc);
                                    if (pageMatch) setViewerPage(parseInt(pageMatch[1]));
                                  }
                                }}
                                style={{
                                  backgroundColor: "rgba(79, 70, 229, 0.1)",
                                  color: "var(--primary)",
                                  padding: "0.1rem 0.3rem",
                                  borderRadius: "0.25rem",
                                  textDecoration: "none",
                                  fontWeight: 600,
                                  cursor: "pointer"
                                }}
                              >
                                {props.children}
                              </a>
                            );
                          }
                          return <a {...props} />;
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", backgroundColor: "rgba(255, 255, 255, 0.02)" }}>
            <form onSubmit={handleSendMessage} style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  placeholder={selectedDocs.length > 0 ? "Tanyakan sesuatu tentang referensi..." : "Pilih referensi di sidebar terlebih dahulu..."}
                  style={{
                    width: "100%", backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "0.75rem",
                    padding: "0.75rem 1rem", paddingRight: "3rem", outline: "none", fontSize: "0.875rem", color: "var(--text-main)",
                    transition: "border-color 0.2s"
                  }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={selectedDocs.length === 0 || isQuerying}
                  onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
                <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isQuerying ? (
                    <div style={{ width: "20px", height: "20px", border: "2px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin-slow"></div>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim() || selectedDocs.length === 0}
                      style={{
                        padding: "0.4rem", backgroundColor: "var(--primary)", color: "white", borderRadius: "0.5rem", border: "none",
                        cursor: (!input.trim() || selectedDocs.length === 0) ? "not-allowed" : "pointer",
                        opacity: (!input.trim() || selectedDocs.length === 0) ? 0.3 : 1,
                        transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center"
                      }}
                    >
                      <PremiumIcon name="send" size={16} />
                    </button>
                  )}
                </div>
              </div>
            </form>
            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "1rem", fontSize: "0.65rem", color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <PremiumIcon name="zap" size={10} /> {queryCost} kredit / tanya
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <PremiumIcon name="check" size={10} /> Konteks: {selectedDocs.length} Jurnal
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        
        @keyframes progress-loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-progress-loading {
          animation: progress-loading 1.5s infinite linear;
        }
        
        .markdown-body p { margin-bottom: 0.5rem; }
        .markdown-body p:last-child { margin-bottom: 0; }
      `}</style>

      {/* PDF Viewer Modal */}
      {selectedDocForViewer && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", maxWidth: "56rem", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", height: "85vh" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>{selectedDocForViewer.title}</h3>
              <button
                onClick={closePdfViewer}
                style={{ padding: "0.25rem", background: "transparent", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-main)" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <PremiumIcon name="x" size={18} />
              </button>
            </div>
            <div style={{ flex: 1, padding: "1rem", minHeight: 0 }}>
              <iframe
                src={`${selectedDocForViewer.url}#page=${viewerPage}`}
                style={{ width: "100%", height: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                title={selectedDocForViewer.title}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem", borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setViewerPage(Math.max(1, viewerPage - 1))}
                disabled={viewerPage <= 1}
                style={{ padding: "0.5rem", background: "transparent", border: "none", cursor: viewerPage <= 1 ? "not-allowed" : "pointer", borderRadius: "var(--radius-sm)", opacity: viewerPage <= 1 ? 0.3 : 1, color: "var(--text-main)" }}
                onMouseOver={(e) => { if (viewerPage > 1) e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <PremiumIcon name="chevronLeft" size={16} />
              </button>
              <span style={{ fontSize: "0.875rem", padding: "0 0.75rem" }}>Halaman {viewerPage}</span>
              <button
                onClick={() => setViewerPage(viewerPage + 1)}
                style={{ padding: "0.5rem", background: "transparent", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-main)" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <PremiumIcon name="chevronRight" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Reference Modal */}
      {showSearchModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setShowSearchModal(false)}>
          <div style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", maxWidth: "56rem", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", height: "85vh" }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PremiumIcon name="search" size={18} style={{ color: "var(--success)" }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>Cari Referensi Jurnal</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>Temukan dan tambahkan jurnal global tanpa perlu mengunduh</p>
                </div>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                style={{ padding: "0.25rem", background: "transparent", border: "none", cursor: "pointer", borderRadius: "var(--radius-sm)", color: "var(--text-main)" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <PremiumIcon name="x" size={18} />
              </button>
            </div>

            {/* Search Input Area */}
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-hover)" }}>
              <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Contoh: Machine learning in education"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, minWidth: "200px", padding: "0.6rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--text-main)", outline: "none", fontSize: "0.875rem" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
                <select
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--text-main)", outline: "none", fontSize: "0.875rem" }}
                >
                  <option value="3">3 Tahun Terakhir</option>
                  <option value="5">5 Tahun Terakhir</option>
                  <option value="10">10 Tahun Terakhir</option>
                  <option value="all">Semua Tahun</option>
                </select>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-sm)", background: "linear-gradient(135deg, #10B981, #059669)", color: "white", border: "none", cursor: (!searchQuery.trim() || isSearching) ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", opacity: (!searchQuery.trim() || isSearching) ? 0.5 : 1 }}
                >
                  {isSearching ? "Mencari..." : "Cari"}
                </button>
              </form>
            </div>

            {/* Search Results */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "1rem", backgroundColor: "var(--background)" }}>
              {searchError && (
                <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <PremiumIcon name="alertCircle" size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>{searchError}</p>
                </div>
              )}

              {isSearching && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <AnimatedLoadingScreen isLoading={true} apiAttempt={searchApiAttempt} />
                </div>
              )}

              {!isSearching && searchResults.length === 0 && !searchError && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", opacity: 0.5 }}>
                  <PremiumIcon name="search" size={48} style={{ marginBottom: "1rem" }} />
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>Cari referensi untuk ditambahkan ke notebook ini.</p>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Menampilkan hasil pencarian dari sumber terpercaya (Core UK / OpenAlex / Unpaywall)
                  </p>
                  
                  {searchResults.map((paper, idx) => (
                    <div key={idx} style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--surface-hover)" }}>
                      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600 }}>{paper.title}</h4>
                      <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {paper.authorString} • {paper.year || "Tahun tidak diketahui"} {paper.venue ? `• ${paper.venue}` : ""}
                      </p>
                      
                      <p style={{ fontSize: "0.85rem", lineHeight: 1.5, margin: "0 0 1rem 0", color: "var(--text-main)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {paper.abstract || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Abstrak tidak tersedia.</span>}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        {paper.hasFullText ? (
                          <>
                            <button
                              onClick={() => handleAddFromSearch(paper)}
                              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", backgroundColor: "rgba(79, 70, 229, 0.1)", color: "var(--primary)", border: "1px solid rgba(79, 70, 229, 0.2)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(79, 70, 229, 0.2)"}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(79, 70, 229, 0.1)"}
                            >
                              <PremiumIcon name="plus" size={14} />
                                  Tambahkan ke Notebook (-{indexingCost} Kredit)
                            </button>
                            <a
                              href={paper.displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", backgroundColor: "transparent", color: "var(--text-main)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "var(--surface-hover)"}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              <PremiumIcon name="eye" size={14} />
                              Preview PDF
                            </a>
                          </>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: 600 }}>
                            <PremiumIcon name="alertCircle" size={14} />
                            Full-Text PDF Tidak Tersedia Terbuka
                          </div>
                        )}
                        {paper.url && paper.url.startsWith("http") && (
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "underline" }}
                          >
                            Sumber Asli
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
