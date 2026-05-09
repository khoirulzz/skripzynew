"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function LandingHeader() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Fitur", href: "/features" },
    { label: "Harga", href: "/pricing" },
    { label: "Promo", href: "/promo" },
    { label: "Apps", href: "/apps" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: scrolled ? "1rem" : "0",
        left: "0",
        right: "0",
        zIndex: 1000,
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        display: "flex",
        justifyContent: "center",
        padding: scrolled ? "0 1rem" : "1rem 0",
      }}
    >
      <div
        className={scrolled ? "glass-pill" : ""}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: scrolled ? "0.6rem 1.5rem" : "0.5rem 2rem",
          width: "100%",
          maxWidth: scrolled ? "900px" : "1200px",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
          <Image
            src="/logo-skripzy.webp"
            alt="Skripzy"
            width={32}
            height={32}
            style={{ borderRadius: "8px" }}
          />
          <span style={{ fontSize: "1.25rem", fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text-main)" }}>
            Skripzy<span style={{ color: "var(--primary)" }}>.</span>
          </span>
        </Link>

        <div className="hide-mobile" style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: pathname === link.href ? "var(--primary)" : "var(--text-muted)",
                transition: "color 0.2s"
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="hide-mobile">
            <ThemeToggle />
          </div>
          {loading ? null : user ? (
            <a href="https://app.skripzy.id/dashboard" className="btn btn-primary hide-mobile" style={{ borderRadius: "999px", padding: "0.6rem 1.25rem", fontWeight: 800 }}>
              Dashboard
            </a>
          ) : (
            <a href="https://app.skripzy.id/login" className="btn btn-primary hide-mobile" style={{ borderRadius: "999px", padding: "0.6rem 1.25rem", fontWeight: 800 }}>
              Mulai
            </a>
          )}
          <button
            type="button"
            className="show-mobile landing-menu-button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
          >
            <PremiumIcon name={menuOpen ? "x" : "menu"} size={19} />
          </button>
        </div>

        {menuOpen && (
          <div className="landing-mobile-menu show-mobile">
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="landing-mobile-menu-link"
                  style={{
                    color: pathname === link.href ? "var(--primary)" : "var(--text-main)",
                    background: pathname === link.href ? "rgba(var(--primary-rgb), 0.09)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(var(--primary-rgb), 0.1)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
              <ThemeToggle />
              {loading ? null : user ? (
                <a href="https://app.skripzy.id/dashboard" className="btn btn-primary" style={{ borderRadius: "999px", padding: "0.58rem 0.9rem", fontWeight: 800, fontSize: "0.78rem" }}>
                  Dashboard
                </a>
              ) : (
                <a href="https://app.skripzy.id/login" className="btn btn-primary" style={{ borderRadius: "999px", padding: "0.58rem 0.9rem", fontWeight: 800, fontSize: "0.78rem" }}>
                  Mulai
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
