"use client";

import Link from "next/link";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-techy flex flex-col legal-page-shell">
      <nav style={{ padding: "0.85rem 0", borderBottom: "1px solid rgba(var(--primary-rgb), 0.08)", backgroundColor: "rgba(var(--surface-rgb), 0.72)", backdropFilter: "blur(14px)" }}>
        <div className="container legal-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", color: "inherit", minWidth: 0 }}>
            <span style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
              Skripzy<span className="text-primary">.</span>
            </span>
          </Link>
          <Link href="/" className="btn btn-outline legal-back-button" style={{ borderRadius: "99px", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 800, background: "rgba(var(--surface-rgb), 0.7)", whiteSpace: "nowrap" }}>
            <PremiumIcon name="arrowLeft" size={15} />
            Beranda
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "3rem 0" }}>
        <div className="container legal-container" style={{ maxWidth: "860px" }}>
          <header className="legal-hero" style={{ marginBottom: "1.75rem", padding: "1.5rem", borderRadius: 10, background: "rgba(var(--surface-rgb), 0.72)", border: "1px solid rgba(var(--primary-rgb), 0.1)" }}>
            <h1 style={{ fontSize: "clamp(1.85rem, 4vw, 2.65rem)", fontWeight: 900, marginBottom: "0.75rem", letterSpacing: "-0.03em", lineHeight: 1.08 }}>{title}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
              <PremiumIcon name="clock" size={14} style={{ verticalAlign: "middle", marginRight: "0.4rem" }} />
              Terakhir diperbarui: {lastUpdated}
            </p>
          </header>

          <div
            className="legal-content landing-card"
            style={{
              lineHeight: 1.7,
              color: "var(--text-main)",
              fontSize: "1rem",
              padding: "1.75rem",
            }}
          >
            {children}
          </div>
        </div>
      </main>

      <footer style={{ padding: "2rem 0", borderTop: "1px solid rgba(var(--primary-rgb), 0.08)", backgroundColor: "rgba(var(--surface-rgb), 0.45)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            © {new Date().getFullYear()} Skripzy Technology. Seluruh hak cipta dilindungi undang-undang.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        .legal-page-shell {
          overflow-x: hidden;
        }
        .legal-content h1,
        .legal-content h2,
        .legal-content h3 {
          margin-top: 1.9rem;
          margin-bottom: 0.85rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .legal-content h1 {
          font-size: 1.55rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.5rem;
        }
        .legal-content h2 { font-size: 1.24rem; }
        .legal-content h3 { font-size: 1.08rem; }
        .legal-content p {
          margin-bottom: 1rem;
          text-align: left;
        }
        .legal-content ul,
        .legal-content ol {
          margin-bottom: 1.1rem;
          padding-left: 1.25rem;
        }
        .legal-content li {
          margin-bottom: 0.45rem;
          padding-left: 0.15rem;
        }
        .legal-content strong {
          color: var(--text-main);
          font-weight: 700;
        }
        .legal-content hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2rem 0;
        }
        .legal-content a {
          color: var(--primary);
          overflow-wrap: anywhere;
        }
        @media (max-width: 768px) {
          .legal-nav {
            padding-inline: 0.85rem !important;
          }
          .legal-back-button {
            padding: 0.45rem 0.7rem !important;
            font-size: 0.72rem !important;
            gap: 0.35rem;
          }
          .legal-page-shell main {
            padding: 1.25rem 0 !important;
          }
          .legal-container {
            padding-inline: 0.85rem !important;
          }
          .legal-hero {
            padding: 1rem !important;
            margin-bottom: 0.9rem !important;
          }
          .legal-hero h1 {
            font-size: 1.45rem !important;
            line-height: 1.12 !important;
          }
          .legal-hero p {
            font-size: 0.78rem !important;
          }
          .legal-content {
            padding: 1rem !important;
            font-size: 0.86rem !important;
            line-height: 1.58 !important;
          }
          .legal-content h1 { font-size: 1.16rem; }
          .legal-content h2 { font-size: 1.05rem; }
          .legal-content h3 { font-size: 0.96rem; }
          .legal-content h1,
          .legal-content h2,
          .legal-content h3 {
            margin-top: 1.35rem;
            margin-bottom: 0.55rem;
          }
          .legal-content p,
          .legal-content ul,
          .legal-content ol {
            margin-bottom: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
