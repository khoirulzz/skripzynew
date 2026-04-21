import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata = {
  title: "Skripzy | AI Research OS",
  description: "Platform all-in-one berbasis AI untuk membantu mahasiswa dari tahap ide penelitian hingga skripsi selesai.",
  icons: {
    icon: "/logo-skripzy.webp",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
