"use client";

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
    desc: "Buat & kelola dokumen skripsi Bab 1–5",
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
    desc: "Ubah skripsi menjadi artikel jurnal",
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
    desc: "Tanya apa saja seputar penelitianmu",
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
    desc: "Tulis ulang teks agar lebih orisinal",
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
    href: "/dashboard/tools/humanizer",
    slug: "humanizer",
    icon: "sparkles",
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.1)",
    title: "Humanizer",
    desc: "Buat teks AI terdengar seperti manusia",
    credit: 3,
    pro: true,
    badge: "PRO",
  },
  {
    href: "/dashboard/tools/ai-detector",
    slug: "ai-detector",
    icon: "alertCircle",
    iconColor: "#EF4444",
    iconBg: "rgba(239, 68, 68, 0.1)",
    title: "AI Detector",
    desc: "Cek apakah teks terdeteksi sebagai AI",
    credit: 3,
    pro: true,
    badge: "PRO",
  },
  {
    href: "/dashboard/tools/referensi",
    slug: "referensi-ringkas",
    icon: "bookOpen",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.1)",
    title: "Referensi Cerdas",
    desc: "Cari jurnal & sitasi otomatis APA/IEEE",
    credit: 2,
    pro: true,
    badge: "PRO",
  },
  {
    href: "/dashboard/tools/simulasi-sidang",
    slug: "simulasi-sidang",
    icon: "barChart",
    iconColor: "#EC4899",
    iconBg: "rgba(236, 72, 153, 0.1)",
    title: "Simulasi Sidang",
    desc: "Latih presentasi & tanya jawab sidang",
    credit: 5,
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

function WorkspaceCard({ item, plan }) {
  const isLocked = item.pro && plan === "free";
  const inner = (
    <div
      className="glass-panel"
      style={{
        display: "flex", flexDirection: "column", gap: "1rem",
        padding: "1.5rem", height: "100%",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.65 : 1,
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={e => { if (!isLocked) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{
        width: "44px", height: "44px", borderRadius: "10px",
        backgroundColor: item.iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <PremiumIcon name={item.icon} size={22} style={{ color: item.iconColor }} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <h4 style={{ fontSize: "1rem", margin: 0, color: "var(--text-main)" }}>{item.title}</h4>
          {item.pro && <ProBadge />}
        </div>
        <p style={{ fontSize: "0.8rem", margin: 0 }}>{item.desc}</p>
      </div>
    </div>
  );

  if (isLocked) return inner;
  return <Link href={item.href} style={{ display: "block", textDecoration: "none" }}>{inner}</Link>;
}

function QuickToolCard({ tool, plan }) {
  const isLocked = tool.pro && plan === "free";
  const inner = (
    <div
      className="glass-panel"
      style={{
        padding: "1.25rem",
        display: "flex", flexDirection: "column", gap: "0.85rem",
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.65 : 1,
        transition: "transform 0.2s, box-shadow 0.2s",
        height: "100%",
      }}
      onMouseEnter={e => { if (!isLocked) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Icon + Badge */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "8px",
          backgroundColor: tool.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <PremiumIcon name={tool.icon} size={18} style={{ color: tool.iconColor }} />
        </div>
        {tool.badge && <ProBadge />}
      </div>

      {/* Title + Desc */}
      <div>
        <h4 style={{ fontSize: "0.9rem", margin: "0 0 0.2rem 0", color: "var(--text-main)" }}>{tool.title}</h4>
        <p style={{ fontSize: "0.75rem", margin: 0, lineHeight: 1.4 }}>{tool.desc}</p>
      </div>

      {/* Credit cost */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "auto" }}>
        <PremiumIcon name="zap" size={12} style={{ color: tool.iconColor }} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {tool.creditText || `${tool.credit} credit / penggunaan`}
        </span>
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
      <section className="mb-10 sm:mb-12">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>Workspace Hub</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.4rem 0 0 0" }}>Kelola proyek penelitian Anda</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {WORKSPACE_ITEMS.map((item) => (
            <WorkspaceCard key={item.href} item={item} plan={currentPlan} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "var(--border)", margin: "2rem 0" }}></div>

      {/* ── Quick Tools ───────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>Quick Tools & AI Features</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
              <PremiumIcon name="zap" size={14} style={{ color: "var(--primary)" }} />
              <span>Gunakan credit untuk mengakses tools</span>
            </div>
          </div>
        </div>

        {/* Free tools */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ✓ Tersedia untuk Semua Plan
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {quickTools.filter(t => !t.pro).map(tool => (
              <QuickToolCard key={tool.href} tool={tool} plan={currentPlan} />
            ))}
          </div>
        </div>

        {/* Pro-only tools */}
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ★ Khusus Pro & Plus
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {quickTools.filter(t => t.pro).map(tool => (
              <QuickToolCard key={tool.href} tool={tool} plan={currentPlan} />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
