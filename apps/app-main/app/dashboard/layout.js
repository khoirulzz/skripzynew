import DashboardLayoutClient from "./DashboardLayoutClient";
import PWARegister from "@/components/providers/PWARegister";

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
    default: "Dashboard | Skripzy",
  },
  description: "Skripzy Dashboard - Ruang kerja penelitian Anda.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skripzy",
  },
};

export default function DashboardLayout({ children }) {
  return (
    <>
      <PWARegister />
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </>
  );
}
