import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { getEmbedding, getBatchEmbeddings } from "./callWorker";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

/**
 * Memecah teks menjadi potongan-potongan (chunks)
 */
export function chunkText(text, chunkSize = 2000, chunkOverlap = 200) {
  if (!text) return [];
  
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // Pastikan tidak memotong di tengah kata jika memungkinkan
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }

    chunks.push(text.substring(startIndex, endIndex).trim());
    startIndex = endIndex - chunkOverlap;
    
    // Safety break
    if (startIndex >= text.length - 10) break;
  }

  return chunks.filter(c => c.length > 50); // Filter chunk yang terlalu pendek
}

/**
 * Helper Cosine Similarity
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Menyimpan chunk dokumen ke Firestore dengan embedding
 */
function normalizeIndexArgs(userId, notebookIdOrOptions, documentId, title, text, cloudinaryUrl, author = "", year = "") {
  if (typeof notebookIdOrOptions === "object" && notebookIdOrOptions !== null) {
    const options = notebookIdOrOptions;
    return {
      userId,
      notebookId: options.notebookId || null,
      workspaceId: options.workspaceId || null,
      referenceId: options.referenceId || documentId,
      documentId: options.documentId || documentId,
      title: options.title || title,
      text: options.text || text,
      cloudinaryUrl: options.cloudinaryUrl || cloudinaryUrl,
      author: options.author || author,
      year: options.year || year,
    };
  }

  return {
    userId,
    notebookId: notebookIdOrOptions || null,
    workspaceId: null,
    referenceId: null,
    documentId,
    title,
    text,
    cloudinaryUrl,
    author,
    year,
  };
}

export async function indexDocument(userId, notebookIdOrOptions, documentId, title, text, cloudinaryUrl, author = "", year = "") {
  if (!db) {
    console.error("Firestore DB is not initialized in indexDocument");
    throw new Error("Sistem database belum siap. Silakan refresh halaman.");
  }

  try {
    const normalized = normalizeIndexArgs(
      userId,
      notebookIdOrOptions,
      documentId,
      title,
      text,
      cloudinaryUrl,
      author,
      year
    );
    // Batasi teks ke ~30 halaman (estimasi 1 halaman ~2 chunks = 60 chunks)
    const MAX_CHUNKS = 60;
    let chunks = chunkText(normalized.text);
    if (chunks.length > MAX_CHUNKS) {
        console.warn(`Text too long (${chunks.length} chunks). Truncating to ${MAX_CHUNKS} chunks (approx 30 pages).`);
        chunks = chunks.slice(0, MAX_CHUNKS);
    }

    console.log(`Indexing ${chunks.length} chunks for document: ${normalized.title}`);

    // Dapatkan embeddings dalam batch
    let allEmbeddings = [];
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await getBatchEmbeddings(batchChunks);
        allEmbeddings = allEmbeddings.concat(embeddings);
    }

    // Gabungkan teks dan vektor menjadi array
    const chunksData = chunks.map((chunk, idx) => ({
        id: `${normalized.documentId}_chunk_${idx}`,
        text_content: chunk,
        embedding_vector: allEmbeddings[idx],
        page_number: Math.floor(idx / 2) + 1
    }));

    const collectionRef = collection(db, "reference_chunks");
    await addDoc(collectionRef, {
      user_id: normalized.userId,
      notebook_id: normalized.notebookId,
      workspace_id: normalized.workspaceId,
      reference_id: normalized.referenceId || normalized.documentId,
      document_id: normalized.documentId,
      document_title: normalized.title,
      author: normalized.author,
      year: normalized.year,
      cloudinary_url: normalized.cloudinaryUrl,
      created_at: serverTimestamp(),
      chunks: chunksData // Option 1: Array of objects
    });

    console.log(`Document indexing completed: ${chunks.length} chunks saved to Firestore Array.`);
    return chunks.length;
  } catch (error) {
    console.error("Error in indexDocument:", error);
    throw error;
  }
}

// ── Simple IndexedDB Wrapper untuk Opsi 2 ──
const openCacheDB = () => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open("SkripzyRAGCache", 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("vectors")) {
                db.createObjectStore("vectors", { keyPath: "document_id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const getCachedVector = async (db, documentId) => {
    return new Promise((resolve) => {
        try {
            const tx = db.transaction("vectors", "readonly");
            const store = tx.objectStore("vectors");
            const req = store.get(documentId);
            req.onsuccess = () => resolve(req.result ? req.result.chunks : null);
            req.onerror = () => resolve(null);
        } catch(e) { resolve(null); }
    });
};

const setCachedVector = async (db, documentId, chunks) => {
    return new Promise((resolve) => {
        try {
            const tx = db.transaction("vectors", "readwrite");
            const store = tx.objectStore("vectors");
            store.put({ document_id: documentId, chunks });
            tx.oncomplete = () => resolve();
        } catch(e) { resolve(); }
    });
};

/**
 * Melakukan pencarian vektor (Semantic Search / Cosine Similarity) Client-Side
 */
export async function searchSimilarChunks(userId, queryText, documentIds = [], limitCount = 10) {
  if (!db || documentIds.length === 0) {
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) return [];

    let allChunks = [];
    const cacheDB = await openCacheDB().catch(() => null);
    const missingDocIds = [];

    // Cek cache IndexedDB
    for (const docId of documentIds) {
        let cached = null;
        if (cacheDB) cached = await getCachedVector(cacheDB, docId);
        
        if (cached && Array.isArray(cached)) {
            allChunks = allChunks.concat(cached);
        } else {
            missingDocIds.push(docId);
        }
    }

    // Fetch sisanya dari Firestore
    if (missingDocIds.length > 0) {
        // Firebase in query max 10
        const batchIds = missingDocIds.slice(0, 10);
        const q = query(
            collection(db, "reference_chunks"),
            where("document_id", "in", batchIds)
        );
        const snapshot = await getDocs(q);
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.chunks && Array.isArray(data.chunks)) {
                // Tambahkan metadata agar sama formatnya dengan chunking lama
                const enrichedChunks = data.chunks.map(c => ({
                    ...c,
                    document_id: data.document_id,
                    document_title: data.document_title,
                    workspace_id: data.workspace_id,
                    reference_id: data.reference_id,
                    cloudinary_url: data.cloudinary_url
                }));
                allChunks = allChunks.concat(enrichedChunks);
                if (cacheDB) await setCachedVector(cacheDB, data.document_id, enrichedChunks);
            }
        }
    }

    // Kalkulasi Cosine Similarity Client-side
    let results = [];
    for (const chunk of allChunks) {
        if (chunk.embedding_vector) {
            const similarity = cosineSimilarity(queryEmbedding, chunk.embedding_vector);
            results.push({
                id: chunk.id,
                similarity,
                ...chunk
            });
        }
    }

    // Sort semua berdasarkan similarity secara global
    results.sort((a, b) => b.similarity - a.similarity);

    // DIVERSIFIKASI HASIL: Pastikan setiap dokumen terpilih menyumbang chunk ke AI
    const finalResults = [];
    const chunksPerDoc = Math.max(1, Math.floor(limitCount / documentIds.length));
    const docCounts = {};

    // Putaran pertama: ambil top chunks secara adil dari masing-masing dokumen
    for (const res of results) {
        if (!docCounts[res.document_id]) docCounts[res.document_id] = 0;
        if (docCounts[res.document_id] < chunksPerDoc) {
            finalResults.push(res);
            docCounts[res.document_id]++;
        }
        if (finalResults.length >= limitCount) break;
    }

    // Putaran kedua: penuhi sisa kuota (jika masih ada) dengan chunk terbaik dari dokumen mana pun
    if (finalResults.length < limitCount) {
        for (const res of results) {
            if (finalResults.length >= limitCount) break;
            // Jika belum masuk di putaran pertama, masukkan sekarang
            const exists = finalResults.some(r => r.id === res.id);
            if (!exists) {
                finalResults.push(res);
            }
        }
    }

    // Sort ulang hasil akhir agar yang paling relevan selalu berada di atas/awal context
    finalResults.sort((a, b) => b.similarity - a.similarity);
    return finalResults;
  } catch (error) {
    console.error("Error in searchSimilarChunks:", error);
    return [];
  }
}

export async function searchWorkspaceReferenceChunks({
  userId,
  workspaceId,
  queryText,
  referenceIds = [],
  limitCount = 8,
}) {
  if (!workspaceId || !referenceIds.length) {
    return [];
  }

  const results = await searchSimilarChunks(userId, queryText, referenceIds, Math.max(limitCount, 5));
  return results
    .filter((item) => item.workspace_id === workspaceId || !item.workspace_id)
    .slice(0, limitCount);
}
