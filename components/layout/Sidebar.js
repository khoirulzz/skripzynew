"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Sidebar Component
 *
 * Desktop mode  → isCollapsed controls icon-only vs full sidebar.
 *                 toggleCollapse toggles width.
 * Mobile mode   → always rendered full (isCollapsed=false),
 *                 toggleCollapse closes the drawer (acts as X button).
 */
export function Sidebar({ isCollapsed = false, toggleCollapse, isMobile = false }) {
  const pathname = usePathname();
  const { userData } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "home", exact: true },
    { name: "Skripsi", path: "/dashboard/skripsi", icon: "fileText" },
    { name: "Jurnal", path: "/dashboard/jurnal", icon: "database" },
    { name: "Dosen AI", path: "/dashboard/chat", icon: "messageSquare" },
  ];

  const bottomItems = [
    { name: "Langganan & Kredit", path: "/dashboard/langganan", icon: "zap" },
  ];

  const isItemActive = (item) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  const renderNavLink = (item, iconColorOverride) => {
    const isActive = isItemActive(item);
    return (
      <Link
        key={item.path}
        href={item.path}
        title={isCollapsed ? item.name : undefined}
        onClick={toggleCollapse && isCollapsed === false ? undefined : undefined}
        className={`btn btn-ghost ${isActive ? "active-nav" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          padding: isCollapsed ? "0.75rem 0" : "0.75rem 1rem",
          width: "100%",
          borderRadius: "var(--radius-sm)",
          backgroundColor: isActive ? "var(--surface-hover)" : "transparent",
          color: isActive ? "var(--primary)" : "var(--text-muted)",
          fontWeight: isActive ? 600 : 500,
          fontSize: "0.9rem",
          gap: "0.75rem",
          transition: "all 0.18s ease",
        }}
      >
        <span style={{ flexShrink: 0 }}>
          <PremiumIcon
            name={item.icon}
            size={20}
            style={iconColorOverride ? { color: iconColorOverride } : undefined}
          />
        </span>
        {!isCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>}
      </Link>
    );
  };

  return (
    <aside
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--background)",
        borderRight: "1px solid var(--border)",
        overflow: "hidden",
        padding: "0 0.5rem 1.5rem",
      }}
    >
      {/* ── Sidebar Header ───────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: "0.875rem 0.5rem",
          borderBottom: "1px solid var(--border)",
          minHeight: "56px",
          gap: "0.5rem",
        }}
      >
        {/* Brand logo — hidden when collapsed */}
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/logo-skripzy.webp" alt="Skripzy" width={28} height={28} style={{ borderRadius: "4px" }} />
            <span style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Skripzy.
            </span>
            {isMobile && (
              <div style={{ marginLeft: "0.5rem" }}>
                <ThemeToggle />
              </div>
            )}
          </div>
        )}

        {/* Hamburger / X toggle button — always visible */}
        <button
          onClick={toggleCollapse}
          className="btn btn-ghost"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{
            padding: "0.5rem",
            flexShrink: 0,
            borderRadius: "var(--radius-sm)",
          }}
        >
          <PremiumIcon name={isCollapsed ? "menu" : "x"} size={20} />
        </button>
      </div>

      {/* ── Nav Items ────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          paddingTop: "0.75rem",
          overflowY: "auto",
        }}
      >
        {navItems.map((item) => renderNavLink(item))}
      </nav>

      {/* ── Bottom Items ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          borderTop: "1px solid var(--border)",
          paddingTop: "0.75rem",
        }}
      >
        {bottomItems.map((item) => renderNavLink(item, "#F59E0B"))}
        <Link
          href="/dashboard/settings"
          title={isCollapsed ? "Pengaturan" : undefined}
          className="btn btn-ghost"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            width: "100%",
            padding: isCollapsed ? "0.75rem 0" : "0.75rem 1rem",
            gap: "0.75rem",
            fontSize: "0.9rem",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <PremiumIcon name="settings" size={20} />
          {!isCollapsed && <span>Pengaturan</span>}
        </Link>
        
        {/* Mobile Profile & Logout */}
        {isMobile && (
          <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
             <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
               <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                 {userData?.namaLengkap?.charAt(0) || "U"}
               </div>
               <div style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                 {userData?.namaLengkap || "Peneliti"}
               </div>
             </div>
             <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: "0.5rem", color: "var(--danger)" }} title="Keluar">
               <PremiumIcon name="logout" size={18} />
             </button>
          </div>
        )}
      </div>
    </aside>
  );
}
