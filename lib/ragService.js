import { getEmbedding, getBatchEmbeddings } from "./callWorker";
import { d1Request } from "./d1Client";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

/**
 * Memecah teks menjadi potongan-potongan (chunks)
 * Max 25 chunk, chunkSize 2000 char.
 */
export function chunkText(text, chunkSize = 2000, chunkOverlap = 200) {
  if (!text) return [];
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) endIndex = lastSpace;
    }
    chunks.push(text.substring(startIndex, endIndex).trim());
    startIndex = endIndex - chunkOverlap;
    if (startIndex >= text.length - 10) break;
  }
  return chunks.filter(c => c.length > 50);
}

/**
 * Generate AI summary dari dokumen akademik.
 * Mengekstrak: judul, penulis, tahun, abstrak, tujuan, metode, temuan utama, keywords.
 * Hasilnya disimpan ke D1 dan selalu tersedia sebagai "guaranteed context" tanpa vector search.
 */
async function generateDocumentSummary(title, text) {
  try {
    const excerpt = text.substring(0, 5000);
    const prompt = `Analisis kutipan dokumen akademik berikut dan ekstrak informasi kunci dalam format JSON.

"""
${excerpt}
"""

Buat JSON dengan field berikut (isi dengan teks ringkas, maks 3 kalimat per field, jika tidak ditemukan isi "-"):
{"judul": "...", "penulis": "...", "tahun": "...", "abstrak": "...", "tujuan": "...", "metode": "...", "temuan_utama": "...", "keywords": "..."}`;

    const res = await fetch(`${WORKER_URL}/v1beta/models/gemini-flash-lite-latest:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-skripzy-secret": WORKER_SECRET,
        "x-api-group": "group_3"
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("[RAG] generateDocumentSummary failed:", e.message);
    return null;
  }
}

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
  return { userId, notebookId: notebookIdOrOptions || null, workspaceId: null, referenceId: null, documentId, title, text, cloudinaryUrl, author, year };
}

/**
 * Index dokumen: chunk → embedding → Vectorize + AI summary → D1
 */
export async function indexDocument(userId, notebookIdOrOptions, documentId, title, text, cloudinaryUrl, author = "", year = "") {
  try {
    const normalized = normalizeIndexArgs(userId, notebookIdOrOptions, documentId, title, text, cloudinaryUrl, author, year);

    // 1. Generate AI document summary secara paralel (tidak memblokir chunking)
    const summaryPromise = generateDocumentSummary(normalized.title, normalized.text);

    // 2. Chunk teks
    const MAX_CHUNKS = 25;
    let chunks = chunkText(normalized.text, 2000, 200);
    if (chunks.length > MAX_CHUNKS) {
      console.warn(`Text too long (${chunks.length} chunks). Truncating to ${MAX_CHUNKS} chunks.`);
      chunks = chunks.slice(0, MAX_CHUNKS);
    }
    console.log(`Indexing ${chunks.length} chunks for document: ${normalized.title}`);

    // 3. Batch embeddings
    let allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += 50) {
      const batch = chunks.slice(i, i + 50);
      const embeddings = await getBatchEmbeddings(batch);
      allEmbeddings = allEmbeddings.concat(embeddings);
    }

    // 4. Siapkan vectors untuk Vectorize
    const rawVectors = chunks.map((chunk, idx) => ({
      id: `${normalized.documentId}_chunk_${idx}`,
      values: allEmbeddings[idx],
      metadata: {
        user_id: normalized.userId,
        notebook_id: normalized.notebookId || "",
        workspace_id: normalized.workspaceId || "",
        document_id: normalized.documentId,
        document_title: normalized.title,
        chunk_type: "content",
        page_number: Math.floor(idx / 2) + 1,
        text_content: chunk,
        cloudinary_url: normalized.cloudinaryUrl || ""
      }
    }));

    const vectors = rawVectors.filter((v, idx) => {
      if (!Array.isArray(v.values) || v.values.length === 0) {
        console.warn(`[RAG] Skipping chunk ${idx} — embedding invalid.`);
        return false;
      }
      return true;
    });

    if (vectors.length === 0) throw new Error("No valid embeddings generated. Check getBatchEmbeddings response.");

    // 5. Upsert ke Vectorize
    const vecRes = await fetch(`${WORKER_URL}/api/vector/upsert`, {
      method: "POST",
      headers: { "x-skripzy-secret": WORKER_SECRET, "Content-Type": "application/json" },
      body: JSON.stringify({ vectors })
    });

    if (!vecRes.ok) {
      const errBody = await vecRes.text().catch(() => "(no body)");
      console.error(`[RAG] Vectorize upsert failed — status: ${vecRes.status}`, errBody);
      throw new Error(`Failed to insert into Vectorize (${vecRes.status}): ${errBody}`);
    }

    // 6. Tunggu AI summary selesai
    const summary = await summaryPromise;

    // Format summary menjadi teks terstruktur untuk disimpan di D1
    const summaryText = summary
      ? [
          `Judul: ${summary.judul || normalized.title}`,
          `Penulis: ${summary.penulis || normalized.author || "-"}`,
          `Tahun: ${summary.tahun || normalized.year || "-"}`,
          `Abstrak: ${summary.abstrak || "-"}`,
          `Tujuan Penelitian: ${summary.tujuan || "-"}`,
          `Metode: ${summary.metode || "-"}`,
          `Temuan Utama: ${summary.temuan_utama || "-"}`,
          `Keywords: ${summary.keywords || "-"}`,
        ].join("\n")
      : `Judul: ${normalized.title}`;

    // Gunakan penulis/tahun dari AI summary jika belum ada
    const finalAuthor = normalized.author || summary?.penulis || "";
    const finalYear = normalized.year || summary?.tahun || "";

    // 7. Simpan metadata + summary ke D1
    await d1Request("document_metadata", {
      method: "POST",
      body: {
        id: normalized.documentId,
        workspace_id: normalized.workspaceId,
        notebook_id: normalized.notebookId,
        reference_id: normalized.referenceId || normalized.documentId,
        document_title: normalized.title,
        author: finalAuthor,
        year: finalYear,
        cloudinary_url: normalized.cloudinaryUrl,
        summary: summaryText
      }
    });

    console.log(`Document indexing completed: ${chunks.length} chunks + AI summary saved.`);
    return chunks.length;
  } catch (error) {
    console.error("Error in indexDocument:", error);
    throw error;
  }
}

/**
 * Pencarian vektor ke Cloudflare Vectorize.
 * Menggunakan adaptive threshold: 0.35 → fallback ke 0.2 jika kurang dari 2 hasil.
 */
export async function searchSimilarChunks(userId, queryText, documentIds = [], limitCount = 10) {
  if (documentIds.length === 0) {
    console.warn("[RAG] searchSimilarChunks called with empty documentIds — returning empty.");
    return [];
  }

  try {
    console.log(`[RAG] Generating embedding for query: "${queryText.substring(0, 60)}..."`);
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.error("[RAG] Failed to get query embedding.");
      return [];
    }
    console.log(`[RAG] Embedding obtained (${queryEmbedding.length} dims). Querying ${documentIds.length} doc(s)...`);

    let allMatches = [];
    const perDocTopK = Math.max(6, Math.ceil(limitCount / documentIds.length) + 3);

    for (const docId of documentIds) {
      console.log(`[RAG] Querying vectorize for docId: ${docId}, topK: ${perDocTopK}`);
      try {
        const res = await fetch(`${WORKER_URL}/api/vector/query`, {
          method: "POST",
          headers: { "x-skripzy-secret": WORKER_SECRET, "Content-Type": "application/json" },
          body: JSON.stringify({
            vector: queryEmbedding,
            topK: perDocTopK,
            filter: { document_id: docId },
            returnMetadata: "all",
            returnValues: false
          })
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`[RAG] docId ${docId}: got ${data.matches?.length ?? 0} matches`);
          const validMatches = (data.matches || []).filter(m =>
            m.metadata?.text_content?.length > 10
          );
          allMatches = allMatches.concat(validMatches);
        } else {
          const errText = await res.text().catch(() => "(no body)");
          console.error(`[RAG] Vector query failed for docId ${docId}: ${res.status} — ${errText}`);
        }
      } catch (docErr) {
        console.error(`[RAG] Error querying for docId ${docId}:`, docErr);
      }
    }

    console.log(`[RAG] Total raw matches: ${allMatches.length}`);
    allMatches.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Adaptive threshold: mulai ketat (0.35), turun ke 0.2 jika hasil < 2
    let relevantMatches = allMatches.filter(m => (m.score ?? 0) >= 0.35);
    if (relevantMatches.length < 2) {
      console.log(`[RAG] Falling back to threshold 0.2 (found ${relevantMatches.length} at 0.35)`);
      relevantMatches = allMatches.filter(m => (m.score ?? 0) >= 0.2);
    }
    console.log(`[RAG] After threshold filter: ${relevantMatches.length} matches`);

    const results = (relevantMatches.length > 0 ? relevantMatches : allMatches)
      .slice(0, limitCount)
      .map(match => ({
        id: match.id,
        similarity: match.score ?? 0,
        document_id: match.metadata?.document_id ?? "",
        document_title: match.metadata?.document_title ?? "Dokumen",
        page_number: match.metadata?.page_number ?? 1,
        text_content: match.metadata?.text_content ?? "",
        cloudinary_url: match.metadata?.cloudinary_url ?? "",
        notebook_id: match.metadata?.notebook_id ?? "",
        workspace_id: match.metadata?.workspace_id ?? "",
      }));

    console.log(`[RAG] Returning ${results.length} relevant chunks.`);
    return results;
  } catch (error) {
    console.error("[RAG] Error in searchSimilarChunks:", error);
    return [];
  }
}

export async function searchWorkspaceReferenceChunks({ userId, workspaceId, queryText, referenceIds = [], limitCount = 8 }) {
  if (!workspaceId || !referenceIds.length) return [];
  const results = await searchSimilarChunks(userId, queryText, referenceIds, Math.max(limitCount, 5));
  return results.slice(0, limitCount);
}
