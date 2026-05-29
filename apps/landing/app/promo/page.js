"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LandingLayout from "@/components/layout/LandingLayout";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { getPromos, isPromoActive } from "@/lib/adminPromos";

const fallbackPromos = [
  {
    id: "starter",
    code: "MULAIRAPI",
    description: "Diskon untuk mahasiswa yang baru ingin merapikan workflow skripsinya di Skripzy.",
    type: "percent",
    discountPercent: 20,
    validUntil: "2026-12-31",
    usageLimit: 500,
    usedCount: 0,
    isActive: true,
    audience: "Cocok untuk pengguna baru",
    terms: [
      "Berlaku untuk pembelian Pro Plan pertama.",
      "Tidak bisa digabung dengan kode promo lain.",
      "Promo dapat berakhir lebih cepat jika kuota habis.",
    ],
  },
  {
    id: "revision",
    code: "REVISIAMAN",
    description: "Potongan khusus untuk fase revisi, bimbingan intensif, dan persiapan sidang.",
    type: "fixed",
    discountAmount: 15000,
    validUntil: "2026-10-31",
    usageLimit: 300,
    usedCount: 0,
    isActive: true,
    audience: "Untuk pengguna Pro dan Plus",
    terms: [
      "Berlaku untuk paket Pro atau Plus bulanan.",
      "Kode hanya bisa digunakan satu kali per akun.",
      "Tidak berlaku untuk top-up kredit terpisah.",
    ],
  },
  {
    id: "reference",
    code: "REFERENSI",
    description: "Promo ringan untuk kamu yang sedang mengumpulkan jurnal, catatan, dan bahan Bab 2.",
    type: "percent",
    discountPercent: 15,
    validUntil: "2026-09-30",
    usageLimit: 250,
    usedCount: 0,
    isActive: true,
    audience: "Untuk workflow referensi",
    terms: [
      "Berlaku selama masa kampanye aktif.",
      "Kuota penggunaan mengikuti ketersediaan promo.",
      "Skripzy berhak meninjau penggunaan yang tidak wajar.",
    ],
  },
];

export default function PromoPage() {
  const [remotePromos, setRemotePromos] = useState([]);
  const [expanded, setExpanded] = useState("starter");

  useEffect(() => {
    let mounted = true;

    fetch("https://apikey.skripzy-app.workers.dev/api/d1/promos")
      .then(res => res.json())
      .then(json => {
        if (!mounted) return;
        if (json && json.data) {
          const items = json.data.map(d => ({
            ...d,
            discountPercent: d.type === "percent" ? d.discountValue : undefined,
            discountAmount: d.type === "fixed" ? d.discountValue : undefined,
            isActive: Boolean(d.isActive),
            createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
            validUntil: d.validUntil ? new Date(d.validUntil) : null
          }));
          const active = items.filter(p => isPromoActive(p) && p.showOnLanding === 1).slice(0, 3);
          setRemotePromos(active);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch promos:", err);
        if (mounted) setRemotePromos([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const promos = useMemo(() => {
    if (!remotePromos.length) return fallbackPromos;
    return remotePromos.map((promo, index) => ({
      ...fallbackPromos[index % fallbackPromos.length],
      ...promo,
      terms: promo.terms || fallbackPromos[index % fallbackPromos.length].terms,
      audience: promo.audience || (promo.applicableTo === "plan" ? "Khusus Langganan" : promo.applicableTo === "topup" ? "Khusus Top Up" : "Semua Layanan"),
      description: promo.description || fallbackPromos[index % fallbackPromos.length].description,
    }));
  }, [remotePromos]);

  return (
    <LandingLayout>
      <section className="landing-section" style={{ paddingTop: "clamp(5.7rem, 9vw, 8.5rem)" }}>
        <div className="container">
          <div className="landing-two-col">
            <div>
              <span className="landing-kicker">
                <PremiumIcon name="gift" size={14} />
                Promo Skripzy
              </span>
              <h1 className="landing-heading" style={{ fontSize: "clamp(2.45rem, 5vw, 4.5rem)", marginTop: "1rem", marginBottom: "1.25rem" }}>
                Mulai workspace riset dengan biaya yang lebih ringan.
              </h1>
              <p className="landing-copy" style={{ fontSize: "1.1rem", maxWidth: "60ch", marginBottom: "1.5rem" }}>
                Promo ini dibuat untuk bantu kamu mulai dulu. Pakai untuk merapikan ide, lanjut revisi, atau menyiapkan bahan bimbingan tanpa harus menunggu semuanya sempurna.
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <Link href="https://app.skripzy.id/register" className="btn btn-primary" style={{ borderRadius: 999, padding: "0.92rem 1.4rem", fontWeight: 850 }}>
                  Coba Pakai Promo
                </Link>
                <Link href="/pricing" className="btn btn-outline" style={{ borderRadius: 999, padding: "0.92rem 1.4rem", fontWeight: 850, background: "rgba(var(--surface-rgb), 0.56)" }}>
                  Lihat Paket
                </Link>
              </div>
            </div>

            <div className="landing-visual" style={{ minHeight: 420, padding: "1.25rem", display: "grid", placeItems: "center" }}>
              <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 430 }}>
                <div className="landing-card" style={{ padding: "1.25rem", background: "rgba(var(--surface-rgb), 0.82)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <Image src="/logo-skripzy.webp" alt="Skripzy promo" width={44} height={44} style={{ borderRadius: 8 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase" }}>Research Workspace</p>
                        <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-main)", fontWeight: 900 }}>Skripzy Promo Pass</h3>
                      </div>
                    </div>
                    <PremiumIcon name="ticket" size={28} className="text-primary" />
                  </div>
                  <div style={{ padding: "1.25rem", borderRadius: 8, background: "rgba(var(--primary-rgb), 0.1)", border: "1px dashed rgba(var(--primary-rgb), 0.28)" }}>
                    <p style={{ margin: 0, color: "var(--text-muted)", fontWeight: 700 }}>Kode pilihan bulan ini</p>
                    <p style={{ margin: "0.2rem 0 0", color: "var(--primary)", fontSize: "2rem", fontWeight: 950, letterSpacing: "0.02em" }}>
                      {promos[0]?.code || "PROMO"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 3rem" }}>
            <span className="landing-kicker">Kode aktif</span>
            <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.1rem)", marginTop: "1rem", textAlign: "center" }}>
              Pilih promo yang paling pas dengan fasemu sekarang.
            </h2>
          </div>

          <div className="landing-auto-grid">
            {promos.map((promo) => (
              <PromoCard
                key={promo.id || promo.code}
                promo={promo}
                expanded={expanded === (promo.id || promo.code)}
                onToggle={() => setExpanded((current) => current === (promo.id || promo.code) ? "" : (promo.id || promo.code))}
              />
            ))}
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function PromoCard({ promo, expanded, onToggle }) {
  return (
    <div className="landing-card" style={{ padding: "1.35rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <span className="landing-pill" style={{ padding: "0.4rem 0.7rem", fontSize: "0.75rem" }}>
            {promo.audience || "Promo aktif"}
          </span>
          <h3 style={{ margin: "1rem 0 0.35rem", color: "var(--primary)", fontSize: "1.65rem", fontWeight: 950, letterSpacing: "0.02em" }}>{promo.code}</h3>
          <p className="landing-copy" style={{ margin: 0, fontSize: "0.96rem" }}>{promo.description}</p>
        </div>
        <div className="landing-icon-box">
          <PremiumIcon name="ticket" size={22} />
        </div>
      </div>

      <div className="landing-muted-panel" style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <SmallInfo label="Diskon" value={formatDiscount(promo)} />
        <SmallInfo label="Masa berlaku" value={formatDate(promo.validUntil)} />
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="btn btn-outline"
        style={{ width: "100%", borderRadius: 999, padding: "0.75rem", fontWeight: 850, justifyContent: "space-between" }}
      >
        <span>{expanded ? "Tutup syarat" : "Lihat syarat"}</span>
        <PremiumIcon name="chevronDown" size={18} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(var(--primary-rgb), 0.1)", paddingTop: "1rem" }}>
          <p style={{ margin: "0 0 0.7rem", color: "var(--text-main)", fontWeight: 850 }}>Syarat dan ketentuan</p>
          <div className="landing-stack" style={{ gap: "0.55rem" }}>
            {(promo.terms || []).map((term) => (
              <div key={term} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                <PremiumIcon name="check" size={15} className="text-primary" style={{ marginTop: 3 }} />
                <span style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.5, fontWeight: 600 }}>{term}</span>
              </div>
            ))}
          </div>
          <p className="landing-copy" style={{ margin: "0.9rem 0 0", fontSize: "0.88rem" }}>
            Berlaku sampai {formatDate(promo.validUntil)} atau sampai kuota penggunaan habis.
          </p>
        </div>
      )}
    </div>
  );
}

function SmallInfo({ label, value }) {
  return (
    <div>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: "0.25rem 0 0", color: "var(--text-main)", fontWeight: 900, lineHeight: 1.2 }}>{value}</p>
    </div>
  );
}

function formatDiscount(promo) {
  if (promo.type === "fixed") {
    return `Rp ${(promo.discountAmount || 0).toLocaleString("id-ID")}`;
  }

  return `${promo.discountPercent || 0}%`;
}

function formatDate(value) {
  if (!value) return "Selama promo aktif";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Selama promo aktif";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
