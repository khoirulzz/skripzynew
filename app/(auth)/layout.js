import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AuthLayout({ children }) {
  return (
    <div className="flex-col min-h-screen" style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden" }}>
      {/* Decorative background blobs */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40vw", height: "40vw", background: "var(--primary)", filter: "blur(120px)", opacity: 0.15, borderRadius: "50%", zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40vw", height: "40vw", background: "var(--primary-light)", filter: "blur(120px)", opacity: 0.1, borderRadius: "50%", zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: "absolute", top: "1.5rem", right: "2rem", zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div style={{ zIndex: 1, width: "100%", maxWidth: "460px", padding: "0 1rem" }}>
        {children}
      </div>
    </div>
  );
}
