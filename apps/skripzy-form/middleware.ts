import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Ambil token dari cookie yang di-set oleh main app
  const token = request.cookies.get('skripzy_token')?.value;

  // Jika tidak ada token (belum login atau akses langsung), redirect ke main app login
  if (!token) {
    // Pada production, gunakan process.env.NEXT_PUBLIC_MAIN_APP_URL
    const loginUrl = new URL('http://localhost:3001/login');
    loginUrl.searchParams.set('redirect', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika ada token, biarkan lewat
  return NextResponse.next();
}

// Hanya jalankan middleware ini pada path utama (opsional, sesuaikan kebutuhan)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
