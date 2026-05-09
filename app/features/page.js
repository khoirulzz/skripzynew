"use client";

import LandingLayout from "@/components/layout/LandingLayout";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const features = [
  {
    title: "Workspace Skripsi",
    desc: "Tempat utama untuk menyimpan topik, kerangka, draf, revisi, dan catatan bimbingan.",
    icon: "layoutTemplate",
    details: ["Struktur Bab 1 sampai Bab 5", "Catatan progres yang mudah dibaca", "Bahan bimbingan tidak tercecer"],
  },
  {
    title: "Reference Hub",
    desc: "Kumpulkan jurnal dan bacaan penting, lalu ubah menjadi ringkasan yang siap dipakai untuk berpikir.",
    icon: "bookMarked",
    details: ["Ringkasan sumber bacaan", "Catatan teori dan temuan", "Bantu menyiapkan dasar Bab 2"],
  },
  {
    title: "Asisten AI Kontekstual",
    desc: "Bantu pecah ide, cek alur argumen, dan rapikan kalimat dengan konteks riset yang sedang kamu kerjakan.",
    icon: "sparkles",
    details: ["Saran struktur tulisan", "Cek logika antar paragraf", "Prompt tidak mulai dari nol terus"],
  },
  {
    title: "Simulasi Sidang",
    desc: "Latihan menjawab pertanyaan penguji dengan bahan yang dekat dengan draf dan topikmu.",
    icon: "messageSquare",
    details: ["Pertanyaan latihan", "Feedback jawaban", "Bantu lebih siap menjelaskan riset"],
  },
  {
    title: "Manajemen Revisi",
    desc: "Masukan pembimbing bisa diubah menjadi daftar tugas yang jelas dan lebih mudah dituntaskan.",
    icon: "checkCircle",
    details: ["Checklist revisi", "Catatan perubahan", "Prioritas kerja berikutnya"],
  },
  {
    title: "Tools Penulisan",
    desc: "Parafrase, cek grammar, humanizer, dan AI detector untuk membantu tahap polishing dengan tetap etis.",
    icon: "wand",
    details: ["Parafrase tetap menjaga makna", "Cek bahasa lebih cepat", "Bantu review sebelum submit"],
  },
];

const scenarios = [
  {
    title: "Saat baru mulai",
    desc: "Tuliskan keresahan awal, lalu minta Skripzy bantu memecahnya menjadi kemungkinan topik, variabel, atau fokus penelitian.",
  },
  {
    title: "Saat referensi mulai banyak",
    desc: "Simpan bacaan penting, ringkas poin utama, lalu hubungkan dengan bagian teori yang sedang kamu susun.",
  },
  {
    title: "Saat revisi menumpuk",
    desc: "Ubah komentar pembimbing menjadi daftar kerja yang lebih pendek, jelas, dan bisa dicentang satu per satu.",
  },
];

export default function FeaturesPage() {
  return (
    <LandingLayout>
      <section className="landing-section" style={{ paddingTop: "clamp(5.7rem, 9vw, 8.5rem)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 820, margin: "0 auto 4rem" }}>
            <span className="landing-kicker">Fitur Skripzy</span>
            <h1 className="landing-heading" style={{ fontSize: "clamp(2.45rem, 5vw, 4.35rem)", marginTop: "1rem", marginBottom: "1.2rem", textAlign: "center" }}>
              Semua alat risetmu tinggal di satu workspace.
            </h1>
            <p className="landing-copy" style={{ fontSize: "1.12rem", textAlign: "center", margin: 0 }}>
              Skripzy bukan kumpulan tombol AI yang terpisah-pisah. Setiap fitur dibuat untuk membantu alur riset yang nyata: mulai dari ide, referensi, draf, revisi, sampai persiapan sidang.
            </p>
          </div>

          <div className="landing-auto-grid">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <div className="landing-two-col">
            <div>
              <span className="landing-kicker">Cara pakainya</span>
              <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", marginTop: "1rem", marginBottom: "1rem" }}>
                Dipakai sesuai fase risetmu, bukan harus sekaligus.
              </h2>
              <p className="landing-copy" style={{ fontSize: "1.06rem", marginBottom: "1.5rem" }}>
                Hari ini kamu mungkin cuma butuh merapikan topik. Minggu depan baru masuk referensi. Menjelang bimbingan, baru fokus ke revisi dan simulasi pertanyaan. Skripzy ikut ritme itu.
              </p>
              <Link href="/register" className="btn btn-primary" style={{ borderRadius: 999, padding: "0.9rem 1.35rem", fontWeight: 850 }}>
                Mulai dari Workspace
              </Link>
            </div>

            <div className="landing-stack">
              {scenarios.map((scenario, index) => (
                <div key={scenario.title} className="landing-card" style={{ padding: "1.25rem", display: "flex", gap: "1rem" }}>
                  <div className="landing-icon-box" style={{ fontWeight: 900 }}>{index + 1}</div>
                  <div>
                    <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.12rem", fontWeight: 850, color: "var(--text-main)" }}>{scenario.title}</h3>
                    <p className="landing-copy" style={{ margin: 0, fontSize: "0.96rem" }}>{scenario.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="landing-card landing-cta-card" style={{ padding: "clamp(1.5rem, 4vw, 3rem)", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "1.5rem", alignItems: "center" }}>
            <div>
              <span className="landing-kicker">Etis dan tetap akademik</span>
              <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.1rem)", marginTop: "1rem", marginBottom: "1rem" }}>
                AI membantu proses, bukan mengambil alih penelitianmu.
              </h2>
              <p className="landing-copy" style={{ maxWidth: "68ch", margin: 0 }}>
                Gunakan Skripzy untuk bertanya, membandingkan ide, merapikan bahasa, dan mengecek alur. Tetap cantumkan sumber, pahami argumenmu, dan ikuti aturan kampus.
              </p>
            </div>
            <Link href="/academic-integrity" className="btn btn-outline" style={{ borderRadius: 999, padding: "0.9rem 1.35rem", fontWeight: 850, whiteSpace: "nowrap" }}>
              Baca Prinsip Etis
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function FeatureCard({ feature }) {
  return (
    <div className="landing-card" style={{ padding: "1.45rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="landing-icon-box">
        <PremiumIcon name={feature.icon} size={22} />
      </div>
      <div>
        <h3 style={{ fontSize: "1.24rem", fontWeight: 900, marginBottom: "0.65rem", color: "var(--text-main)", lineHeight: 1.3 }}>{feature.title}</h3>
        <p className="landing-copy" style={{ margin: 0, fontSize: "0.96rem" }}>{feature.desc}</p>
      </div>
      <div style={{ borderTop: "1px solid rgba(var(--primary-rgb), 0.1)", paddingTop: "1rem", marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {feature.details.map((detail) => (
          <div key={detail} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
            <PremiumIcon name="check" size={15} className="text-primary" style={{ marginTop: 3 }} />
            <span style={{ color: "var(--text-muted)", fontWeight: 650, fontSize: "0.9rem", lineHeight: 1.45 }}>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
