/**
 * Reference API Response Normalizer
 * Standardize responses dari Core, OpenAlex, dan Unpaywall ke format unified
 */

/**
 * Parse year dari berbagai format
 */
function parseYear(dateStr, yearField) {
  if (typeof yearField === 'number') return yearField;
  if (typeof dateStr === 'string') {
    const match = dateStr.match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }
  return null;
}

/**
 * Normalize Core API response
 * @param {Array} coreResults - Results dari Core API
 * @returns {Array} Normalized papers
 */
export function normalizeCoreResults(coreResults = []) {
  return coreResults.map(paper => {
    const year = parseYear(paper.publicationDate, paper.year) || 
                 parseYear(paper.datePublished) ||
                 parseYear(paper.releaseDate);
    
    return {
      id: paper.id || paper.core_id || '',
      title: paper.title || 'Untitled',
      authors: (paper.authors || []).map(a => 
        typeof a === 'string' ? a : (a.name || a.fullName || 'Unknown')
      ),
      year: year,
      abstract: paper.abstract || paper.description || '',
      url: paper.sourceUrl || paper.doiUrl || paper.url || '',
      pdfUrl: paper.downloadUrl || paper.fullTextUrl || null,
      venue: paper.journalTitle || paper.journal?.title || paper.publisher || '',
      doi: paper.doi || null,
      source: 'core'
    };
  }).filter(p => p.title && p.title !== 'Untitled');
}

/**
 * Normalize OpenAlex API response
 * @param {Array} openalexResults - Results dari OpenAlex API
 * @returns {Array} Normalized papers
 */
export function normalizeOpenAlexResults(openalexResults = []) {
  return openalexResults.map(work => {
    const bestOaLocation = work.best_oa_location;
    const pdfUrl = bestOaLocation?.pdf_url || 
                   (work.open_access?.is_oa ? work.primary_location?.landing_page_url : null);
    
    const year = work.publication_year || 
                 (work.publication_date ? parseYear(work.publication_date) : null);
    
    return {
      id: work.id || work.openalex_id || '',
      title: work.title || 'Untitled',
      authors: (work.authorships || [])
        .map(a => a.author?.display_name || 'Unknown')
        .filter(Boolean),
      year: year,
      abstract: work.abstract || '',
      url: work.primary_location?.landing_page_url || work.doi || work.id || '',
      pdfUrl: pdfUrl,
      venue: work.primary_location?.source?.display_name || work.host_venue?.display_name || '',
      doi: work.doi || null,
      source: 'openalex'
    };
  }).filter(p => p.title && p.title !== 'Untitled');
}

/**
 * Normalize Unpaywall API response
 * @param {Array} unpaywallResults - Results dari Unpaywall API
 * @returns {Array} Normalized papers
 */
export function normalizeUnpaywallResults(unpaywallResults = []) {
  return unpaywallResults.map(result => {
    const doi = result.doi || '';
    const pdfUrl = result.is_oa ? (
      result.best_oa_location?.url_for_pdf ||
      result.best_oa_location?.url ||
      result.oa_locations?.[0]?.url_for_pdf ||
      result.oa_locations?.[0]?.url
    ) : null;
    
    const year = parseYear(result.published_date) || 
                 (typeof result.year === 'number' ? result.year : null);

    return {
      id: doi || result.title || '',
      title: result.title || 'Untitled',
      authors: result.authors ? result.authors.split(';').map(a => a.trim()) : [],
      year: year,
      abstract: result.abstract || '',
      url: result.url_from_request || `https://doi.org/${doi}` || '',
      pdfUrl: pdfUrl,
      venue: result.journal_name || result.journal_is_open_access ? 'Open Access Journal' : '',
      doi: doi || null,
      source: 'unpaywall'
    };
  }).filter(p => p.title && p.title !== 'Untitled');
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
    // Use title + year as unique key (case-insensitive)
    const key = `${(paper.title || '').toLowerCase().trim()}_${paper.year || 'unknown'}`;
    
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
