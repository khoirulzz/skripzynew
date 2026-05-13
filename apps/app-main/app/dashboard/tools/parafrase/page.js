"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGeminiStream } from "@/lib/callWorker";
import { deductCredits, refundCredits, getCharLimit } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

// ── Konstanta ────────────────────────────────────────────────
const CREDIT_COST = 2;
const API_GROUP = "group_1"; // Grup yg dipakai parafrase

const GAYA_LIST = [
  {
    id: "akademik",
    label: "Akademik",
    desc: "Terminologi ilmiah, kalimat struktural — cocok untuk skripsi & jurnal ilmiah.",
    system: "Kamu adalah asisten penulisan akademik. Tulis ulang teks berikut dengan gaya akademik formal: gunakan terminologi ilmiah yang tepat, kalimat kompleks namun terstruktur rapi, hindari ekspresi sehari-hari, pertahankan objektivitas dan nada ilmiah. Keluarkan HANYA hasil parafrasenya saja, tanpa penjelasan tambahan.",
  },
  {
    id: "formal",
    label: "Formal",
    desc: "Bahasa baku & sopan — ideal untuk laporan resmi atau korespondensi profesional.",
    system: "Kamu adalah asisten penulisan profesional. Tulis ulang teks berikut dengan gaya formal: gunakan bahasa baku yang sopan dan profesional, hindari slang, namun lebih mudah dipahami dari gaya akademik. Cocok untuk laporan atau surat resmi. Keluarkan HANYA hasil parafrasenya saja.",
  },
  {
    id: "disederhanakan",
    label: "Sederhanakan",
    desc: "Kalimat pendek & lugas — mudah dipahami semua kalangan, tanpa jargon teknis.",
    system: "Kamu adalah asisten komunikasi publik. Tulis ulang teks berikut dengan gaya disederhanakan: gunakan kalimat pendek dan lugas, pilih kata yang mudah dipahami semua orang, hindari jargon teknis, sampaikan inti pesan secara langsung. Keluarkan HANYA hasil parafrasenya saja.",
  },
  {
    id: "kreatif",
    label: "Kreatif",
    desc: "Diksi kaya & ekspresif — metafora, variasi kalimat, artistik namun bermakna.",
    system: "Kamu adalah penulis kreatif. Tulis ulang teks berikut dengan gaya kreatif: eksplorasi variasi diksi yang kaya dan segar, gunakan metafora atau analogi yang menarik, buat kalimat mengalir secara artistik namun tetap menyampaikan makna yang sama. Keluarkan HANYA hasil parafrasenya saja.",
  },
  {
    id: "umum",
    label: "Umum",
    desc: "Natural & santai — seperti menjelaskan ke teman, informatif tanpa terlalu kaku.",
    system: "Kamu adalah komunikator yang ramah. Tulis ulang teks berikut dengan gaya umum dan natural: gunakan bahasa sehari-hari yang santai namun tetap informatif, seolah-olah seseorang sedang bercerita kepada teman. Keluarkan HANYA hasil parafrasenya saja.",
  },
];

const CREATIVITY_LEVELS = [
  { value: 1, label: "Sangat Strict",  temp: 0.2, hint: "Minimal perubahan, setia pada struktur asli" },
  { value: 2, label: "Strict",         temp: 0.5, hint: "Sedikit variasi, sinonim aman" },
  { value: 3, label: "Seimbang",       temp: 0.7, hint: "Variasi alami, rekomendasi untuk sebagian besar teks" },
  { value: 4, label: "Kreatif",        temp: 1.1, hint: "Banyak variasi diksi dan struktur kalimat" },
  { value: 5, label: "Sangat Kreatif", temp: 1.6, hint: "Paling bebas, jika gaya Kreatif dipilih" },
];

// ── Helpers ──────────────────────────────────────────────────
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

// ── Sub-components ───────────────────────────────────────────
function GayaCard({ gaya, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: "left", padding: "0.75rem 1rem",
        border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)", cursor: disabled ? "not-allowed" : "pointer",
        backgroundColor: active ? "var(--primary-light)" : "transparent",
        transition: "all 0.15s", fontFamily: "inherit", width: "100%", opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: active ? "var(--primary)" : "var(--text-main)", marginBottom: "0.2rem" }}>
        {gaya.label}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{gaya.desc}</div>
    </button>
  );
}

function CreativitySlider({ value, onChange, disabled }) {
  const current = CREATIVITY_LEVELS.find(l => l.value === value) || CREATIVITY_LEVELS[2];
  const pct = ((value - 1) / 4) * 100;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Tingkat Kreativitas</span>
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px",
          backgroundColor: `hsl(${260 - pct * 1.5}, 70%, 93%)`,
          color: `hsl(${260 - pct * 1.5}, 65%, 40%)`,
          borderRadius: "10px",
        }}>
          {current.label}
        </span>
      </div>
      <input
        type="range" min={1} max={5} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{ width: "100%", accentColor: "var(--primary)", cursor: disabled ? "not-allowed" : "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
        <span>Strict</span>
        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>{current.hint}</span>
        <span>Bebas</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ParafrasePage() {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const plan = userData?.plan || "free";
  const charLimit = getCharLimit(plan);

  const [input, setInput]             = useState("");
  const [output, setOutput]           = useState("");
  const [gaYa, setGaYa]               = useState("akademik");
  const [creativity, setCreativity]   = useState(3);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [copied, setCopied]           = useState(false);
  const [expandedGaya, setExpandedGaya] = useState(false);
  const [expandedCreativity, setExpandedCreativity] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const selectedGaya  = GAYA_LIST.find(g => g.id === gaYa);
  const selectedLevel = CREATIVITY_LEVELS.find(l => l.value === creativity);
  const creditCost    = toolMap["parafrase"]?.creditCost ?? CREDIT_COST;
  const credits       = userData?.credits ?? 0;
  const canAfford     = credits >= creditCost;

  const handleParafrase = async () => {
    if (!user || !input.trim()) return;
    if (!canAfford) { setError(`Kredit tidak cukup. Butuh ${creditCost} credit.`); return; }
    if (input.length > charLimit) { setError(`Teks melebihi batas ${charLimit} karakter untuk plan Anda.`); return; }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      await deductCredits(user.uid, creditCost);

      await callGeminiStream({
        prompt: input,
        systemInstruction: selectedGaya.system,
        group: API_GROUP,
        temperature: selectedLevel.temp,
        onStream: (chunk) => {
          setOutput(chunk);
        }
      });
      // The state output is progressively updated via onStream
    } catch (err) {
      await refundCredits(user.uid, creditCost).catch(() => {});
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    copyToClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: isMobile ? "2rem" : 0 }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)" }} title="Kembali">
            <PremiumIcon name="arrowLeft" size={isMobile ? 18 : 20} />
          </Link>
          <div>
            <h1 style={{ fontSize: isMobile ? "1rem" : "1.5rem", margin: 0, fontWeight: 700 }}>Parafrase AI</h1>
            <p style={{ margin: "0.1rem 0 0 0", fontSize: isMobile ? "0.65rem" : "0.75rem", color: "var(--text-muted)" }}>Tulis ulang teks dengan gaya sesuai pilihan Anda</p>
          </div>
        </div>
        <div style={{ 
          marginLeft: isMobile ? 0 : "auto", 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          padding: "0.4rem 0.85rem", 
          backgroundColor: "var(--surface-hover)", 
          borderRadius: "var(--radius-lg)", 
          fontSize: "0.75rem", 
          fontWeight: 600, 
          whiteSpace: "nowrap" 
        }}>
          <PremiumIcon name="zap" size={14} className="text-primary" />
          <span>{creditCost} credit</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-md)", fontSize: "0.87rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <PremiumIcon name="alertCircle" size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: isMobile ? "1rem" : "1.75rem", alignItems: "start" }}>

        {/* ── Left: Input + Output ───────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Input textarea */}
          <div className="glass-panel" style={{ padding: isMobile ? "1rem" : "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Teks untuk Diparafrase</label>
              <span style={{ fontSize: isMobile ? "0.65rem" : "0.72rem", color: input.length > charLimit ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
                {input.length.toLocaleString('id-ID')} / {charLimit.toLocaleString('id-ID')}
              </span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tempel atau ketik teks yang ingin Anda parafrase di sini..."
              className="form-textarea"
              style={{ minHeight: isMobile ? "40vh" : "240px", resize: "vertical", fontFamily: "'Outfit', sans-serif", lineHeight: 1.6, fontSize: isMobile ? "0.8rem" : "0.95rem", border: isMobile ? "none" : "1px solid var(--border)", padding: isMobile ? "0.5rem 0" : "0.75rem 1rem", backgroundColor: isMobile ? "transparent" : "var(--background)" }}
              maxLength={charLimit}
            />
            {plan === "free" && (
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.75rem", marginBottom: 0 }}>
                📌 Plan Free: maksimal {charLimit.toLocaleString('id-ID')} karakter.
                <Link href="/dashboard/langganan" className="text-primary" style={{ marginLeft: "0.5rem", fontWeight: 600 }}>Upgrade →</Link>
              </p>
            )}
          </div>

          {/* Output */}
          {(loading || output) && (
            <div className="glass-panel" style={{ padding: isMobile ? "1rem" : "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <label style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                  Hasil Parafrase
                  {!loading && output && (
                    <span style={{ marginLeft: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      {output.split(/\s+/).filter(Boolean).length} kata
                    </span>
                  )}
                </label>
                {!loading && output && (
                  <button className="btn btn-outline" onClick={handleCopy} style={{ fontSize: "0.75rem", padding: "0.4rem 0.85rem", gap: "0.4rem" }}>
                    <PremiumIcon name={copied ? "check" : "copy"} size={14} />
                    <span>{copied ? "Tersalin!" : "Salin"}</span>
                  </button>
                )}
              </div>

              {loading && !output ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {[100, 85, 70, 90, 75].map((w, i) => (
                    <div key={i} className="animate-pulse" style={{ height: "14px", width: `${w}%`, backgroundColor: "var(--surface-hover)", borderRadius: "4px" }} />
                  ))}
                </div>
              ) : (
                <div style={{ backgroundColor: isMobile ? "var(--surface-hover)" : "var(--background)", padding: isMobile ? "0.75rem" : "1rem", borderRadius: "8px", minHeight: isMobile ? "auto" : "180px" }}>
                  <div className="markdown-body" style={{ fontSize: isMobile ? "0.8rem" : "0.95rem", lineHeight: 1.6 }}>
                    <ReactMarkdown>{output}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Controls ──────────────────── */}
        {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "0.75rem" : "1.5rem" }}>

          {/* Gaya Parafrase */}
          <div className={isMobile ? "native-card" : "glass-panel p-5"} style={{ margin: isMobile ? "0 -0.75rem" : 0 }}>
            <button 
              onClick={() => setExpandedGaya(!expandedGaya)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-main)",
                marginBottom: "0.85rem"
              }}
            >
              <span>✍️ Gaya Parafrase</span>
              <PremiumIcon name="chevronDown" size={18} style={{ transform: expandedGaya ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
            </button>
            
            {expandedGaya && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {GAYA_LIST.map(g => (
                  <GayaCard
                    key={g.id}
                    gaya={g}
                    active={gaYa === g.id}
                    disabled={loading}
                    onClick={() => setGaYa(g.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Creativity Slider */}
          <div className={isMobile ? "native-card" : "glass-panel p-5"} style={{ margin: isMobile ? "0 -0.75rem" : 0 }}>
            <button 
              onClick={() => setExpandedCreativity(!expandedCreativity)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.5rem 0",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-main)",
                marginBottom: expandedCreativity ? "0.85rem" : 0
              }}
            >
              <span>⚡ Tingkat Kreativitas</span>
              <PremiumIcon name="chevronDown" size={18} style={{ transform: expandedCreativity ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
            </button>
            
            {expandedCreativity && (
              <CreativitySlider value={creativity} onChange={setCreativity} disabled={loading} />
            )}
          </div>

          {/* Credit status + CTA */}
          <div className={isMobile ? "native-card" : "glass-panel p-5"} style={{ margin: isMobile ? "0 -0.75rem" : 0, borderBottom: isMobile ? "none" : "1px solid var(--border)" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
                <span className="text-muted">Kredit Anda</span>
                <span style={{ fontWeight: 700, color: canAfford ? "var(--success)" : "var(--danger)", fontSize: "0.9rem" }}>
                  {credits.toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span className="text-muted">Biaya Parafrase</span>
                <span style={{ fontWeight: 600, color: "var(--primary)" }}>−{creditCost}</span>
              </div>
            </div>
            
            <button
              className="btn btn-primary w-full"
              style={{ padding: "0.85rem", fontSize: "0.95rem", fontWeight: 600 }}
              onClick={handleParafrase}
              disabled={loading || !canAfford || !input.trim()}
            >
              {loading ? (
                <><PremiumIcon name="zap" size={16} className="animate-pulse" /> Memproses...</>
              ) : (
                <><PremiumIcon name="wand" size={16} /> Parafrase Sekarang</>
              )}
            </button>
            
            {!canAfford && (
              <Link href="/dashboard/langganan" className="btn btn-outline w-full text-center" style={{ padding: "0.65rem", fontSize: "0.8rem", fontWeight: 500 }}>
                💰 Top Up Credit
              </Link>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ── Mobile Bottom Sheet (Settings) ──────── */}
      {isMobile && showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", justifyContent: "flex-end", backdropFilter: "blur(4px)" }} onClick={() => setShowSettings(false)}>
          <div style={{ backgroundColor: "var(--background)", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "1.5rem", paddingBottom: "5rem", maxHeight: "85vh", overflowY: "auto", transition: "transform 0.3s ease-out" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "5px", borderRadius: "3px", backgroundColor: "var(--border)", margin: "0 auto 1.5rem" }} />
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem" }}>Pengaturan Parafrase</h3>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.85rem" }}>✍️ Gaya Parafrase</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {GAYA_LIST.map(g => (
                  <GayaCard key={g.id} gaya={g} active={gaYa === g.id} disabled={loading} onClick={() => setGaYa(g.id)} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.85rem" }}>⚡ Tingkat Kreativitas</div>
              <CreativitySlider value={creativity} onChange={setCreativity} disabled={loading} />
            </div>
            
            <button className="btn btn-primary w-full" style={{ marginTop: "2rem", padding: "0.85rem", fontWeight: 600 }} onClick={() => setShowSettings(false)}>Tutup Pengaturan</button>
          </div>
        </div>
      )}

      {/* ── Mobile Sticky Bottom Bar ────────────── */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "1rem", right: "1rem", zIndex: 50, display: "flex", gap: "0.6rem", pointerEvents: "none" }}>
          <button className="btn btn-outline" onClick={() => setShowSettings(true)} style={{ padding: "0.5rem", borderRadius: "50%", aspectRatio: "1", width: "44px", height: "44px", backgroundColor: "var(--background)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PremiumIcon name="settings" size={20} />
          </button>
          <button className="btn btn-primary" style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 600, borderRadius: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "auto" }} onClick={handleParafrase} disabled={loading || !canAfford || !input.trim()}>
            {loading ? <><PremiumIcon name="zap" size={14} className="animate-pulse" /> Proses...</> : <><PremiumIcon name="wand" size={14} /> Parafrase</>}
          </button>
        </div>
      )}

    </div>
  );
}
