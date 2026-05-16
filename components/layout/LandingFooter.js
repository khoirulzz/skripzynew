"use client";

import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer style={{ padding: "4rem 0 2.5rem", borderTop: "1px solid var(--border)", background: "rgba(var(--surface-rgb), 0.3)" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "2.5rem", marginBottom: "3rem" }}>
          <div style={{ gridColumn: "span 2" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <Image src="/logo-skripzy.webp" alt="Skripzy" width={32} height={32} />
              <span style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text-main)" }}>Skripzy</span>
            </Link>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7, maxWidth: "350px", marginBottom: "2rem" }}>
              Workspace akademik terintegrasi untuk membantu mengelola ide, referensi, dan draft dalam satu alur kerja yang menyatu.
            </p>
            <div style={{ display: "inline-block", padding: "0.5rem 1rem", borderRadius: "99px", background: "var(--surface-hover)", fontSize: "0.8rem", fontWeight: 800, color: "var(--primary)", border: "1px solid var(--border)" }}>
              Responsible academic workspace
            </div>
          </div>

          <div>
            <h4 style={{ fontWeight: 800, marginBottom: "1.5rem", color: "var(--text-main)", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Produk</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link href="/features" className="footer-link">Fitur</Link>
              <Link href="/pricing" className="footer-link">Harga</Link>
              <Link href="/promo" className="footer-link">Promo</Link>
              <Link href="/apps" className="footer-link">Akses</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontWeight: 800, marginBottom: "1.5rem", color: "var(--text-main)", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Legal</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link href="/terms" className="footer-link">Terms & Conditions</Link>
              <Link href="/privacy-policy" className="footer-link">Privacy Policy</Link>
              <Link href="/subscription-terms" className="footer-link">Subscription Terms</Link>
              <Link href="/refund-policy" className="footer-link">Refund Policy</Link>
              <Link href="/academic-integrity" className="footer-link">Academic Integrity Policy</Link>
              <Link href="/ai-usage-disclaimer" className="footer-link">AI Usage Disclaimer</Link>
              <Link href="/faq" className="footer-link">FAQ</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontWeight: 800, marginBottom: "1.5rem", color: "var(--text-main)", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Kontak</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link href="mailto:cs@skripzy.id" className="footer-link footer-contact-link">
                <PremiumIcon name="inbox" size={16} /> cs@skripzy.id
              </Link>
              <Link href="https://wa.me/6285771298582" className="footer-link footer-contact-link">
                <PremiumIcon name="messageCircle" size={16} /> +62 857-7129-8582
              </Link>
              <Link href="https://facebook.com" className="footer-link footer-contact-link">
                <PremiumIcon name="facebook" size={16} /> Facebook
              </Link>
              <Link href="https://instagram.com/skripzyid" className="footer-link footer-contact-link">
                <PremiumIcon name="instagram" size={16} /> Instagram
              </Link>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "2.5rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>&copy; 2026 Skripzy. All rights reserved.</p>
          <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
            <Link href="#" className="footer-social-link" aria-label="Instagram"><PremiumIcon name="instagram" size={16} /></Link>
            <Link href="#" className="footer-social-link" aria-label="Facebook"><PremiumIcon name="facebook" size={16} /></Link>
            <Link href="https://wa.me/6285771298582" className="footer-social-link" aria-label="WhatsApp customer support"><PremiumIcon name="messageCircle" size={16} /></Link>
            <Link href="mailto:cs@skripzy.id" className="footer-social-link" aria-label="Email customer support"><PremiumIcon name="inbox" size={16} /></Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-link {
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .footer-link:hover {
          color: var(--primary);
        }
        .footer-contact-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .footer-social-link {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: var(--text-muted);
          border: 1px solid var(--border);
          background: rgba(var(--surface-rgb), 0.55);
          transition: all 0.2s;
        }
        .footer-social-link:hover {
          color: var(--primary);
          border-color: rgba(var(--primary-rgb), 0.24);
          background: rgba(var(--primary-rgb), 0.08);
        }
      `}</style>
    </footer>
  );
}
