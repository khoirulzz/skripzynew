"use client";

import { useState, useEffect } from "react";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({ children }) {
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <AdminGuard>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--background)", overflow: "hidden", position: "relative" }}>

        {/* Mobile Backdrop */}
        {isMobile && isMobileOpen && (
          <div
            onClick={closeMobile}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(3px)",
              zIndex: 40,
            }}
          />
        )}

        {/* Admin Sidebar */}
        <AdminSidebar
          isMobile={isMobile}
          isOpen={isMobileOpen}
          isCollapsed={isDesktopCollapsed}
          onClose={closeMobile}
        />

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Header
            isMobile={isMobile}
            onMenuClick={() => {
              if (isMobile) {
                setIsMobileOpen(!isMobileOpen);
              } else {
                setIsDesktopCollapsed(!isDesktopCollapsed);
              }
            }}
          />
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
