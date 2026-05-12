import { getEmbedding, getBatchEmbeddings } from "./callWorker";
import { d1Request } from "./d1Client";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

/**
 * Memecah teks menjadi potongan-potongan (chunks)
 * Diupdate: Max 25 chunk, chunkSize 2000 char.
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
 * Menyimpan chunk dokumen ke Vectorize dan metadata ke D1
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

    // Batasi teks ke max 25 chunks untuk Vectorize
    const MAX_CHUNKS = 25;
    let chunks = chunkText(normalized.text, 2000, 200);
    if (chunks.length > MAX_CHUNKS) {
        console.warn(`Text too long (${chunks.length} chunks). Truncating to ${MAX_CHUNKS} chunks.`);
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

    // Siapkan vektor untuk Cloudflare Vectorize
    const rawVectors = chunks.map((chunk, idx) => ({
        id: `${normalized.documentId}_chunk_${idx}`,
        values: allEmbeddings[idx],
        metadata: {
            user_id: normalized.userId,
            notebook_id: normalized.notebookId || "",
            workspace_id: normalized.workspaceId || "",
            document_id: normalized.documentId,
            document_title: normalized.title,
            page_number: Math.floor(idx / 2) + 1, // Estimasi sederhana halaman
            text_content: chunk, // Simpan teks langsung di metadata Vectorize
            cloudinary_url: normalized.cloudinaryUrl || ""
        }
    }));

    // Filter vektor yang tidak valid (embedding kosong/undefined)
    const vectors = rawVectors.filter((v, idx) => {
        if (!Array.isArray(v.values) || v.values.length === 0) {
            console.warn(`[RAG] Skipping chunk ${idx} — embedding invalid or missing.`);
            return false;
        }
        return true;
    });

    if (vectors.length === 0) {
        throw new Error("No valid embeddings generated. Check getBatchEmbeddings response.");
    }

    // Simpan ke Vectorize via Worker Endpoint
    const vecRes = await fetch(`${WORKER_URL}/api/vector/upsert`, {
        method: "POST",
        headers: {
            "x-skripzy-secret": WORKER_SECRET,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ vectors })
    });

    if (!vecRes.ok) {
        let errBody = "(no body)";
        try {
            errBody = await vecRes.text();
        } catch (_) {}
        console.error(`[RAG] Vectorize upsert failed — status: ${vecRes.status}, body:`, errBody);
        throw new Error(`Failed to insert into Vectorize (${vecRes.status}): ${errBody}`);
    }

    // Simpan metadata dokumen ke D1
    await d1Request("document_metadata", {
        method: "POST",
        body: {
            id: normalized.documentId,
            workspace_id: normalized.workspaceId,
            notebook_id: normalized.notebookId,
            reference_id: normalized.referenceId || normalized.documentId,
            document_title: normalized.title,
            author: normalized.author,
            year: normalized.year,
            cloudinary_url: normalized.cloudinaryUrl
        }
    });

    console.log(`Document indexing completed: ${chunks.length} chunks saved to Vectorize.`);
    return chunks.length;
  } catch (error) {
    console.error("Error in indexDocument:", error);
    throw error;
  }
}

/**
 * Melakukan pencarian vektor ke Cloudflare Vectorize (Server-Side Search)
 */
export async function searchSimilarChunks(userId, queryText, documentIds = [], limitCount = 10) {
  if (documentIds.length === 0) {
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) return [];

    // Kita harus query satu persatu filter per doc_id atau pakai inArray jika didukung worker filter.
    // Vectorize mendukung metadata filtering. Kita fetch topK yang lebih besar lalu filter.
    // Atau query untuk setiap dokumen dan gabungkan hasilnya.
    
    let allMatches = [];
    
    // Jika vectorize belum mendukung filter `$in`, query satu per satu:
    for (const docId of documentIds) {
        const res = await fetch(`${WORKER_URL}/api/vector/query`, {
            method: "POST",
            headers: {
                "x-skripzy-secret": WORKER_SECRET,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                vector: queryEmbedding,
                topK: Math.max(3, Math.floor(limitCount / documentIds.length) + 1),
                filter: { document_id: docId },
                returnMetadata: true
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.matches) {
                allMatches = allMatches.concat(data.matches);
            }
        }
    }

    // Sort semua berdasarkan skor kemiripan secara global
    allMatches.sort((a, b) => b.score - a.score);

    // Format kembali agar sesuai dengan struktur UI lama
    const results = allMatches.slice(0, limitCount).map(match => ({
        id: match.id,
        similarity: match.score,
        document_id: match.metadata.document_id,
        document_title: match.metadata.document_title,
        page_number: match.metadata.page_number,
        text_content: match.metadata.text_content,
        cloudinary_url: match.metadata.cloudinary_url,
        notebook_id: match.metadata.notebook_id,
        workspace_id: match.metadata.workspace_id,
    }));

    return results;
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
