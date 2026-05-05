/**
 * Reference API Response Normalizer
 * Standardize responses dari Core, OpenAlex, dan Unpaywall ke format unified
 */

/**
 * Ambil tahun dari beberapa bentuk input:
 * - angka tahun langsung
 * - string tanggal / string bebas yang mengandung 4 digit tahun
 */
function parseYear(dateStr, yearField) {
  if (typeof yearField === 'number' && Number.isFinite(yearField)) return yearField;

  if (typeof yearField === 'string') {
    const yearMatch = yearField.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) return parseInt(yearMatch[0], 10);
  }

  if (typeof dateStr === 'string') {
    const match = dateStr.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : null;
  }

  return null;
}

/**
 * Parse abstract OpenAlex yang bentuknya inverted index
 * Contoh struktur:
 * {
 *   "this": [0],
 *   "is": [1],
 *   "abstract": [2]
 * }
 */
function parseOpenAlexAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';

  const positions = [];

  for (const [word, indexes] of Object.entries(invertedIndex)) {
    if (!Array.isArray(indexes)) continue;
    for (const index of indexes) {
      if (Number.isInteger(index) && index >= 0) {
        positions[index] = word;
      }
    }
  }

  return positions.filter(Boolean).join(' ').trim();
}

/**
 * Normalize Core API response
 * @param {Array} coreResults - Results dari Core API
 * @returns {Array} Normalized papers
 */
export function normalizeCoreResults(coreResults = []) {
  return coreResults
    .map(paper => {
      const year =
        parseYear(paper.publicationDate, paper.year) ||
        parseYear(paper.datePublished) ||
        parseYear(paper.releaseDate) ||
        parseYear(paper.publishedDate) ||
        parseYear(paper.published_date);

      const authors = (paper.authors || paper.author || []).map?.(a =>
        typeof a === 'string' ? a : (a.name || a.fullName || a.displayName || 'Unknown')
      ) || [];

      return {
        id: paper.id || paper.core_id || paper.doi || '',
        title: paper.title || 'Untitled',
        authors,
        year,
        abstract: paper.abstract || paper.description || paper.summary || '',
        url: paper.sourceUrl || paper.doiUrl || paper.url || paper.downloadUrl || '',
        pdfUrl: paper.downloadUrl || paper.fullTextUrl || paper.pdfUrl || null,
        venue: paper.journalTitle || paper.journal?.title || paper.publisher || paper.source?.title || '',
        doi: paper.doi || null,
        source: 'core'
      };
    })
    .filter(p => p.title && p.title !== 'Untitled');
}

/**
 * Normalize OpenAlex API response
 * @param {Array} openalexResults - Results dari OpenAlex API
 * @returns {Array} Normalized papers
 */
export function normalizeOpenAlexResults(openalexResults = []) {
  return openalexResults
    .map(work => {
      const bestOaLocation = work.best_oa_location;
      const primaryLocation = work.primary_location;
      const pdfUrl = bestOaLocation?.pdf_url ||
        bestOaLocation?.url_for_pdf ||
        primaryLocation?.pdf_url ||
        (work.open_access?.is_oa ? primaryLocation?.landing_page_url : null);

      const year =
        work.publication_year ||
        parseYear(work.publication_date) ||
        parseYear(work.created_date) ||
        parseYear(work.updated_date);

      const abstract =
        work.abstract ||
        parseOpenAlexAbstract(work.abstract_inverted_index) ||
        '';

      const authors = (work.authorships || [])
        .map(a => a.author?.display_name || a.author?.name || 'Unknown')
        .filter(Boolean);

      return {
        id: work.id || work.openalex_id || work.doi || '',
        title: work.title || 'Untitled',
        authors,
        year,
        abstract,
        url: primaryLocation?.landing_page_url || work.doi || work.id || '',
        pdfUrl,
        venue: primaryLocation?.source?.display_name || work.host_venue?.display_name || work.host_venue?.publisher || '',
        doi: work.doi || null,
        source: 'openalex'
      };
    })
    .filter(p => p.title && p.title !== 'Untitled');
}

/**
 * Normalize Unpaywall API response
 * @param {Array} unpaywallResults - Results dari Unpaywall API
 * @returns {Array} Normalized papers
 */
export function normalizeUnpaywallResults(unpaywallResults = []) {
  return unpaywallResults
    .map(result => {
      const doi = result.doi || '';
      const pdfUrl = result.is_oa ? (
        result.best_oa_location?.url_for_pdf ||
        result.best_oa_location?.url ||
        result.oa_locations?.[0]?.url_for_pdf ||
        result.oa_locations?.[0]?.url
      ) : null;

      const year =
        parseYear(result.published_date) ||
        parseYear(result.year) ||
        parseYear(result.issued_date);

      const authors = Array.isArray(result.authors)
        ? result.authors.map(a => a?.name || a?.display_name || 'Unknown').filter(Boolean)
        : (typeof result.authors === 'string'
          ? result.authors.split(';').map(a => a.trim()).filter(Boolean)
          : []);

      const venue =
        result.journal_name ||
        result.journal_title ||
        result.host_venue?.display_name ||
        (result.journal_is_open_access ? 'Open Access Journal' : '');

      return {
        id: doi || result.title || result.url_from_request || '',
        title: result.title || 'Untitled',
        authors,
        year,
        abstract: result.abstract || result.abstract_text || '',
        url: result.url_from_request || (doi ? `https://doi.org/${doi}` : '') || '',
        pdfUrl,
        venue,
        doi: doi || null,
        source: 'unpaywall'
      };
    })
    .filter(p => p.title && p.title !== 'Untitled');
}

/**
 * Merge dan deduplicate results dari multiple sources
 * @param {Array} results - Array of normalized paper objects
 * @returns {Array} Deduplicated results
 */
export function deduplicateResults(results = []) {
  const seen = new Set();
  const deduplicated = [];

  results.forEach(paper => {
    // Use DOI if available, otherwise title + year
    const normalizedDoi = (paper.doi || '').toLowerCase().trim();
    const key = normalizedDoi
      ? `doi_${normalizedDoi}`
      : `${(paper.title || '').toLowerCase().trim()}_${paper.year || 'unknown'}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(paper);
    }
  });

  return deduplicated.sort((a, b) => (b.year || 0) - (a.year || 0));
}

/**
 * Transform normalized papers untuk frontend display
 * @param {Array} papers - Normalized papers
 * @returns {Array} Papers with formatted display fields
 */
export function formatForDisplay(papers = []) {
  return papers.map(paper => ({
    ...paper,
    authorString: formatAuthors(paper.authors),
    displayUrl: paper.pdfUrl || paper.url,
    hasFullText: !!paper.pdfUrl,
    displayYear: paper.year || 'Tahun tidak diketahui',
    displayVenue: paper.venue || 'Sumber tidak diketahui',
  }));
}

/**
 * Format authors untuk display
 * @param {Array} authors - Author names
 * @returns {String} Formatted author string
 */
function formatAuthors(authors = []) {
  if (!authors.length) return 'Unknown author';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}
