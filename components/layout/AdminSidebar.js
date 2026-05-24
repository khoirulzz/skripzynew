"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * AdminSidebar Component
 * Navigation khusus untuk admin panel dengan menu manajemen
 */
export default function AdminSidebar({ isCollapsed = false, isMobile = false, isOpen = false, onClose }) {
  const pathname = usePathname();
  const { userData } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: "barChart3", exact: true },
    { name: "Manajemen Kredit", path: "/admin/credits", icon: "coins" },
    { name: "Manajemen User", path: "/admin/users", icon: "users" },
    { name: "Manajemen Harga", path: "/admin/pricing", icon: "tag" },
    { name: "Manajemen Promo", path: "/admin/promos", icon: "gift" },
    { name: "Manajemen Notifikasi", path: "/admin/notifikasi", icon: "bell" },
    { name: "API Usage", path: "/admin/api-usage", icon: "activity" },
  ];

  const isItemActive = (item) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + "/");
  };

  const renderNavLink = (item) => {
    const isActive = isItemActive(item);
    return (
      <Link
        key={item.path}
        href={item.path}
        title={isCollapsed ? item.name : undefined}
        onClick={isMobile ? onClose : undefined}
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
          <PremiumIcon name={item.icon} size={20} />
        </span>
        {!isCollapsed && (
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.name}
          </span>
        )}
      </Link>
    );
  };

  // Desktop sidebar positioning
  const desktopStyle = {
    width: isCollapsed ? "72px" : "260px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--background)",
    borderRight: "1px solid var(--border)",
    overflow: "auto",
    padding: "0 0.5rem 1.5rem",
    transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
    flexShrink: 0,
  };

  // Mobile sidebar positioning
  const mobileStyle = {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 50,
    width: "260px",
    backgroundColor: "var(--background)",
    borderRight: "1px solid var(--border)",
    boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
    transform: isOpen ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    overflow: "auto",
    padding: "0 0.5rem 1.5rem",
    display: "flex",
    flexDirection: "column",
  };

  const containerStyle = isMobile ? mobileStyle : desktopStyle;

  return (
    <aside style={containerStyle}>
      {/* ── Sidebar Header ───────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: "0.875rem 0.5rem",
          borderBottom: "1px solid var(--border)",
          minHeight: "56px",
          marginBottom: "0.5rem",
        }}
      >
        {!isCollapsed && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
              <img
                src="/logo-skripzy.webp"
                alt="Skripzy Admin"
                width={24}
                height={24}
                style={{ borderRadius: "4px", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Admin Panel
              </span>
            </div>
            {isMobile && (
              <button
                onClick={onClose}
                className="btn btn-ghost"
                title="Tutup Menu"
                style={{ padding: "0.5rem", flexShrink: 0 }}
              >
                <PremiumIcon name="x" size={20} />
              </button>
            )}
          </>
        )}
        {isCollapsed && !isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <img
              src="/logo-skripzy.webp"
              alt="Skripzy"
              width={20}
              height={20}
              style={{ borderRadius: "3px" }}
            />
          </div>
        )}
      </div>

      {/* ── Navigation Items ───────────────────────────────── */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem", paddingTop: "0.5rem" }}>
        {navItems.map((item) => renderNavLink(item))}
      </nav>

      {/* ── Footer: User + Theme + Logout ───────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        {!isCollapsed && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "var(--surface-hover)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              maxWidth: "100%",
            }}
          >
            <p style={{ margin: "0 0 0.25rem 0", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {userData?.namaLengkap || "Admin"}
            </p>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.75rem" }}>
              {userData?.email || "admin@skripzy.com"}
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            title="Logout"
            style={{
              flex: 1,
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              gap: "0.75rem",
            }}
          >
            <PremiumIcon name="logout" size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
