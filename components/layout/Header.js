"use client";
import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";

/**
 * Header component
 * @param {function|null} onMenuClick - If provided, renders a hamburger button (used on mobile)
 * @param {boolean}       isMobile   - Whether we are in mobile viewport
 */
export function Header({ onMenuClick = null, isMobile = false }) {
  const { userData } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        gap: "0.75rem",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* ── Left: Hamburger (mobile) + Brand / Welcome ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0, flex: 1 }}>
        {/* Hamburger button — only rendered when onMenuClick is passed (mobile mode) */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="btn btn-ghost"
            title="Buka Menu"
            style={{ padding: "0.5rem", flexShrink: 0 }}
          >
            <PremiumIcon name="menu" size={22} />
          </button>
        )}

        {/* Brand logo shown on mobile (since sidebar is hidden) */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Image src="/logo-skripzy.webp" alt="Skripzy" width={24} height={24} style={{ borderRadius: "4px" }} />
            <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Skripzy.
            </span>
          </div>
        )}

        {/* Welcome text — hidden on mobile to save space */}
        {!isMobile && (
          <h2
            style={{
              fontSize: "1rem",
              margin: 0,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--text-main)",
            }}
          >
            Selamat datang, {userData?.namaLengkap?.split(" ")[0] || "Peneliti"} 👋
          </h2>
        )}
      </div>

      {/* ── Right: Credits + Theme + Profile ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
        {/* Credit badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.45rem 0.7rem",
            backgroundColor: "var(--surface-hover)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "1px solid var(--border)",
          }}
        >
          <PremiumIcon name="coins" size={14} className="text-primary" />
          <span>{userData?.credits || 0}{!isMobile && " Credits"}</span>
          <Link
            href="/dashboard/langganan"
            className="btn btn-primary"
            title="Top Up Credits"
            style={{
              padding: "0.2rem 0.45rem",
              fontSize: "0.7rem",
              marginLeft: "0.2rem",
              borderRadius: "50%",
              minWidth: "auto",
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </Link>
        </div>

        {!isMobile && <ThemeToggle />}

        {/* Profile avatar + logout — desktop only (on mobile, these are in sidebar) */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "var(--primary-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
                fontWeight: 700,
                fontSize: "0.85rem",
                flexShrink: 0,
              }}
            >
              {userData?.namaLengkap?.charAt(0) || "U"}
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ padding: "0.45rem" }}
              title="Keluar"
            >
              <PremiumIcon name="logout" size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
