"use client";
import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NotificationsPopover } from "@/components/layout/NotificationsPopover";
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
      className="app-header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: isMobile ? "calc(max(env(safe-area-inset-top, 0px), 24px) + 0.5rem)" : "1.75rem",
        paddingRight: isMobile ? "calc(env(safe-area-inset-right, 0px) + 0.6rem)" : "2rem",
        paddingBottom: isMobile ? "0.5rem" : "1rem",
        paddingLeft: isMobile ? "calc(env(safe-area-inset-left, 0px) + 0.6rem)" : "2rem",
        borderBottom: "none",
        backgroundColor: "transparent",
        boxShadow: "none",
        backdropFilter: "none",
        gap: "0.5rem",
        flexShrink: 0,
        position: "relative",
        zIndex: 20,
      }}
    >

      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0, flex: 1 }}>
        {/* Hamburger button â€” only rendered when onMenuClick is passed (mobile mode) */}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                margin: 0,
                fontWeight: 750,
                color: "var(--text-main)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Selamat datang, {userData?.namaLengkap?.split(" ")[0] || "Khoirul"} 🤙🏻
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                margin: 0,
                color: "var(--text-muted)",
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              Siap selesaikan skripsimu hari ini?
            </p>
          </div>
        )}
      </div>

      {/* —— Right: Credits + Theme + Profile —— */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        {/* Credit badge */}
        <Link
          href="/dashboard/langganan"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: isMobile ? "0.3rem 0.6rem" : "0.45rem 0.9rem",
            backgroundColor: "rgba(79, 70, 229, 0.05)",
            borderRadius: 999,
            fontSize: isMobile ? "0.75rem" : "0.82rem",
            fontWeight: 800,
            color: "var(--primary)",
            border: "1.5px solid rgba(79, 70, 229, 0.18)",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.06)",
            transition: "all 0.2s ease",
            cursor: "pointer",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = "rgba(79, 70, 229, 0.08)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = "rgba(79, 70, 229, 0.05)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Top Up Credits"
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "0.7rem",
              fontWeight: 800,
            }}
          >
            +
          </div>
          <span>{userData?.credits || 0} Credits</span>
          <PremiumIcon name="chevronDown" size={12} style={{ color: "var(--primary)", marginLeft: "0.1rem" }} />
        </Link>

        <NotificationsPopover isMobile={isMobile} />
        {!isMobile && <ThemeToggle />}

        {/* Profile avatar + logout â€” desktop only (on mobile, these are in sidebar) */}
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
                overflow: "hidden"
              }}
            >
              {userData?.photoUrl ? (
                <img src={userData.photoUrl} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                userData?.namaLengkap?.charAt(0) || userData?.name?.charAt(0) || "U"
              )}
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
