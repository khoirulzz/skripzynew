"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }) {
  // Desktop: controls sidebar collapse (icon-only vs full)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  // Mobile: controls drawer open/close
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Track screen size
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile drawer on route-like navigation
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <AuthGuard requireAuth={true}>
      <div className="bg-techy" style={{ display: "flex", minHeight: "100vh", overflow: "hidden", position: "relative" }}>
        <div className="noise-overlay" />
        
        {/* Mesh Glow Elements for "Techy" feel */}
        <div className="mesh-glow" style={{ top: "-10%", left: "-5%", background: "rgba(var(--primary-rgb), 0.15)" }} />
        <div className="mesh-glow" style={{ bottom: "10%", right: "-5%", background: "rgba(139, 92, 246, 0.1)" }} />

        {/* -- MOBILE: Backdrop overlay -- */}
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

        {/* -- MOBILE: Sliding sidebar drawer -- */}
        {isMobile && (
          <div
            className="glass-panel"
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 50,
              width: "260px",
              borderRight: "1px solid rgba(79,70,229,0.12)",
              boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
              transform: isMobileOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <Sidebar isCollapsed={false} toggleCollapse={closeMobile} isMobile={true} />
          </div>
        )}

        {/* -- DESKTOP: Static sidebar (collapsible width) -- */}
        {!isMobile && (
          <div
            style={{
              width: isDesktopCollapsed ? "72px" : "260px",
              flexShrink: 0,
              transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
              height: "100vh",
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <Sidebar
              isCollapsed={isDesktopCollapsed}
              toggleCollapse={() => setIsDesktopCollapsed((prev) => !prev)}
              isMobile={false}
            />
          </div>
        )}

        <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
          {/* Pass mobile toggle or desktop collapse toggle so Header can render the hamburger */}
          <Header
            onMenuClick={isMobile ? () => setIsMobileOpen((prev) => !prev) : null}
            isMobile={isMobile}
          />
          <div style={{ padding: isMobile ? "0.75rem" : "1.5rem", overflowY: "auto", flex: 1, position: "relative" }}>
            {/* Content wrapper */}
            <div style={{ position: "relative", zIndex: 1 }}>
              {children}
            </div>
          </div>
        </main>

      </div>
    </AuthGuard>
  );
}
