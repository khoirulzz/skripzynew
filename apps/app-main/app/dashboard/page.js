"use client";
import { useState, useEffect } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

// ============================================================
// Data: Workspace Hub
// ============================================================
const WORKSPACE_ITEMS = [
  {
    href: "/dashboard/skripsi",
    icon: "fileText",
    iconColor: "#4F46E5",
    iconBg: "rgba(79, 70, 229, 0.1)",
    title: "Workspace Skripsi",
    desc: "Mulai buat Skripsimu dari nol (Bab 1–5)",
    pro: false,
  },
  {
    href: "/dashboard/jurnal",
    icon: "bookMarked",
    iconColor: "#0EA5E9",
    iconBg: "rgba(14, 165, 233, 0.1)",
    title: "Workspace Jurnal",
    desc: "Rancang jurnal ilmiah dari nol",
    pro: false,
  },
  {
    href: "/dashboard/convert",
    icon: "sparkles",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.1)",
    title: "Convert → Jurnal",
    desc: "Ubah skripsi menjadi artikel jurnal siap publish",
    pro: true,
  },
];

// ============================================================
// Data: Quick Tools
// ============================================================
const QUICK_TOOLS = [
  {
    href: "/dashboard/tools/asisten-ai",
    slug: "asisten-ai",
    icon: "messageSquare",
    iconColor: "#4F46E5",
    iconBg: "rgba(79, 70, 229, 0.1)",
    title: "Asisten AI",
    desc: "Cari ide berdasarkan gap research dan susun latar belakang",
    credit: 1,
    pro: false,
    badge: null,
  },
  {
    href: "/dashboard/tools/parafrase",
    slug: "parafrase",
    icon: "wand",
    iconColor: "#0EA5E9",
    iconBg: "rgba(14, 165, 233, 0.1)",
    title: "Parafrase",
    desc: "Tulis ulang teksmu agar lebih orisinal",
    credit: 2,
    pro: false,
    badge: null,
  },
  {
    href: "/dashboard/tools/cek-grammar",
    slug: "cek-grammar",
    icon: "check",
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.1)",
    title: "Cek Grammar",
    desc: "Deteksi & perbaiki kesalahan bahasa",
    credit: 2,
    pro: false,
    badge: null,
  },
    {
    href: "/dashboard/tools/notebook",
    slug: "notebook-referensi",
    icon: "bookMarked",
    iconColor: "#4F46E5",
    iconBg: "rgba(79, 70, 229, 0.1)",
    title: "Notebook",
    desc: "Buat ringkasan, kutipan dan insight dari referensimu",
    credit: 5,
    pro: true,
    badge: "NEW",
  },
  {
    href: "/dashboard/tools/simulasi-sidang",
    slug: "simulasi-sidang",
    icon: "barChart",
    iconColor: "#EC4899",
    iconBg: "rgba(236, 72, 153, 0.1)",
    title: "Simulasi Sidang",
    desc: "Uji mental dan materimu bersama Dosen Penguji AI",
    credit: 5,
    pro: true,
    badge: "HOTS",
  },
  {
    href: "/dashboard/tools/referensi",
    slug: "referensi-ringkas",
    icon: "bookOpen",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.1)",
    title: "Referensi Cerdas",
    desc: "Cari jurnal & sitasi otomatis untuk artikelmu",
    credit: 2,
    pro: false,
    badge: null,
  },
  {
    href: "/dashboard/tools/humanizer",
    slug: "humanizer",
    icon: "sparkles",
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.1)",
    title: "Humanizer",
    desc: "Buat teks AI terdengar seperti manusia",
    credit: 3,
    pro: false,
    badge: null,
  },
  {
    href: "/dashboard/tools/ai-detector",
    slug: "ai-detector",
    icon: "alertCircle",
    iconColor: "#EF4444",
    iconBg: "rgba(239, 68, 68, 0.1)",
    title: "AI Detector",
    desc: "Cek apakah teksmu terdeteksi sebagai AI",
    credit: 3,
    pro: true,
    badge: "PRO",
  },
  
];

// ============================================================
// Sub-components
// ============================================================
function ProBadge() {
  return (
    <span style={{
      fontSize: "0.6rem", padding: "2px 7px",
      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
      color: "white", borderRadius: "10px", fontWeight: 700,
      letterSpacing: "0.05em",
    }}>
      PRO
    </span>
  );
}

function FreeBadge() {
  return (
    <span style={{
      fontSize: "0.6rem", padding: "2px 7px",
      background: "rgba(16, 185, 129, 0.2)",
      color: "#10B981", borderRadius: "10px", fontWeight: 700,
      letterSpacing: "0.05em",
    }}>
      FREE
    </span>
  );
}

function WorkspaceCard({ item, plan, isMobile }) {
  const isLocked = item.pro && plan === "free";
  const inner = (
    <div
      className={isMobile ? "native-card" : "glass-panel"}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: isMobile ? "0.75rem" : "1.5rem",
        padding: isMobile ? "1.25rem 1rem" : "1.75rem",
        height: "100%",
        borderRadius: isMobile ? "16px" : "24px",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.65 : 1,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={e => {
        if (!isLocked) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02)";
          const arrow = e.currentTarget.querySelector('.arrow-box');
          if (arrow) arrow.style.backgroundColor = "var(--surface-hover)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
        const arrow = e.currentTarget.querySelector('.arrow-box');
        if (arrow) arrow.style.backgroundColor = "transparent";
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
        {/* Icon container */}
        <div style={{
          width: isMobile ? "40px" : "48px", height: isMobile ? "40px" : "48px", borderRadius: "10px",
          backgroundColor: item.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <PremiumIcon name={item.icon} size={isMobile ? 20 : 24} style={{ color: item.iconColor }} />
        </div>

        {/* Text container */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
            <h4 style={{ fontSize: isMobile ? "0.9rem" : "1.1rem", margin: 0, color: "var(--text-main)", fontWeight: 700 }}>{item.title}</h4>
            {item.pro && <ProBadge />}
          </div>
          <p style={{ fontSize: isMobile ? "0.7rem" : "0.85rem", margin: 0, color: "var(--text-muted)", lineHeight: 1.4 }}>{item.desc}</p>
        </div>
      </div>

      {/* Arrow button */}
      <div className="arrow-box" style={{
        width: "36px", height: "36px", borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        transition: "all 0.2s ease",
        flexShrink: 0
      }}>
        <PremiumIcon name="chevronRight" size={18} />
      </div>
    </div>
  );

  if (isLocked) return inner;
  return <Link href={item.href} style={{ display: "block", textDecoration: "none" }}>{inner}</Link>;
}

function QuickToolCard({ tool, plan, isMobile }) {
  const isLocked = tool.pro && plan === "free";
  const inner = (
    <div
      className={isMobile ? "native-card" : "glass-panel"}
      style={{
        padding: isMobile ? "1.25rem 1rem" : "1.75rem",
        display: "flex", flexDirection: "row", alignItems: "center", gap: isMobile ? "1rem" : "1.25rem",
        borderRadius: isMobile ? "16px" : "24px",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.65 : 1,
        transition: "all 0.3s ease",
        height: "100%",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={e => {
        if (!isLocked) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.05)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Icon container */}
      <div style={{
        width: isMobile ? "38px" : "44px", height: isMobile ? "38px" : "44px", borderRadius: "9px",
        backgroundColor: tool.iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <PremiumIcon name={tool.icon} size={isMobile ? 18 : 22} style={{ color: tool.iconColor }} />
      </div>

      {/* Title + Desc */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h4 style={{ fontSize: isMobile ? "0.85rem" : "1rem", margin: 0, color: "var(--text-main)", fontWeight: 700 }}>{tool.title}</h4>
          {tool.pro ? <ProBadge /> : <FreeBadge />}
        </div>
        <p style={{ fontSize: isMobile ? "0.65rem" : "0.85rem", margin: 0, lineHeight: 1.4, color: "var(--text-muted)" }}>{tool.desc}</p>
      </div>
    </div>
  );

  if (isLocked) return inner;
  return <Link href={tool.href} style={{ display: "block", textDecoration: "none" }}>{inner}</Link>;
}

// ============================================================
// Main Dashboard Page
// ============================================================
import { useAuth } from "@/components/providers/AuthProvider";

export default function DashboardPage() {
  const { userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const currentPlan = userData?.plan || "free";
  const quickTools = QUICK_TOOLS.map((tool) => {
    if (tool.slug === "asisten-ai") {
      const titleCost = toolMap["asisten-ai-judul"]?.creditCost ?? 2;
      const backgroundCost = toolMap["asisten-ai-latar-belakang"]?.creditCost ?? 3;
      return {
        ...tool,
        creditText: `${Math.min(titleCost, backgroundCost)}-${Math.max(titleCost, backgroundCost)} credit / penggunaan`,
      };
    }

    return {
      ...tool,
      credit: tool.slug ? toolMap[tool.slug]?.creditCost ?? tool.credit : tool.credit,
    };
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1080px", margin: "0 auto" }}>

      {/* ── Workspace Hub ────────────────────────────────── */}
      <section style={{ marginBottom: "5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: isMobile ? "1.25rem" : "1.75rem", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
              Workspace Hub
            </h2>
            <p style={{ fontSize: isMobile ? "0.75rem" : "1rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>Kelola proyek penelitian Anda</p>

            {/* Decorative sparkles */}
            <div style={{
              position: "absolute",
              top: "-10px",
              right: "-40px",
              color: "var(--primary)",
              opacity: 0.6,
              transform: "rotate(15deg)"
            }}>
              <PremiumIcon name="sparkles" size={24} />
            </div>
          </div>
        </div>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", 
          gap: isMobile ? "0.85rem" : "1.5rem",
          margin: 0
        }}>
          {WORKSPACE_ITEMS.map((item) => (
            <WorkspaceCard key={item.href} item={item} plan={currentPlan} isMobile={isMobile} />
          ))}
        </div>
      </section>

      {/* ── Quick Tools ───────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: isMobile ? "1.15rem" : "1.5rem", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.02em" }}>Quick Tools & AI Features</h2>
          </div>
        </div>

        {/* Free tools */}
        <div style={{ marginBottom: "3rem" }}>
          <p style={{
            fontSize: isMobile ? "0.65rem" : "0.75rem",
            fontWeight: 800,
            color: "var(--text-muted)",
            marginBottom: "1.25rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span style={{ color: "var(--success)" }}>✓</span> Tersedia untuk Semua Plan
          </p>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", 
            gap: isMobile ? "0.85rem" : "1.25rem",
            margin: 0
          }}>
            {quickTools.filter(t => !t.pro).map(tool => (
              <QuickToolCard key={tool.href} tool={tool} plan={currentPlan} isMobile={isMobile} />
            ))}
          </div>
        </div>

        {/* Pro-only tools */}
        <div>
          <p style={{ fontSize: isMobile ? "0.65rem" : "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ★ Khusus Pro & Plus
          </p>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", 
            gap: isMobile ? "0.85rem" : "1.25rem",
            margin: 0
          }}>
            {quickTools.filter(t => t.pro).map(tool => (
              <QuickToolCard key={tool.href} tool={tool} plan={currentPlan} isMobile={isMobile} />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
