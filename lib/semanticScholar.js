/**
 * SKRIPZY - Semantic Scholar API Utility
 * Mencari jurnal & paper ilmiah dari Semantic Scholar.
 */

const SS_BASE = "https://api.semanticscholar.org/graph/v1/paper/search";

/**
 * Cari paper dari Semantic Scholar.
 * Jika dipanggil dari browser, gunakan proxy serverless Next API route untuk menghindari CORS.
 */
export async function searchSemanticScholar(query, { limit = 10, yearRange = "5", docType = "all" } = {}) {
  if (!query) return [];

  // Jika dipanggil di browser, gunakan API proxy internal untuk menghindari CORS issues
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams({ query, limit: String(limit), yearRange, docType });
    const res = await fetch(`/api/semantic?${params.toString()}`);
    if (!res.ok) throw new Error(`Semantic Scholar proxy error: ${res.status}`);
    const data = await res.json();
    return data || [];
  }

  // Server-side fallback: call Semantic Scholar directly
  const currentYear = new Date().getFullYear();
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fields: "title,authors,year,abstract,url,publicationVenue,publicationTypes,openAccessPdf",
  });

  if (yearRange !== "all") {
    params.append("year", `${currentYear - parseInt(yearRange, 10)}-${currentYear}`);
  }

  if (docType !== "all") {
    params.append("publicationTypes", docType);
  }

  const res = await fetch(`${SS_BASE}?${params}`);
  if (!res.ok) throw new Error(`Semantic Scholar API error: ${res.status}`);

  const data = await res.json();
  return (data.data || []).map(p => ({
    id:           p.paperId,
    title:        p.title || "Tanpa judul",
    authors:      (p.authors || []).map(a => a.name),
    year:         p.year,
    abstract:     p.abstract || "",
    url:          p.url || "",
    venue:        p.publicationVenue?.name || "",
    types:        (p.publicationTypes || []),
    openAccessUrl: p.openAccessPdf?.url || null,
  }));
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
