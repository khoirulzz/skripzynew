"use client";

import LandingLayout from "@/components/layout/LandingLayout";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const platforms = [
  {
    icon: "globe",
    title: "Web App",
    status: "Siap dipakai",
    desc: "Buka Skripzy dari browser dan langsung lanjutkan workspace risetmu. Cocok untuk menulis di laptop kampus, rumah, atau warnet saat darurat.",
    benefits: ["Tidak perlu instalasi", "Cocok untuk Chrome, Edge, Safari, dan Firefox", "Akses dashboard dan tools utama"],
    cta: "Buka Web App",
    href: "/register",
    disabled: false,
  },
  {
    icon: "downloadCloud",
    title: "PWA",
    status: "Install dari browser",
    desc: "Tambahkan Skripzy ke home screen supaya terasa seperti aplikasi. Lebih cepat dibuka saat kamu perlu cek catatan atau revisi singkat.",
    benefits: ["Ikon aplikasi di perangkat", "Lebih cepat balik ke workspace", "Tetap memakai akun yang sama"],
    cta: "Coba dari Browser",
    href: "/register",
    disabled: false,
  },
  {
    icon: "layoutTemplate",
    title: "Desktop App",
    status: "Segera hadir",
    desc: "Versi desktop disiapkan untuk pengalaman menulis yang lebih fokus dan minim gangguan tab.",
    benefits: ["Mode kerja fokus", "Shortcut yang lebih lengkap", "Pengalaman menulis lebih lega"],
    cta: "Segera Hadir",
    href: "#",
    disabled: true,
  },
];

const useCases = [
  {
    title: "Di laptop",
    desc: "Tulis draf, susun kerangka, dan buka referensi dalam layar yang lebih lega.",
  },
  {
    title: "Di HP",
    desc: "Cek catatan bimbingan, baca ringkasan jurnal, atau simpan ide yang muncul tiba-tiba.",
  },
  {
    title: "Di sela aktivitas",
    desc: "Lanjutkan satu bagian kecil tanpa harus membuka ulang semua file dari awal.",
  },
];

export default function AppsPage() {
  return (
    <LandingLayout>
      <section className="landing-section" style={{ paddingTop: "clamp(5.7rem, 9vw, 8.5rem)" }}>
        <div className="container">
          <div className="landing-two-col">
            <div>
              <span className="landing-kicker">Akses Skripzy</span>
              <h1 className="landing-heading" style={{ fontSize: "clamp(2.45rem, 5vw, 4.35rem)", marginTop: "1rem", marginBottom: "1.25rem" }}>
                Workspace riset yang bisa kamu buka dari mana saja.
              </h1>
              <p className="landing-copy" style={{ fontSize: "1.1rem", maxWidth: "62ch", marginBottom: "1.5rem" }}>
                Kadang ide muncul saat tidak sedang duduk manis di meja. Skripzy dibuat supaya catatan, referensi, dan progresmu tetap mudah dijangkau.
              </p>
              <Link href="/register" className="btn btn-primary" style={{ borderRadius: 999, padding: "0.92rem 1.4rem", fontWeight: 850 }}>
                Mulai dari Web App
              </Link>
            </div>

            <DevicePreview />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 3rem" }}>
            <span className="landing-kicker">Platform</span>
            <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.15rem)", marginTop: "1rem", textAlign: "center" }}>
              Mulai dari browser, lanjutkan sesuai kebutuhanmu.
            </h2>
          </div>

          <div className="landing-auto-grid">
            {platforms.map((platform) => (
              <PlatformCard key={platform.title} platform={platform} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="landing-two-col">
            <div>
              <span className="landing-kicker">Sinkron</span>
              <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", marginTop: "1rem", marginBottom: "1rem" }}>
                Satu akun untuk semua ritme kerjamu.
              </h2>
              <p className="landing-copy" style={{ fontSize: "1.06rem", marginBottom: "1.5rem" }}>
                Mulai menulis di laptop, cek ulang dari HP, lalu lanjutkan lagi saat ada waktu. Workspace tetap menjadi pusatnya, jadi progres tidak terasa tercecer.
              </p>
              <div className="landing-pill-row">
                <span className="landing-pill"><PremiumIcon name="refreshCw" size={16} /> Sinkron otomatis</span>
                <span className="landing-pill"><PremiumIcon name="layers" size={16} /> Satu workspace</span>
                <span className="landing-pill"><PremiumIcon name="checkCircle" size={16} /> Mudah dilanjutkan</span>
              </div>
            </div>

            <div className="landing-stack">
              {useCases.map((item) => (
                <div key={item.title} className="landing-card" style={{ padding: "1.25rem" }}>
                  <h3 style={{ margin: "0 0 0.35rem", color: "var(--text-main)", fontSize: "1.15rem", fontWeight: 900 }}>{item.title}</h3>
                  <p className="landing-copy" style={{ margin: 0 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function DevicePreview() {
  return (
    <div className="landing-visual" style={{ minHeight: 460, padding: "1.25rem", display: "grid", placeItems: "center" }}>
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "end", justifyContent: "center", gap: "1rem", width: "100%" }}>
        <div className="landing-card" style={{ width: "62%", minWidth: 230, height: 270, padding: "1rem", background: "rgba(var(--surface-rgb), 0.82)" }}>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "#ef4444" }} />
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "#f59e0b" }} />
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "#10b981" }} />
          </div>
          <p style={{ margin: "0 0 0.6rem", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 800 }}>Dashboard</p>
          <div style={{ display: "grid", gap: "0.55rem" }}>
            <span style={{ height: 38, borderRadius: 8, background: "rgba(var(--primary-rgb), 0.12)" }} />
            <span style={{ height: 38, borderRadius: 8, background: "rgba(var(--surface-rgb), 0.72)", border: "1px solid rgba(var(--primary-rgb), 0.08)" }} />
            <span style={{ height: 38, borderRadius: 8, background: "rgba(var(--surface-rgb), 0.72)", border: "1px solid rgba(var(--primary-rgb), 0.08)" }} />
          </div>
        </div>
        <div className="landing-card" style={{ width: 150, height: 300, borderRadius: 24, padding: "1rem 0.8rem", background: "rgba(var(--surface-rgb), 0.86)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ width: 46, height: 5, borderRadius: 99, background: "rgba(var(--primary-rgb), 0.22)", margin: "0 auto" }} />
          <div>
            <PremiumIcon name="bookMarked" size={28} className="text-primary" />
            <p style={{ margin: "0.75rem 0 0", color: "var(--text-main)", fontWeight: 900, lineHeight: 1.25 }}>Catatan bimbingan siap dibuka</p>
          </div>
          <span style={{ height: 34, borderRadius: 999, background: "var(--primary)" }} />
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ platform }) {
  const content = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div className="landing-icon-box">
          <PremiumIcon name={platform.icon} size={22} />
        </div>
        <span className="landing-pill" style={{ padding: "0.38rem 0.65rem", fontSize: "0.74rem", color: platform.disabled ? "var(--text-muted)" : "var(--primary)" }}>
          {platform.status}
        </span>
      </div>
      <div>
        <h3 style={{ margin: "1rem 0 0.6rem", color: "var(--text-main)", fontSize: "1.28rem", fontWeight: 900 }}>{platform.title}</h3>
        <p className="landing-copy" style={{ margin: 0, fontSize: "0.96rem" }}>{platform.desc}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid rgba(var(--primary-rgb), 0.1)" }}>
        {platform.benefits.map((benefit) => (
          <div key={benefit} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
            <PremiumIcon name="check" size={15} className="text-primary" style={{ marginTop: 3 }} />
            <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 650, lineHeight: 1.45 }}>{benefit}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="landing-card" style={{ padding: "1.45rem", display: "flex", flexDirection: "column", gap: "1rem", minHeight: 430 }}>
      {content}
      {platform.disabled ? (
        <button className="btn btn-outline" style={{ borderRadius: 999, padding: "0.85rem", fontWeight: 850, opacity: 0.62, cursor: "not-allowed" }} disabled>
          {platform.cta}
        </button>
      ) : (
        <Link href={platform.href} className="btn btn-primary" style={{ borderRadius: 999, padding: "0.85rem", fontWeight: 850 }}>
          {platform.cta}
        </Link>
      )}
    </div>
  );
}
