import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StatsZy - Skripzy Statistic Engine',
  description: 'Aplikasi analisis statistik berbasis browser untuk membantu penelitian Anda dengan cepat dan mudah.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id">
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
