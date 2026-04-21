/**
 * SKRIPZY - Semantic Scholar API Utility (Improved)
 * Mencari jurnal & paper ilmiah dari Semantic Scholar dengan retry logic dan error handling.
 * 
 * API Docs: https://www.semanticscholar.org/product/api
 */

const SS_BASE = "https://api.semanticscholar.org/graph/v1/paper/search";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds
const REQUEST_TIMEOUT = 8000; // 8 seconds

/**
 * Helper: Retry logic dengan exponential backoff
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES, delayMs = RETRY_DELAY) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          "User-Agent": "Skripzy/1.0 (Academic Research Tool)",
        },
      });

      clearTimeout(timeoutId);

      // If successful, return
      if (res.ok) {
        return res;
      }

      // If 429 (rate limit) or 5xx, retry
      if ((res.status === 429 || res.status >= 500) && attempt < retries - 1) {
        const delay = delayMs * Math.pow(2, attempt); // Exponential backoff
        console.warn(`[SemanticScholar] Attempt ${attempt + 1} failed (${res.status}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For other errors, throw immediately
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      // Network error or timeout
      if (attempt < retries - 1) {
        const delay = delayMs * Math.pow(2, attempt);
        console.warn(`[SemanticScholar] Attempt ${attempt + 1} error: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed
      throw err;
    }
  }

  throw new Error("Semua percobaan fetch gagal");
}

/**
 * Cari paper dari Semantic Scholar dengan retry logic & error handling.
 * @param {string}  query       - Kata kunci pencarian
 * @param {object}  [opts]
 * @param {number}  [opts.limit]     - Jumlah hasil (default 10)
 * @param {string}  [opts.yearRange] - 'all' | '3' | '5' | '10'  (n tahun terakhir)
 * @param {string}  [opts.docType]   - 'all' | 'JournalArticle' | 'Conference' | 'Review'
 * @returns {Promise<Array>}
 */
export async function searchSemanticScholar(query, { limit = 10, yearRange = "5", docType = "all" } = {}) {
  if (!query || typeof query !== "string") {
    throw new Error("Kata kunci pencarian tidak valid");
  }

  const cleanQuery = query.trim();
  if (cleanQuery.length === 0) {
    throw new Error("Kata kunci pencarian tidak boleh kosong");
  }

  const currentYear = new Date().getFullYear();
  const params = new URLSearchParams({
    query: cleanQuery,
    limit: String(Math.min(Math.max(limit, 1), 100)), // Clamp between 1-100
    fields: "title,authors,year,abstract,url,publicationVenue,publicationTypes,openAccessPdf",
  });

  if (yearRange !== "all") {
    const years = Math.max(1, parseInt(yearRange, 10));
    params.append("year", `${currentYear - years}-${currentYear}`);
  }

  if (docType !== "all") {
    params.append("publicationTypes", docType);
  }

  try {
    const res = await fetchWithRetry(`${SS_BASE}?${params}`);

    if (!res.ok) {
      throw new Error(`Semantic Scholar API error: HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!data || !Array.isArray(data.data)) {
      throw new Error("Response dari Semantic Scholar tidak valid");
    }

    // Map ke format internal
    const results = (data.data || [])
      .filter(p => p && p.paperId) // Filter invalid entries
      .map(p => ({
        id:             p.paperId,
        title:          p.title || "Tanpa judul",
        authors:        Array.isArray(p.authors) ? p.authors.map(a => a?.name || "Unknown").filter(Boolean) : [],
        year:           p.year || null,
        abstract:       p.abstract || "",
        url:            p.url || "",
        venue:          p.publicationVenue?.name || "",
        types:          Array.isArray(p.publicationTypes) ? p.publicationTypes : [],
        openAccessUrl:  p.openAccessPdf?.url || null,
        isOpenAccess:   !!(p.openAccessPdf?.url), // Direct download available
      }));

    return results;
  } catch (err) {
    const errorMsg = err.message || "Gagal menghubungi Semantic Scholar API";
    console.error("[SemanticScholar] Error:", errorMsg);
    throw new Error(errorMsg);
  }
}


/**
 * Format sitasi APA sederhana dari paper object.
 */
export function buildApaCitation(paper) {
  const { authors, year, title, venue, url } = paper;
  const authorStr = formatApaAuthors(authors);
  let cite = `${authorStr} (${year || "t.t."}). ${title}.`;
  if (venue) cite += ` *${venue}*.`;
  if (url)   cite += ` ${url}`;
  return cite;
}

function formatApaAuthors(names = []) {
  if (!names.length) return "Penulis tidak diketahui";
  const fmt = n => {
    const parts = n.trim().split(" ");
    if (parts.length === 1) return parts[0];
    const last  = parts[parts.length - 1];
    const inits = parts.slice(0, -1).map(p => p.charAt(0) + ".").join(" ");
    return `${last}, ${inits}`;
  };
  if (names.length === 1) return fmt(names[0]);
  if (names.length === 2) return `${fmt(names[0])} & ${fmt(names[1])}`;
  return `${fmt(names[0])} et al.`;
}
