import DashboardLayoutClient from "./DashboardLayoutClient";
import PWARegister from "@/components/providers/PWARegister";

export const metadata = {
  title: {
    template: "%s | Skripzy Dashboard",
    default: "Dashboard | Skripzy",
  },
  description: "Skripzy Dashboard - Ruang kerja riset akademik Anda.",
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
