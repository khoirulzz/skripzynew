import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import SplashScreen from "@/components/layout/SplashScreen";
import OTAUpdater from "@/components/providers/OTAUpdater";
import PushNotificationListener from "@/components/providers/PushNotificationListener";
import NativeBridge from "@/components/providers/NativeBridge";
import NetworkObserver from "@/components/providers/NetworkObserver";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F9FAFB" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
  ],
};

export const metadata = {
  title: {
    template: "%s | Skripzy",
    default: "Skripzy | AI Workspace Research",
  },
  description: "Platform all-in-one berbasis AI untuk membantu mahasiswa dari tahap ide penelitian hingga skripsi selesai.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL('https://skripzy.id'),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skripzy",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Skripzy" />
        <meta name="msapplication-TileColor" content="#000000" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <PushNotificationListener />
            <NativeBridge />
            <NetworkObserver />
            <OTAUpdater />
            <SplashScreen />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}