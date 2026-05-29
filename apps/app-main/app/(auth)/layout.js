import { ThemeToggle } from "@/components/layout/ThemeToggle";
import Image from "next/image";
import Link from "next/link";
import PWARegister from "@/components/providers/PWARegister";

export const metadata = {
  title: {
    default: "Login | Skripzy",
  },
  description: "Masuk ke Skripzy - Platform AI Workspace Research",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Skripzy",
  },
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-techy" style={{ display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <PWARegister />
      <div className="noise-overlay" />

      {/* Mesh Glow Elements for "Techy" feel */}
      <div className="mesh-glow" style={{ top: "-10%", left: "-5%", background: "rgba(var(--primary-rgb), 0.15)" }} />
      <div className="mesh-glow" style={{ bottom: "10%", right: "-5%", background: "rgba(139, 92, 246, 0.1)" }} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", padding: "1.25rem 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            <Image src="/logo-skripzy.webp" alt="Skripzy" width={32} height={32} style={{ borderRadius: 8 }} />
            <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-main)", letterSpacing: "-0.04em" }}>
              Skripzy<span style={{ color: "var(--primary)" }}>.</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", width: "100%", padding: "2rem 0 4rem" }}>
        <div className="container">
          {children}
        </div>
      </div>
    </div>
  );
}
