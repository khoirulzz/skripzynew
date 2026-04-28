import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "./firebase";
import { getEmbedding } from "./callWorker";

/**
 * Memecah teks menjadi potongan-potongan (chunks)
 */
export function chunkText(text, chunkSize = 800, chunkOverlap = 150) {
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
export async function indexDocument(userId, notebookId, documentId, title, text, cloudinaryUrl, author = "", year = "") {
  if (!db) {
    console.error("Firestore DB is not initialized in indexDocument");
    throw new Error("Sistem database belum siap. Silakan refresh halaman.");
  }

  try {
    const chunks = chunkText(text);
    const collectionRef = collection(db, "reference_chunks");

    console.log(`Indexing ${chunks.length} chunks for document: ${title}`);

    // Proses secara paralel namun dibatasi (Promise.all)
    const tasks = chunks.map(async (chunk, index) => {
      try {
        const embedding = await getEmbedding(chunk);

        if (!embedding || !Array.isArray(embedding)) {
          throw new Error("Failed to get valid embedding for chunk");
        }

        await addDoc(collectionRef, {
          user_id: userId,
          notebook_id: notebookId,
          document_id: documentId,
          document_title: title,
          author: author,
          year: year,
          cloudinary_url: cloudinaryUrl,
          page_number: Math.floor(index / 5) + 1, // Estimasi halaman kasar
          text_content: chunk,
          embedding_vector: embedding,
          created_at: serverTimestamp()
        });
      } catch (chunkError) {
        console.error(`Error indexing chunk ${index + 1}:`, chunkError);
      }
    });

    await Promise.all(tasks);
    console.log(`Document indexing completed: ${chunks.length} chunks processed`);
    return chunks.length;
  } catch (error) {
    console.error("Error in indexDocument:", error);
    throw error;
  }
}

/**
 * Melakukan pencarian vektor (Semantic Search / Cosine Similarity) Client-Side
 */
export async function searchSimilarChunks(userId, queryText, documentIds = [], limitCount = 10) {
  if (!db || documentIds.length === 0) {
    return [];
  }

  try {
    // 1. Dapatkan embedding untuk pertanyaan
    const queryEmbedding = await getEmbedding(queryText);
    if (!queryEmbedding) return [];

    // 2. Tarik SEMUA chunks milik dokumen-dokumen yang dicentang
    // Firebase `in` operator mendukung maksimal 10 elemen, pas dengan batas kita
    const q = query(
      collection(db, "reference_chunks"),
      where("document_id", "in", documentIds)
    );

    const snapshot = await getDocs(q);

    // 3. Kalkulasi Cosine Similarity secara manual
    let results = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.embedding_vector) {
        const similarity = cosineSimilarity(queryEmbedding, data.embedding_vector);
        // Bisa tambahkan threshold misal similarity > 0.5 jika ingin sangat ketat
        results.push({
          id: doc.id,
          similarity,
          ...data
        });
      }
    });

    // 4. Urutkan dari termirip (Highest Similarity Score)
    results.sort((a, b) => b.similarity - a.similarity);

    // 5. Kembalikan top N chunks
    return results.slice(0, limitCount);
  } catch (error) {
    console.error("Error in searchSimilarChunks:", error);
    return [];
  }
}
