"use client";

import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";

export default function LandingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative bg-techy">
      <div className="noise-overlay" />
      
      {/* Mesh Glow Elements for "Techy" feel */}
      <div className="mesh-glow" style={{ top: "-10%", left: "-5%", background: "rgba(var(--primary-rgb), 0.15)" }} />
      <div className="mesh-glow" style={{ bottom: "10%", right: "-5%", background: "rgba(139, 92, 246, 0.1)" }} />
      
      <LandingHeader />
      
      <main style={{ flex: 1 }}>
        {children}
      </main>
      
      <LandingFooter />
    </div>
  );
}
