"use client";

import LandingLayout from "@/components/layout/LandingLayout";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import Image from "next/image";

const painPoints = [
  {
    icon: "alertCircle",
    title: "Cemas duluan sebelum mulai",
    desc: "Bukan karena tidak mampu. Seringnya karena topik, metode, dan ekspektasi pembimbing terasa menumpuk jadi satu.",
  },
  {
    icon: "layers",
    title: "Ide ada, susunannya belum ketemu",
    desc: "Catatan tersebar di chat, file, PDF, dan kepala sendiri. Akhirnya draf terasa jalan di tempat.",
  },
  {
    icon: "messageCircleMore",
    title: "Kurang yakin dengan argumen",
    desc: "Sudah menulis beberapa halaman, tapi masih ragu apakah alurnya nyambung, cukup akademik, dan siap dibahas.",
  },
];

const workspaceFlow = [
  "Rapikan ide awal",
  "Bangun kerangka",
  "Kelola referensi",
  "Tulis dan revisi",
  "Siap bimbingan",
];

const differences = [
  {
    title: "AI biasa menunggu prompt. Skripzy memberi konteks kerja.",
    desc: "Kamu tidak perlu mengulang cerita dari nol. Ide, referensi, catatan, dan draf dibaca sebagai bagian dari alur riset.",
  },
  {
    title: "AI biasa memberi jawaban. Skripzy membantu menyusun proses.",
    desc: "Fokusnya bukan membuat tulisan instan, tapi membantu kamu mengambil langkah berikutnya dengan lebih tenang.",
  },
  {
    title: "AI biasa terasa lepas. Skripzy tinggal di workspace.",
    desc: "Catatan, sumber, revisi, dan draft tetap berada di satu tempat sehingga progres tidak mudah tercecer.",
  },
];

const helpReasons = [
  {
    icon: "bookMarked",
    title: "Referensi tidak cuma disimpan",
    desc: "Sumber bacaan bisa diringkas, diberi catatan, dan dihubungkan ke bagian tulisan yang sedang kamu kerjakan.",
  },
  {
    icon: "brainCircuit",
    title: "AI dipakai untuk berpikir bareng",
    desc: "Minta bantuan untuk memecah ide, mengecek alur, mencari celah argumen, atau menyiapkan pertanyaan bimbingan.",
  },
  {
    icon: "checkCircle",
    title: "Revisi jadi lebih kelihatan",
    desc: "Masukan pembimbing bisa diubah menjadi daftar kerja yang jelas, bukan sekadar catatan panjang yang bikin bingung.",
  },
];

export default function Home() {
  return (
    <LandingLayout>
      <section className="viewport-fit" style={{ padding: "6rem 0 3rem" }}>
        <div className="container">
          <div className="landing-two-col">
            <div>
              <div className="animate-slide-in-down" style={{ marginBottom: "1.25rem" }}>
                <span className="landing-kicker">
                  <PremiumIcon name="sparkles" size={14} />
                  Workspace riset akademik
                </span>
              </div>

              <h1
                className="landing-heading animate-fade-in"
                style={{
                  fontSize: "clamp(2.25rem, 5.4vw, 4.8rem)",
                  maxWidth: "12ch",
                  marginBottom: "1.15rem",
                }}
              >
                Mulai Penelitian lebih mudah dan cerdas.
              </h1>

              <p
                className="landing-copy"
                style={{
                  fontSize: "clamp(1.05rem, 1.6vw, 1.22rem)",
                  maxWidth: "58ch",
                  marginBottom: "1.45rem",
                  fontWeight: 500,
                }}
              >
                Skripzy menyatukan ide, referensi, catatan, draf, dan bantuan AI dalam satu workspace. Bukan untuk menggantikan proses berpikir, tapi membuat proses riset terasa lebih jelas dari hari ke hari.
              </p>

              <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.35rem" }}>
                <a href="https://app.skripzy.id/register" className="btn btn-primary" style={{ padding: "0.95rem 1.5rem", borderRadius: "999px", fontWeight: 800, fontSize: "1rem" }}>
                  Mulai Gratis <PremiumIcon name="arrowRight" size={18} />
                </a>
                <Link href="/features" className="btn btn-outline" style={{ padding: "0.95rem 1.5rem", borderRadius: "999px", fontWeight: 800, fontSize: "1rem", background: "rgba(var(--surface-rgb), 0.56)" }}>
                  Lihat Workspace
                </Link>
              </div>

              <div className="landing-pill-row">
                <span className="landing-pill"><PremiumIcon name="checkCircle" size={16} /> AI yang sadar konteks</span>
                <span className="landing-pill"><PremiumIcon name="bookMarked" size={16} /> Referensi terhubung</span>
                <span className="landing-pill"><PremiumIcon name="messageSquare" size={16} /> Siap bimbingan</span>
              </div>
            </div>

            <DashboardShotStack />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <SectionHeader
            kicker="Yang sering terjadi"
            title="Hambatan skripsi biasanya bukan cuma soal menulis."
            desc="Banyak mahasiswa tahu mereka harus mulai, tapi belum punya ruang kerja yang membantu merapikan pikiran. Di sinilah Skripzy mengambil peran."
          />

          <div className="landing-auto-grid">
            {painPoints.map((item) => (
              <InfoCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="landing-two-col">
            <div>
              <span className="landing-kicker">Alur kerja</span>
              <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)", marginTop: "1rem", marginBottom: "1rem" }}>
                Dari ide mentah sampai bahan bimbingan.
              </h2>
              <p className="landing-copy" style={{ fontSize: "1.08rem", marginBottom: "2rem" }}>
                Skripzy membantu kamu memecah pekerjaan besar menjadi langkah yang lebih kecil. Hari ini cukup rapikan ide, besok lanjut referensi, lalu pelan-pelan masuk ke draf.
              </p>
              <a href="https://app.skripzy.id/register" className="btn btn-primary" style={{ borderRadius: "999px", padding: "0.9rem 1.35rem", fontWeight: 800 }}>
                Buat Workspace Pertama
              </a>
            </div>

            <div className="landing-stack">
              {workspaceFlow.map((step, index) => (
                <div key={step} className="landing-card" style={{ padding: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                  <div className="landing-icon-box" style={{ fontWeight: 900 }}>{index + 1}</div>
                  <div>
                    <h3 style={{ margin: "0 0 0.2rem", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)" }}>{step}</h3>
                    <p className="landing-copy" style={{ margin: 0, fontSize: "0.94rem" }}>
                      {getFlowCopy(index)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <SectionHeader
            kicker="Bukan chatbot biasa"
            title="Apa bedanya Skripzy dengan AI biasa?"
            desc="AI tetap jadi alat bantu. Bedanya, Skripzy menaruh alat bantu itu di dalam workspace riset yang rapi."
          />
          <div className="landing-auto-grid">
            {differences.map((item) => (
              <div key={item.title} className="landing-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.2rem", lineHeight: 1.35, fontWeight: 850, color: "var(--text-main)", marginBottom: "0.75rem" }}>
                  {item.title}
                </h3>
                <p className="landing-copy" style={{ margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <SectionHeader
            kicker="Kenapa membantu"
            title="Karena riset butuh ruang yang membuatmu tetap jalan."
            desc="Skripzy tidak menjanjikan skripsi selesai semalam. Yang dibantu adalah ritme kerja: lebih terarah, lebih mudah dilanjutkan, dan lebih siap dibicarakan dengan pembimbing."
          />

          <div className="landing-auto-grid">
            {helpReasons.map((item) => (
              <InfoCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="container">
          <div className="landing-card landing-cta-card" style={{ padding: "clamp(1.5rem, 4vw, 3rem)", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "1.5rem", alignItems: "center" }}>
            <div>
              <span className="landing-kicker">Mulai pelan-pelan juga boleh</span>
              <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", marginTop: "1rem", marginBottom: "1rem" }}>
                Buka workspace, tulis satu ide, lanjutkan dari situ.
              </h2>
              <p className="landing-copy" style={{ maxWidth: "62ch", margin: 0 }}>
                Tidak perlu menunggu semuanya siap. Skripzy dibuat untuk menemani proses yang berantakan di awal, lalu membantu merapikannya sedikit demi sedikit.
              </p>
            </div>
            <a href="https://app.skripzy.id/register" className="btn btn-primary" style={{ borderRadius: "999px", padding: "1rem 1.5rem", fontWeight: 800, whiteSpace: "nowrap" }}>
              Coba Gratis
            </a>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

function DashboardShotStack() {
  return (
    <div className="landing-visual animate-slide-in-up" style={{ padding: "1rem" }}>
      <div className="dashboard-shot-stack">
        <div className="dashboard-shot dashboard-shot-main" style={{ zIndex: 1 }}>
          <Image 
            src="/workspace-view.webp" 
            alt="Skripzy Workspace" 
            fill 
            className="object-cover"
            priority
          />
        </div>

        <div className="dashboard-shot dashboard-shot-side" style={{ zIndex: 3 }}>
          <Image 
            src="/mobile-view.webp" 
            alt="Skripzy Mobile View" 
            fill 
            className="object-cover"
          />
        </div>

        <div className="dashboard-shot dashboard-shot-mini" style={{ zIndex: 2 }}>
          <Image 
            src="/dashboard-view.webp" 
            alt="Skripzy Dashboard" 
            fill 
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ kicker, title, desc }) {
  return (
    <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 3rem" }}>
      <span className="landing-kicker">{kicker}</span>
      <h2 className="landing-heading" style={{ fontSize: "clamp(2rem, 4vw, 3.35rem)", marginTop: "1rem", marginBottom: "1rem", textAlign: "center" }}>
        {title}
      </h2>
      <p className="landing-copy" style={{ fontSize: "1.05rem", margin: 0, textAlign: "center" }}>{desc}</p>
    </div>
  );
}

function InfoCard({ icon, title, desc }) {
  return (
    <div className="landing-card" style={{ padding: "1.5rem" }}>
      <div className="landing-icon-box" style={{ marginBottom: "1rem" }}>
        <PremiumIcon name={icon} size={22} />
      </div>
      <h3 style={{ fontSize: "1.18rem", fontWeight: 850, marginBottom: "0.65rem", color: "var(--text-main)", lineHeight: 1.35 }}>
        {title}
      </h3>
      <p className="landing-copy" style={{ margin: 0, fontSize: "0.96rem" }}>{desc}</p>
    </div>
  );
}

function getFlowCopy(index) {
  const copy = [
    "Tulis topik, keresahan, atau pertanyaan awal tanpa harus langsung sempurna.",
    "Ubah ide menjadi bagian yang lebih jelas: masalah, tujuan, metode, dan batasan.",
    "Simpan sumber bacaan, ringkasan, dan catatan penting di tempat yang sama.",
    "Gunakan AI untuk mengecek alur, memperhalus kalimat, dan menyiapkan revisi.",
    "Bawa draf, poin diskusi, dan daftar pertanyaan yang lebih siap saat bertemu pembimbing.",
  ];

  return copy[index];
}
