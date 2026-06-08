"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";
import { d1Request } from "@/lib/d1Client";
import { stripHtml } from "@/lib/workspaceDefaults";

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
  {
    href: "/dashboard/tools/data-analysis",
    slug: "data-analysis",
    icon: "barChart3",
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.1)",
    title: "Data Analysis",
    desc: "Olah data kuesioner, wawancara, dan observasi",
    credit: 0,
    pro: false,
    badge: "COMING SOON",
    disabled: true,
  },
  {
    href: "/dashboard/tools/form-redirect",
    slug: "form-kuesioner",
    icon: "fileText",
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.1)",
    title: "Form",
    desc: "Buat kuesioner online dengan uji statistik otomatis",
    credit: 5,
    pro: false,
    badge: "NEW",
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

function ComingSoonBadge() {
  return (
    <span style={{
      fontSize: "0.6rem", padding: "2px 7px",
      background: "linear-gradient(135deg, #F59E0B, #EF4444)",
      color: "white", borderRadius: "10px", fontWeight: 700,
      letterSpacing: "0.05em",
    }}>
      COMING SOON
    </span>
  );
}

function WorkspaceCard({ item, plan, isMobile }) {
  const isLocked = item.pro && plan === "free";
  const inner = (
    <div
      className={isMobile ? "native-card workspace-card" : "glass-panel workspace-card"}
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
        backgroundColor: "rgba(var(--surface-rgb), 0.5)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        position: "relative",
        overflow: "hidden",
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
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, zIndex: 1 }}>
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
        flexShrink: 0,
        zIndex: 1
      }}>
        <PremiumIcon name="chevronRight" size={18} />
      </div>

      {/* Wave background vector */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "100%",
          height: "45%",
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
          borderBottomRightRadius: isMobile ? "16px" : "24px",
        }}
      >
        <svg
          viewBox="0 0 120 50"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "140px",
            height: "100%",
            opacity: 0.08,
            transition: "transform 0.4s ease",
          }}
          className="wave-svg"
        >
          <path
            d="M0,50 Q30,15 60,35 T120,10 L120,50 Z"
            fill={item.iconColor || "var(--primary)"}
          />
        </svg>
      </div>
    </div>
  );

  if (isLocked) return inner;
  return <Link href={item.href} style={{ display: "block", textDecoration: "none" }}>{inner}</Link>;
}

function QuickToolCard({ tool, plan, isMobile }) {
  const isLocked = tool.pro && plan === "free";
  const isDisabled = tool.disabled;
  const isInactive = isLocked || isDisabled;
  const inner = (
    <div
      className={isMobile ? "native-card" : "glass-panel"}
      style={{
        padding: isMobile ? "1.25rem 1rem" : "1.75rem",
        display: "flex", flexDirection: "row", alignItems: "center", gap: isMobile ? "1rem" : "1.25rem",
        borderRadius: isMobile ? "16px" : "24px",
        cursor: isInactive ? "not-allowed" : "pointer",
        opacity: isInactive ? 0.5 : 1,
        transition: "all 0.3s ease",
        height: "100%",
        backgroundColor: "rgba(var(--surface-rgb), 0.5)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={e => {
        if (!isInactive) {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.05)";
        }
      }}
      onMouseLeave={e => {
        if (!isInactive) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "";
        }
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
          {isDisabled ? <ComingSoonBadge /> : (tool.pro ? <ProBadge /> : <FreeBadge />)}
        </div>
        <p style={{ fontSize: isMobile ? "0.65rem" : "0.85rem", margin: 0, lineHeight: 1.4, color: "var(--text-muted)" }}>{tool.desc}</p>
      </div>
    </div>
  );

  if (isInactive) return inner;
  return <Link href={tool.href} style={{ display: "block", textDecoration: "none" }}>{inner}</Link>;
}

// ============================================================
// Summary Panel Helpers
// ============================================================
function getChapterProgress(content) {
  const clean = stripHtml(content || "");
  const len = clean.length;
  if (len === 0) return 0;
  if (len < 120) return 20;
  if (len < 500) return 40;
  if (len < 1000) return 60;
  if (len < 2000) return 80;
  return 100;
}

function CircularProgress({ percentage }) {
  const radius = 55;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: radius * 2, height: radius * 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track circle */}
        <circle
          stroke="var(--border)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Indicator circle */}
        <circle
          stroke="var(--primary)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s ease" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1 }}>
          {percentage}%
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem", fontWeight: 600 }}>
          Selesai
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Main Dashboard Page
// ============================================================
export default function DashboardPage() {
  const { userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const [isMobile, setIsMobile] = useState(false);

  // Summary state data
  const [latestSkripsi, setLatestSkripsi] = useState(null);
  const [latestNotes, setLatestNotes] = useState("");
  const [stats, setStats] = useState({
    skripsiCount: 0,
    jurnalCount: 0,
    formsCount: 0,
    referencesCount: 0,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch summaries and stats from D1
  useEffect(() => {
    async function loadSummaryData() {
      try {
        // 1. Fetch workspaces
        const workspacesRes = await d1Request("workspaces");
        const workspaces = workspacesRes.data || [];
        
        const skripsiProjects = workspaces.filter(w => w.type === "skripsi");
        const jurnalProjects = workspaces.filter(w => w.type === "jurnal");

        // Sort skripsi by updated_at or created_at descending to find latest
        const sortedSkripsi = [...skripsiProjects].sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
        });
        const latest = sortedSkripsi[0] || null;
        setLatestSkripsi(latest);

        // 2. Fetch forms
        const formsRes = await d1Request("workspace_forms").catch(() => ({ data: [] }));
        const formsCount = (formsRes.data || []).length;

        // 3. Fetch documents from notebook metadata
        const docsRes = await d1Request("document_metadata").catch(() => ({ data: [] }));
        const referencesCount = (docsRes.data || []).length;

        setStats({
          skripsiCount: skripsiProjects.length,
          jurnalCount: jurnalProjects.length,
          formsCount,
          referencesCount,
        });

        // 4. Fetch notes for the latest skripsi workspace if exists
        if (latest) {
          const notesRes = await d1Request("workspace_notes").catch(() => ({ data: [] }));
          const note = (notesRes.data || []).find(n => n.workspace_id === latest.id && n.id === "general");
          setLatestNotes(note?.content || "");
        }
      } catch (err) {
        console.error("Failed to load summary data for dashboard:", err);
      }
    }

    if (userData) {
      loadSummaryData();
    }
  }, [userData]);

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

  // Calculate dynamic progress values
  const bab1Progress = getChapterProgress(latestSkripsi?.bab1);
  const bab2Progress = getChapterProgress(latestSkripsi?.bab2);
  const bab3Progress = getChapterProgress(latestSkripsi?.bab3);
  const bab4Progress = getChapterProgress(latestSkripsi?.bab4);
  const bab5Progress = getChapterProgress(latestSkripsi?.bab5);
  const overallProgress = Math.round((bab1Progress + bab2Progress + bab3Progress + bab4Progress + bab5Progress) / 5);

  const chapterData = [
    { label: "Bab 1", name: "Pendahuluan", value: bab1Progress },
    { label: "Bab 2", name: "Tinjauan Pustaka", value: bab2Progress },
    { label: "Bab 3", name: "Metodologi", value: bab3Progress },
    { label: "Bab 4", name: "Hasil & Pembahasan", value: bab4Progress },
    { label: "Bab 5", name: "Penutup", value: bab5Progress },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1080px", margin: "0 auto" }}>

      {/* ── Workspace Hub ────────────────────────────────── */}
      <section style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: isMobile ? "1.2rem" : "1.5rem", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
              Workspace Hub
            </h2>
            <p style={{ fontSize: isMobile ? "0.75rem" : "0.9rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>Kelola proyek penelitian Anda</p>

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

      {/* ── Summary & Progress Section ────────────────────── */}
      <section style={{ marginBottom: "4rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.62fr) minmax(0, 1.08fr)",
            gap: "1.5rem",
            alignItems: "stretch",
          }}
        >
          {/* Left: Progress Card */}
          <div
            className="glass-panel"
            style={{
              padding: isMobile ? "1.25rem" : "1.75rem",
              borderRadius: "24px",
              backgroundColor: "rgba(var(--surface-rgb), 0.5)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>Progres Skripsimu</h3>
                {latestSkripsi && (
                  <Link
                    href={`/dashboard/skripsi/edit?id=${latestSkripsi.id}`}
                    style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.2rem", textDecoration: "none" }}
                  >
                    Lihat Detail <PremiumIcon name="chevronRight" size={12} />
                  </Link>
                )}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1.5rem 0" }}>
                {latestSkripsi 
                  ? (overallProgress >= 100 
                      ? "Luar biasa! Draf skripsimu sudah lengkap." 
                      : "Terus konsisten, sedikit lagi selesai!") 
                  : "Mulai rancang skripsimu hari ini!"
                }
              </p>

              {latestSkripsi ? (
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "1.75rem", alignItems: isMobile ? "center" : "flex-start" }}>
                  <CircularProgress percentage={overallProgress} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1, width: "100%" }}>
                    {chapterData.map((ch, idx) => {
                      const isCompleted = ch.value === 100;
                      return (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", flexShrink: 0 }}>
                            {isCompleted ? (
                              <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                                <PremiumIcon name="check" size={8} style={{ color: "white" }} />
                              </div>
                            ) : (
                              <PremiumIcon name="fileText" size={14} style={{ color: "var(--text-muted)" }} />
                            )}
                          </div>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)", width: "120px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ch.label} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{ch.name}</span>
                          </span>
                          <div style={{ flex: 1, height: "6px", backgroundColor: "var(--border)", borderRadius: "3px", overflow: "hidden", margin: "0 0.5rem" }}>
                            <div style={{ width: `${ch.value}%`, height: "100%", backgroundColor: "var(--primary)", borderRadius: "3px", transition: "width 0.4s ease" }} />
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", width: "30px", textAlign: "right" }}>
                            {ch.value}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem 0", textAlign: "center", gap: "1rem" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PremiumIcon name="fileText" size={24} className="text-muted" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", margin: 0, color: "var(--text-main)" }}>Belum ada draf skripsi</h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>Mulailah dengan membuat workspace skripsi baru.</p>
                  </div>
                  <Link href="/dashboard/skripsi" className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>
                    + Buat Skripsi
                  </Link>
                </div>
              )}
            </div>

            {/* Revision Notes Section */}
            {latestSkripsi && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <PremiumIcon name="edit3" size={14} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 750, color: "var(--text-main)" }}>Catatan Revisi Terbaru</span>
                </div>
                {latestNotes ? (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4, backgroundColor: "var(--surface-hover)", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px dashed var(--border)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {latestNotes}
                  </p>
                ) : (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, fontStyle: "italic" }}>
                    Belum ada catatan revisi. Anda dapat mencatat masukan dosen di panel catatan dalam workspace skripsi.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Summary Card */}
          <div
            className="glass-panel"
            style={{
              padding: isMobile ? "1.25rem" : "1.75rem",
              borderRadius: "24px",
              backgroundColor: "rgba(var(--surface-rgb), 0.5)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 1.25rem 0", color: "var(--text-main)" }}>Ringkasan</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.85rem" }}>
                
                {/* 1. Projek Skripsi */}
                <div style={{ padding: "0.85rem", border: "1px solid var(--border)", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface-hover)" }}>
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{stats.skripsiCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Proyek Skripsi</div>
                  </div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(79, 70, 229, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                    <PremiumIcon name="fileText" size={18} />
                  </div>
                </div>

                {/* 2. Projek Jurnal */}
                <div style={{ padding: "0.85rem", border: "1px solid var(--border)", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface-hover)" }}>
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{stats.jurnalCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Proyek Jurnal</div>
                  </div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(14, 165, 233, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9" }}>
                    <PremiumIcon name="bookMarked" size={18} />
                  </div>
                </div>

                {/* 3. Jumlah Formulir */}
                <div style={{ padding: "0.85rem", border: "1px solid var(--border)", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface-hover)" }}>
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{stats.formsCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Formulir</div>
                  </div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
                    <PremiumIcon name="squarePen" size={18} />
                  </div>
                </div>

                {/* 4. Referensi Tersimpan */}
                <div style={{ padding: "0.85rem", border: "1px solid var(--border)", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface-hover)" }}>
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{stats.referencesCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Referensi</div>
                  </div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6" }}>
                    <PremiumIcon name="bookOpen" size={18} />
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Motivation Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(99, 102, 241, 0.04)",
                border: "1px solid rgba(99, 102, 241, 0.12)",
                borderRadius: "14px",
                marginTop: "1.25rem",
              }}
            >
              <div style={{ color: "var(--primary)" }}>
                <PremiumIcon name="sparkles" size={15} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.2 }}>Kamu hebat! 🌟</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Terus semangat, hasil terbaik menanti.</span>
              </div>
            </div>

          </div>
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
