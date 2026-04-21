import { NextResponse } from 'next/server';

const SS_BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('q') || '';
    const limit = searchParams.get('limit') || '10';
    const yearRange = searchParams.get('yearRange') || '5';
    const docType = searchParams.get('docType') || 'all';

    if (!query) return NextResponse.json({ data: [] });

    const currentYear = new Date().getFullYear();
    const params = new URLSearchParams({ query, limit: String(limit), fields: 'title,authors,year,abstract,url,publicationVenue,publicationTypes,openAccessPdf' });
    if (yearRange !== 'all') {
      params.append('year', `${currentYear - parseInt(yearRange, 10)}-${currentYear}`);
    }
    if (docType !== 'all') {
      params.append('publicationTypes', docType);
    }

    const res = await fetch(`${SS_BASE}?${params.toString()}`, { method: 'GET' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json({ error: `Semantic Scholar upstream error: ${res.status}`, details: text }, { status: 502 });
    }

    const json = await res.json();
    const items = (json.data || []).map(p => ({
      id: p.paperId,
      title: p.title || 'Tanpa judul',
      authors: (p.authors || []).map(a => a.name),
      year: p.year,
      abstract: p.abstract || '',
      url: p.url || '',
      venue: p.publicationVenue?.name || '',
      types: (p.publicationTypes || []),
      openAccessUrl: p.openAccessPdf?.url || null,
    }));

    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
