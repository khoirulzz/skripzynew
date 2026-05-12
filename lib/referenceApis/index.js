/**
 * Reference API - Unified Search Interface dengan Merge + Ranking
 * Orchestrates Core → OpenAlex → Unpaywall dengan normalization, dedup, ranking,
 * dan pemisahan hasil menjadi yang paling relevan serta yang mungkin terkait.
 */

import {
  normalizeCoreResults,
  normalizeOpenAlexResults,
  normalizeUnpaywallResults,
  deduplicateResults,
  formatForDisplay,
} from './normalizer.js';

const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || 'skripzy1234';
const WORKER_BASE_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://apikey.skripzy-app.workers.dev';
const REQUEST_TIMEOUT = 12000; // 12 seconds timeout per API

const ERROR_MESSAGES = {
  NO_RESULTS: 'Tidak ditemukan referensi dengan kata kunci tersebut. Coba ubah kata kunci atau rentang tahun.',
  ALL_APIS_FAILED: 'Semua sumber referensi sedang tidak tersedia. Silakan coba lagi dalam beberapa saat.',
  INVALID_QUERY: 'Kata kunci pencarian tidak valid. Pastikan minimal 2 karakter.',
  NETWORK_ERROR: 'Koneksi jaringan bermasalah. Periksa internet Anda dan coba lagi.',
  TIMEOUT: 'Pencarian memakan waktu terlalu lama. Silakan coba dengan kata kunci yang lebih spesifik.',
  RATE_LIMIT: 'Terlalu banyak permintaan dalam waktu singkat. Tunggu beberapa saat dan coba lagi.'
};

/**
 * Fetch dengan timeout protection
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw error;
  }
}

/**
 * Calculate year range untuk filtering.
 * yearRange dapat berupa '3', '5', '10', atau 'all'.
 *
 * @param {string} yearRange
 * @returns {{fromYear: number, toYear: number}}
 */
export function getYearRange(yearRange = '5') {
  const currentYear = new Date().getFullYear();

  if (yearRange === 'all') {
    return { fromYear: 1900, toYear: currentYear };
  }

  const years = Math.max(1, parseInt(yearRange, 10));
  return {
    fromYear: currentYear - years,
    toYear: currentYear,
  };
}

function normalizeCitationCount(paper) {
  const candidates = [
    paper.citedByCount,
    paper.citationCount,
    paper.citations,
    paper.citation_count,
  ];

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }

  return 0;
}

function getPaperAgeScore(year) {
  const currentYear = new Date().getFullYear();
  if (!year || typeof year !== 'number') return 0;

  const age = Math.max(0, currentYear - year);
  if (age <= 1) return 5;
  if (age <= 3) return 4;
  if (age <= 5) return 3;
  if (age <= 10) return 2;
  return 1;
}

function getSourceScore(source) {
  switch ((source || '').toLowerCase()) {
    case 'openalex':
      return 3;
    case 'core':
      return 2;
    case 'unpaywall':
      return 1;
    default:
      return 0;
  }
}

function getAbstractScore(abstract) {
  return abstract && String(abstract).trim().length > 0 ? 2 : 0;
}

function getPdfScore(pdfUrl) {
  return pdfUrl ? 1 : 0;
}

function getVenueScore(venue) {
  return venue && String(venue).trim().length > 0 ? 1 : 0;
}

function normalizeText(input = '') {
  return String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(query = '') {
  const stopwords = new Set([
    'dan', 'di', 'ke', 'dari', 'yang', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'with', 'and',
    'atau', 'pada', 'untuk', 'dengan', 'tentang', 'studi', 'analisis', 'kajian', 'system', 'sistem',
    'pada', 'terhadap', 'sebuah', 'suatu', 'hasil', 'metode', 'model', 'berbasis', 'implementasi',
  ]);

  return normalizeText(query)
    .split(' ')
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t.length >= 3)
    .filter(t => !stopwords.has(t));
}

function countTokenHits(text = '', tokens = []) {
  if (!tokens.length) return 0;
  const normalized = normalizeText(text);
  let hits = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) hits += 1;
  }
  return hits;
}

function countPhraseHits(text = '', query = '') {
  if (!query) return 0;
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  if (!normalizedText || !normalizedQuery) return 0;

  let hits = 0;
  if (normalizedText.includes(normalizedQuery)) hits += 3;

  const queryParts = normalizedQuery.split(' ').filter(Boolean);
  if (queryParts.length >= 2) {
    for (let i = 0; i < queryParts.length - 1; i++) {
      const pair = `${queryParts[i]} ${queryParts[i + 1]}`;
      if (normalizedText.includes(pair)) hits += 1;
    }
  }

  return hits;
}

/**
 * Skor relevansi topik berdasarkan query dan isi paper.
 * Prioritas tertinggi: judul, lalu abstrak, lalu venue/author.
 */
function getQueryRelevanceScore(paper, query) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return 0;

  const title = paper.title || '';
  const abstract = paper.abstract || '';
  const venue = paper.venue || '';
  const authors = Array.isArray(paper.authors) ? paper.authors.join(' ') : '';

  const titleTokenHits = countTokenHits(title, tokens);
  const abstractTokenHits = countTokenHits(abstract, tokens);
  const venueTokenHits = countTokenHits(venue, tokens);
  const authorTokenHits = countTokenHits(authors, tokens);

  const titlePhraseHits = countPhraseHits(title, query);
  const abstractPhraseHits = countPhraseHits(abstract, query);
  const venuePhraseHits = countPhraseHits(venue, query);

  const coverage = tokens.length > 0 ? (titleTokenHits + abstractTokenHits + venueTokenHits + authorTokenHits) / tokens.length : 0;

  return (
    titleTokenHits * 4 +
    abstractTokenHits * 2 +
    venueTokenHits * 1 +
    authorTokenHits * 0.5 +
    titlePhraseHits * 8 +
    abstractPhraseHits * 4 +
    venuePhraseHits * 2 +
    Math.min(4, coverage * 4)
  );
}

/**
 * Skor relevansi keseluruhan: metadata + topical relevance.
 */
function scorePaper(paper, query) {
  const yearScore = getPaperAgeScore(paper.year);
  const abstractScore = getAbstractScore(paper.abstract);
  const pdfScore = getPdfScore(paper.pdfUrl);
  const sourceScore = getSourceScore(paper.source);
  const venueScore = getVenueScore(paper.venue);
  const citationCount = normalizeCitationCount(paper);
  const queryScore = getQueryRelevanceScore(paper, query);

  // citationCount dibatasi supaya tidak mendominasi terlalu besar
  const citationScore = Math.min(5, Math.floor(citationCount / 50));

  return (
    queryScore * 4 +
    yearScore * 2.5 +
    abstractScore * 1.5 +
    pdfScore * 1 +
    sourceScore * 1 +
    venueScore * 0.5 +
    citationScore
  );
}

function sortByRelevance(papers = [], query = '') {
  return [...papers].sort((a, b) => {
    const scoreDiff = scorePaper(b, query) - scorePaper(a, query);
    if (scoreDiff !== 0) return scoreDiff;

    const queryDiff = getQueryRelevanceScore(b, query) - getQueryRelevanceScore(a, query);
    if (queryDiff !== 0) return queryDiff;

    const yearA = a.year || 0;
    const yearB = b.year || 0;
    if (yearB !== yearA) return yearB - yearA;

    const citationDiff = normalizeCitationCount(b) - normalizeCitationCount(a);
    if (citationDiff !== 0) return citationDiff;

    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    return titleA.localeCompare(titleB);
  });
}

async function fetchSource(endpoint, query, { limit, yearFrom, yearTo }) {
  const response = await fetchWithTimeout(`${WORKER_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-skripzy-secret': WORKER_SECRET,
    },
    body: JSON.stringify({
      query,
      limit,
      yearFrom,
      yearTo,
    }),
  }, REQUEST_TIMEOUT);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`${endpoint} error: ${response.status} - ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function tryFetchSource(endpoint, query, opts) {
  try {
    const results = await fetchSource(endpoint, query, opts);
    return { ok: true, results };
  } catch (error) {
    console.warn(`[Reference Search] ${endpoint} failed:`, error.message);
    return { ok: false, results: [], error };
  }
}

function decorateWithScore(papers, query) {
  return papers.map(paper => ({
    ...paper,
    relevanceScore: scorePaper(paper, query),
    topicalScore: getQueryRelevanceScore(paper, query),
  }));
}

function splitByRelevance(scoredPapers = []) {
  if (!scoredPapers.length) {
    return { featured: [], related: [] };
  }

  const maxScore = scoredPapers[0]?.relevanceScore || 0;
  const topThreshold = Math.max(18, Math.round(maxScore * 0.62));
  const relatedThreshold = Math.max(8, topThreshold - 10);

  let featured = scoredPapers.filter(item => item.relevanceScore >= topThreshold);
  let related = scoredPapers.filter(item => item.relevanceScore < topThreshold && item.relevanceScore >= relatedThreshold);

  if (featured.length === 0) {
    featured = scoredPapers.slice(0, Math.min(3, scoredPapers.length));
    related = scoredPapers.slice(featured.length, Math.min(scoredPapers.length, featured.length + 6));
  } else if (related.length === 0 && scoredPapers.length > featured.length) {
    related = scoredPapers.filter(item => !featured.includes(item)).slice(0, 6);
  }

  return { featured, related };
}

/**
 * Ambil hasil dari semua sumber utama, lalu normalize + dedupe + rank.
 *
 * @param {string} query
 * @param {object} options
 * @param {number} [options.limit=10]
 * @param {string} [options.yearRange='5']
 * @returns {Promise<{papers: Array, featuredPapers: Array, relatedPapers: Array, source: string, timestamp: string, message: string}>}
 */
export async function searchPapersWithFallback(query, options = {}) {
  const { limit = 10, yearRange = '5' } = options;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    throw new Error(ERROR_MESSAGES.INVALID_QUERY);
  }

  const cleanQuery = query.trim();
  const { fromYear, toYear } = getYearRange(yearRange);

  console.log(`[Reference Search] Query: "${cleanQuery}", Limit: ${limit}, Year Range: ${fromYear}-${toYear}`);

  const fetchLimit = Math.max(limit, 20);

  const [coreRes, openalexRes, unpaywallRes] = await Promise.all([
    tryFetchSource('/api/search/core', cleanQuery, { limit: fetchLimit, yearFrom: fromYear, yearTo: toYear }),
    tryFetchSource('/api/search/openalex', cleanQuery, { limit: fetchLimit, yearFrom: fromYear, yearTo: toYear }),
    tryFetchSource('/api/search/unpaywall', cleanQuery, { limit: fetchLimit, yearFrom: fromYear, yearTo: toYear }),
  ]);

  const normalizedCore = coreRes.ok ? normalizeCoreResults(coreRes.results) : [];
  const normalizedOpenAlex = openalexRes.ok ? normalizeOpenAlexResults(openalexRes.results) : [];
  const normalizedUnpaywall = unpaywallRes.ok ? normalizeUnpaywallResults(unpaywallRes.results) : [];

  const mergedRaw = [
    ...normalizedOpenAlex,
    ...normalizedCore,
    ...normalizedUnpaywall,
  ];

  const deduped = deduplicateResults(mergedRaw);
  const ranked = sortByRelevance(deduped, cleanQuery);
  const scored = decorateWithScore(ranked, cleanQuery);

  // Filter tahun final di layer ini sebagai safety net.
  const filteredByYear = scored.filter(paper => {
    if (!paper.year || typeof paper.year !== 'number') return false;
    if (yearRange === 'all') return true;
    return paper.year >= fromYear && paper.year <= toYear;
  });

  const { featured, related } = splitByRelevance(filteredByYear);
  const featuredLimit = Math.max(1, Math.ceil(limit * 0.6));
  const relatedLimit = Math.max(0, limit - featuredLimit);

  const finalFeatured = featured.slice(0, featuredLimit);
  const finalRelated = related.slice(0, Math.max(relatedLimit, 4));
  const finalCombined = [...finalFeatured, ...finalRelated].slice(0, Math.max(limit, 12));

  if (finalCombined.length > 0) {
    const bestSource = finalCombined[0]?.source || 'mixed';
    return {
      papers: formatForDisplay(finalCombined),
      featuredPapers: formatForDisplay(finalFeatured),
      relatedPapers: formatForDisplay(finalRelated),
      source: bestSource === 'openalex' || bestSource === 'core' || bestSource === 'unpaywall' ? `mixed-${bestSource}` : 'mixed',
      timestamp: new Date().toISOString(),
      message: `Ditemukan ${finalCombined.length} referensi dari gabungan sumber. ${finalFeatured.length} paling relevan dan ${finalRelated.length} terkait.`,
    };
  }

  const relaxed = scored.slice(0, limit);
  if (relaxed.length > 0) {
    return {
      papers: formatForDisplay(relaxed),
      featuredPapers: formatForDisplay(relaxed.slice(0, Math.min(3, relaxed.length))),
      relatedPapers: [],
      source: 'mixed-relaxed',
      timestamp: new Date().toISOString(),
      message: `Ditemukan ${relaxed.length} referensi, namun tidak semuanya lolos filter tahun secara ketat`,
    };
  }

  const anySourceSucceeded = coreRes.ok || openalexRes.ok || unpaywallRes.ok;
  if (!anySourceSucceeded) {
    throw new Error(ERROR_MESSAGES.ALL_APIS_FAILED);
  }

  throw new Error(ERROR_MESSAGES.NO_RESULTS);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('invalid') || message.includes('invalid_query')) {
    return ERROR_MESSAGES.INVALID_QUERY;
  }
  if (message.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT;
  }
  if (message.includes('rate') || message.includes('rate_limit') || message.includes('429')) {
    return ERROR_MESSAGES.RATE_LIMIT;
  }
  if (message.includes('network') || message.includes('failed to fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (message.includes('all_apis_failed')) {
    return ERROR_MESSAGES.ALL_APIS_FAILED;
  }
  if (message.includes('no_results')) {
    return ERROR_MESSAGES.NO_RESULTS;
  }

  return ERROR_MESSAGES.ALL_APIS_FAILED;
}
