import AdminLayoutClient from "./AdminLayoutClient";
import PWARegister from "@/components/providers/PWARegister";

export const metadata = {
  title: {
    template: "%s | Skripzy Admin",
    default: "Admin | Skripzy",
  },
  description: "Skripzy Admin Dashboard",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skripzy Admin",
  },
};

export default function AdminLayout({ children }) {
  return (
    <>
      <PWARegister />
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  );
}
