import type { Metadata } from 'next';
import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Skripzy Forms - Pembuat Kuesioner Akademik & Uji Validitas',
  description: 'Buat kuesioner penelitian, bagikan ke responden, dan dapatkan hasil uji validitas, reliabilitas, serta regresi linear otomatis dengan Skripzy Forms.',
  icons: {
    icon: 'https://app.skripzy.id/favicon.ico'
  },
  openGraph: {
    title: 'Skripzy Forms - AI Survey Builder',
    description: 'Pembuat kuesioner akademik otomatis dengan dukungan pengujian statistik.',
    url: 'https://forms.skripzy.id',
    siteName: 'Skripzy Forms',
    locale: 'id_ID',
    type: 'website',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans bg-[#F9FAFB] text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
