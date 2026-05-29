"use client";

import LandingLayout from "@/components/layout/LandingLayout";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { PLAN_METADATA, formatRupiah, buildBillingCatalog } from "@/lib/billing";
import Link from "next/link";
import { useEffect, useState } from "react";

const planNotes = {
  free: {
    cta: "Coba Gratis",
    helper: "Pas untuk kenalan dulu dengan alur kerja Skripzy.",
    badge: "Mulai santai",
  },
  pro: {
    cta: "Pilih Pro",
    helper: "Paling pas untuk mahasiswa yang sedang aktif ngerjain skripsi.",
    badge: "Terpopuler",
  },
  plus: {
    cta: "Pilih Plus",
    helper: "Untuk riset intensif, revisi padat, dan kebutuhan AI lebih sering.",
    badge: "Kapasitas besar",
  },
};

const creditFacts = [
  {
    icon: "zap",
    title: "Kredit dipakai saat AI bekerja",
    desc: "Misalnya saat meminta bantuan menyusun ide, cek grammar, parafrase, atau simulasi sidang.",
  },
  {
    icon: "wallet",
    title: "Mulai dari Free, upgrade nanti",
    desc: "Kamu bisa mencoba dulu tanpa komitmen. Saat kebutuhan makin serius, tinggal naik paket.",
  },
  {
    icon: "checkCircle",
    title: "Tetap kamu yang memegang riset",
    desc: "AI membantu merapikan proses, tapi keputusan akademik dan arah tulisan tetap ada di tanganmu.",
  },
];

export default function PricingPage() {
  const [planOrder, setPlanOrder] = useState([PLAN_METADATA.free, PLAN_METADATA.pro, PLAN_METADATA.plus]);

  useEffect(() => {
    fetch("https://apikey.skripzy-app.workers.dev/api/d1/pricing")
      .then(res => res.json())
      .then(json => {
        if (json && json.data) {
          const catalog = buildBillingCatalog(json.data);
          if (catalog.plans && catalog.plans.length > 0) {
            setPlanOrder(catalog.plans);
          }
        }
      })
      .catch(err => console.error("Failed to fetch pricing:", err));
  }, []);

  return (
    <LandingLayout>
      <section className="landing-section" style={{ paddingTop: "clamp(5.7rem, 9vw, 8.5rem)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 800, margin: "0 auto 4rem" }}>
            <span className="landing-kicker">Pricing</span>
            <h1 className="landing-heading" style={{ fontSize: "clamp(2.45rem, 5vw, 4.35rem)", marginTop: "1rem", marginBottom: "1.2rem", textAlign: "center" }}>
              Pilih paket yang cocok dengan ritme risetmu.
            </h1>
            <p className="landing-copy" style={{ fontSize: "1.12rem", textAlign: "center", margin: 0 }}>
              Mulai gratis untuk merasakan workspace-nya. Kalau sudah masuk fase ngebut, pilih paket dengan kredit dan fitur yang lebih lega.
            </p>
          </div>

          <div className="landing-auto-grid" style={{ alignItems: "stretch" }}>
            {planOrder.map((plan) => (
              <PricingCard key={plan.planId} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <div className="landing-two-col">
            <div>
              <span className="landing-kicker">Sistem kredit</span>
              <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", marginTop: "1rem", marginBottom: "1rem" }}>
                Biar pemakaian AI tetap jelas dan terkendali.
              </h2>
              <p className="landing-copy" style={{ fontSize: "1.06rem", marginBottom: "1.5rem" }}>
                Kredit membantu kamu melihat pemakaian AI dengan lebih transparan. Tidak perlu menebak-nebak, setiap fitur punya biaya kredit yang bisa dicek sebelum digunakan.
              </p>
              <Link href="https://app.skripzy.id/register" className="btn btn-primary" style={{ borderRadius: 999, padding: "0.9rem 1.35rem", fontWeight: 800 }}>
                Mulai dari Free Plan
              </Link>
            </div>

            <div className="landing-stack">
              {creditFacts.map((item) => (
                <div key={item.title} className="landing-card" style={{ padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div className="landing-icon-box">
                    <PremiumIcon name={item.icon} size={21} />
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.08rem", fontWeight: 850, color: "var(--text-main)" }}>{item.title}</h3>
                    <p className="landing-copy" style={{ margin: 0, fontSize: "0.95rem" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 3rem" }}>
            <span className="landing-kicker">FAQ</span>
            <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginTop: "1rem", textAlign: "center" }}>
              Pertanyaan yang biasanya muncul sebelum upgrade.
            </h2>
          </div>

          <div className="landing-auto-grid">
            <FAQItem q="Apakah Free Plan benar-benar bisa dipakai?" a="Bisa. Free Plan dibuat supaya kamu bisa mencoba alur dasar Skripzy sebelum memutuskan upgrade." />
            <FAQItem q="Kapan sebaiknya pilih Pro?" a="Kalau kamu sudah rutin menulis, mengelola referensi, dan sering memakai AI untuk revisi, Pro biasanya paling seimbang." />
            <FAQItem q="Apa bedanya Pro dan Plus?" a="Plus memberi kapasitas lebih besar untuk ritme riset yang padat, misalnya banyak revisi, analisis, atau persiapan sidang." />
            <FAQItem q="Apakah AI menulis skripsi saya?" a="Tidak. Skripzy membantu merapikan ide, memberi saran, dan mempercepat proses. Arah riset dan keputusan akhir tetap milikmu." />
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function PricingCard({ plan }) {
  const price = plan.price ?? plan.defaultPrice ?? 0;
  const note = planNotes[plan.planId] || planNotes.free;
  const popular = plan.popular || plan.planId === "pro";

  return (
    <div
      className="landing-card"
      style={{
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        minHeight: 560,
        border: popular ? "1.5px solid var(--primary)" : "1px solid rgba(var(--primary-rgb), 0.1)",
        background: popular ? "linear-gradient(180deg, rgba(var(--primary-rgb), 0.1), rgba(var(--surface-rgb), 0.76))" : "rgba(var(--surface-rgb), 0.72)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <span className="landing-pill" style={{ padding: "0.4rem 0.7rem", fontSize: "0.75rem", color: popular ? "var(--primary)" : "var(--text-muted)" }}>
            {note.badge}
          </span>
          <h3 style={{ fontSize: "1.45rem", fontWeight: 900, margin: "1rem 0 0.35rem", color: "var(--text-main)" }}>{plan.name}</h3>
          <p className="landing-copy" style={{ margin: 0, fontSize: "0.95rem" }}>{plan.shortDescription || plan.description}</p>
        </div>
        <div className="landing-icon-box">
          <PremiumIcon name={popular ? "sparkles" : "creditCard"} size={22} />
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "clamp(2rem, 4vw, 2.65rem)", fontWeight: 950, color: "var(--text-main)", letterSpacing: "-0.04em" }}>
            {formatRupiah(price)}
          </span>
          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>/ bulan</span>
        </div>
        <p className="landing-copy" style={{ margin: "0.45rem 0 0", fontSize: "0.9rem" }}>{note.helper}</p>
      </div>

      <Link href="https://app.skripzy.id/register" className={`btn ${popular ? "btn-primary" : "btn-outline"}`} style={{ width: "100%", padding: "0.9rem", borderRadius: 999, fontWeight: 850, marginBottom: "1.5rem" }}>
        {note.cta}
      </Link>

      <div style={{ borderTop: "1px solid rgba(var(--primary-rgb), 0.1)", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1 }}>
        {(plan.features || []).map((feature) => (
          <div key={feature} style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
            <PremiumIcon name="checkCircle" size={17} className="text-primary" style={{ marginTop: 2 }} />
            <span style={{ color: "var(--text-main)", fontWeight: 650, lineHeight: 1.45, fontSize: "0.94rem" }}>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQItem({ q, a }) {
  return (
    <div className="landing-card" style={{ padding: "1.4rem" }}>
      <h3 style={{ fontSize: "1.08rem", fontWeight: 850, marginBottom: "0.75rem", color: "var(--text-main)", lineHeight: 1.35 }}>{q}</h3>
      <p className="landing-copy" style={{ margin: 0, fontSize: "0.95rem" }}>{a}</p>
    </div>
  );
}
