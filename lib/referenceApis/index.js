/**
 * Reference API - Unified Search Interface dengan Fallback Chain
 * Orchestrates Core → OpenAlex → Unpaywall dengan retry logic
 */

import { 
  normalizeCoreResults, 
  normalizeOpenAlexResults, 
  normalizeUnpaywallResults,
  deduplicateResults,
  formatForDisplay 
} from './normalizer.js';

const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || 'skripzy1234';
const WORKER_BASE_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'https://skripzy-worker.example.com';
const REQUEST_TIMEOUT = 12000; // 12 seconds timeout per API

// Error messages
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
 * Calculate year range untuk filtering
 * @param {string} yearRange - '3', '5', '10', or 'all'
 * @returns {Object} { fromYear, toYear }
 */
export function getYearRange(yearRange = '5') {
  const currentYear = new Date().getFullYear();
  
  if (yearRange === 'all') {
    return { fromYear: 1900, toYear: currentYear };
  }
  
  const years = Math.max(1, parseInt(yearRange, 10));
  return {
    fromYear: currentYear - years,
    toYear: currentYear
  };
}

/**
 * Main search function dengan fallback chain
 * @param {string} query - Search query
 * @param {Object} options - { limit, yearRange }
 * @returns {Promise<Object>} { papers, source, timestamp, message }
 */
export async function searchPapersWithFallback(query, options = {}) {
  const { limit = 10, yearRange = '5' } = options;
  
  // Validate input
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    throw new Error(ERROR_MESSAGES.INVALID_QUERY);
  }

  const cleanQuery = query.trim();
  const yearRange_ = getYearRange(yearRange);

  console.log(`[Reference Search] Query: "${cleanQuery}", Limit: ${limit}, Year Range: ${yearRange_}`);

  // Try Core API first
  try {
    console.log('[Reference Search] Attempting Core API...');
    const results = await searchCore(cleanQuery, { limit, ...yearRange_ });
    
    if (results.length > 0) {
      console.log(`[Reference Search] ✅ Core API success: ${results.length} papers found`);
      return {
        papers: formatForDisplay(results),
        source: 'core',
        timestamp: new Date().toISOString(),
        message: `Ditemukan ${results.length} referensi dari Core UK API`
      };
    }
  } catch (err) {
    console.warn(`[Reference Search] Core API failed (${err.message}). Trying OpenAlex...`);
  }

  // Try OpenAlex
  try {
    console.log('[Reference Search] Attempting OpenAlex API...');
    const results = await searchOpenAlex(cleanQuery, { limit, ...yearRange_ });
    
    if (results.length > 0) {
      console.log(`[Reference Search] ✅ OpenAlex success: ${results.length} papers found`);
      return {
        papers: formatForDisplay(results),
        source: 'openalex',
        timestamp: new Date().toISOString(),
        message: `Ditemukan ${results.length} referensi dari OpenAlex`
      };
    }
  } catch (err) {
    console.warn(`[Reference Search] OpenAlex failed (${err.message}). Trying Unpaywall...`);
  }

  // Try Unpaywall as last resort
  try {
    console.log('[Reference Search] Attempting Unpaywall API...');
    const results = await searchUnpaywall(cleanQuery, { limit, ...yearRange_ });
    
    if (results.length > 0) {
      console.log(`[Reference Search] ✅ Unpaywall success: ${results.length} papers found`);
      return {
        papers: formatForDisplay(results),
        source: 'unpaywall',
        timestamp: new Date().toISOString(),
        message: `Ditemukan ${results.length} referensi dari Unpaywall`
      };
    }
  } catch (err) {
    console.warn(`[Reference Search] Unpaywall failed (${err.message})`);
  }

  // All APIs failed
  throw new Error(ERROR_MESSAGES.ALL_APIS_FAILED);
}

/**
 * Search via Core API (through Cloudflare Worker)
 */
async function searchCore(query, { limit = 10, fromYear, toYear }) {
  try {
    const response = await fetchWithTimeout(`${WORKER_BASE_URL}/api/search/core`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-skripzy-secret': WORKER_SECRET
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 100),
        yearFrom: fromYear,
        yearTo: toYear
      })
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Core API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const results = normalizeCoreResults(data.results || []);
    
    if (results.length === 0) {
      throw new Error('Core API returned no results');
    }
    
    return results;
  } catch (error) {
    console.error('[Core API Error]', error.message);
    if (error.message.includes('TIMEOUT')) {
      throw new Error(ERROR_MESSAGES.TIMEOUT);
    }
    throw error;
  }
}

/**
 * Search via OpenAlex API (through Cloudflare Worker)
 */
async function searchOpenAlex(query, { limit = 10, fromYear, toYear }) {
  try {
    const response = await fetchWithTimeout(`${WORKER_BASE_URL}/api/search/openalex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-skripzy-secret': WORKER_SECRET
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 50),
        yearFrom: fromYear,
        yearTo: toYear
      })
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAlex API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const results = normalizeOpenAlexResults(data.results || []);
    
    if (results.length === 0) {
      throw new Error('OpenAlex API returned no results');
    }
    
    return results;
  } catch (error) {
    console.error('[OpenAlex API Error]', error.message);
    if (error.message.includes('TIMEOUT')) {
      throw new Error(ERROR_MESSAGES.TIMEOUT);
    }
    throw error;
  }
}

/**
 * Search via Unpaywall API (through Cloudflare Worker)
 */
async function searchUnpaywall(query, { limit = 10, fromYear, toYear }) {
  try {
    const response = await fetchWithTimeout(`${WORKER_BASE_URL}/api/search/unpaywall`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-skripzy-secret': WORKER_SECRET
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 50),
        yearFrom: fromYear,
        yearTo: toYear
      })
    }, REQUEST_TIMEOUT);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Unpaywall API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const results = normalizeUnpaywallResults(data.results || []);
    
    if (results.length === 0) {
      throw new Error('Unpaywall API returned no results');
    }
    
    return results;
  } catch (error) {
    console.error('[Unpaywall API Error]', error.message);
    if (error.message.includes('TIMEOUT')) {
      throw new Error(ERROR_MESSAGES.TIMEOUT);
    }
    throw error;
  }
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
  
  return ERROR_MESSAGES.ALL_APIS_FAILED;
}
