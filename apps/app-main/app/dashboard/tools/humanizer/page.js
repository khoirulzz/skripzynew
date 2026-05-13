"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGeminiStream } from "@/lib/callWorker";
import { deductCredits, refundCredits, getCharLimit } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

const CREDIT_COST = 3;
const API_GROUP   = "group_1";

const INTENSITAS_LIST = [
  { id: "ringan",   label: "Ringan",   desc: "Perbaikan minimal, tetap dekat dengan teks asli", temp: 0.5 },
  { id: "sedang",   label: "Sedang",   desc: "Keseimbangan antara keaslian & nuansa manusiawi",  temp: 0.9 },
  { id: "penuh",    label: "Penuh",    desc: "Paling organik, bebas dari pola AI yang kaku",     temp: 1.3 },
];

const STYLE_LIST = [
  { id: "santai",     label: "Santai",       desc: "Seperti esai blog pribadi yang mengalir" },
  { id: "mahasiswa",  label: "Mahasiswa",    desc: "Tulisan akademik namun tetap terdengar natural" },
  { id: "profesional",label: "Profesional",  desc: "Formal namun tidak terasa seperti di-generate AI" },
];

const buildSystemInstruction = (intensitas, style) => {
  const styleMap = {
    santai:       "gaya santai seperti penulis blog yang bercerita dengan natural",
    mahasiswa:    "gaya mahasiswa yang menulis secara akademik namun terdengar seperti ditulis sendiri, bukan AI",
    profesional:  "gaya profesional yang formal namun hangat, tidak terasa seperti template atau AI-generated",
  };

  const intensitasMap = {
    ringan: "Lakukan penyesuaian minimal: ubah beberapa diksi dan variasikan struktur kalimat saja, jangan mengubah isi atau makna secara drastis.",
    sedang: "Tulis ulang sekitar 50% dari kalimat: sesuaikan pola struktur AI yang teratur, tambahkan variasi kalimat panjang-pendek, sisipkan frasa yang lebih organik.",
    penuh:  "Rekonstruksi teks secara menyeluruh: hilangkan semua pola repetitif AI, buat kalimat tidak beraturan secara alami seperti manusia sungguhan menulis, tambahkan nuansa emosional yang subtil.",
  };

  return `Kamu adalah seorang penulis manusia berpengalaman yang bertugas memanusiakan teks yang tampak ditulis oleh AI.

Teks AI biasanya memiliki ciri: struktur kalimat yang sangat teratur, penggunaan transisi yang repetitif ("Selain itu,", "Oleh karena itu,"), serta pola paragraph yang terlalu sempurna.

Tugas kamu:
- Tulis ulang teks berikut menggunakan ${styleMap[style]}.
- ${intensitasMap[intensitas]}
- Pastikan makna dan informasi utama TETAP SAMA — hanya cara penyampaiannya yang berubah.
- JANGAN tambahkan disclaimer seperti "Hasil parafrase:", "Berikut hasilnya:", dll.
- Keluarkan HANYA teks hasil humanisasi, langsung tanpa pengantar.`;
};

export default function HumanizerPage() {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const plan      = userData?.plan || "free";
  const charLimit = getCharLimit(plan);

  const [input, setInput]           = useState("");
  const [output, setOutput]         = useState("");
  const [intensitas, setIntensitas] = useState("sedang");
  const [style, setStyle]           = useState("mahasiswa");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [expandedIntensitas, setExpandedIntensitas] = useState(false);
  const [expandedStyle, setExpandedStyle] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const creditCost = toolMap["humanizer"]?.creditCost ?? CREDIT_COST;
  const credits   = userData?.credits ?? 0;
  const canAfford = credits >= creditCost;

  const handleHumanize = async () => {
    if (!user || !input.trim()) return;
    if (!canAfford) { setError(`Kredit tidak cukup. Butuh ${creditCost} credit.`); return; }
    if (input.length > charLimit) { setError(`Teks melebihi batas ${charLimit} karakter.`); return; }

    setLoading(true);
    setError("");
    setOutput("");

    const selectedIntensitas = INTENSITAS_LIST.find(i => i.id === intensitas);

    try {
      await deductCredits(user.uid, creditCost);

      await callGeminiStream({
        prompt: input,
        systemInstruction: buildSystemInstruction(intensitas, style),
        group: API_GROUP,
        temperature: selectedIntensitas.temp,
        onStream: (chunk) => {
          setOutput(chunk);
        }
      });
    } catch (err) {
      await refundCredits(user.uid, creditCost).catch(() => {});
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: isMobile ? "2rem" : 0 }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)", display: isMobile ? "none" : "block" }}><PremiumIcon name="arrowLeft" size={isMobile ? 18 : 20} /></Link>
          <div>
            <h1 style={{ fontSize: isMobile ? "1rem" : "1.5rem", margin: 0, fontWeight: 700 }}>Humanizer AI</h1>
            <p style={{ margin: "0.1rem 0 0 0", fontSize: isMobile ? "0.65rem" : "0.75rem", color: "var(--text-muted)" }}>Buat tulisan AI terdengar natural & manusiawi</p>
          </div>
        </div>
        <div style={{ 
          marginLeft: isMobile ? 0 : "auto", 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          padding: "0.4rem 0.85rem", 
          backgroundColor: "rgba(245,158,11,0.1)", 
          borderRadius: "var(--radius-lg)", 
          fontSize: "0.75rem", 
          fontWeight: 600, 
          color: "#D97706" 
        }}>
          <PremiumIcon name="sparkles" size={14} />
          <span>{creditCost} credit / humanize</span>
          <span style={{ padding: "1px 6px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", borderRadius: "8px", fontSize: "0.6rem", fontWeight: 800 }}>PRO</span>
        </div>
      </div>

      {/* Pro Gate — akan diganti saat plan system selesai */}
      {plan === "free" && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700 }}>Fitur Khusus Pro & Plus</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Humanizer hanya tersedia bagi pengguna berbayar. Upgrade untuk mengakses seluruh fitur premium.</p>
          </div>
          <Link href="/dashboard/langganan" className="btn btn-primary" style={{ flexShrink: 0 }}>Upgrade Sekarang</Link>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.87rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <PremiumIcon name="alertCircle" size={16} /> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: isMobile ? "1rem" : "1.5rem" }}>

        {/* Left: Input + Output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Input */}
          <div className="glass-panel" style={{ padding: isMobile ? "1rem" : "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", fontWeight: 600 }}>Teks AI yang ingin dihumanisasi</label>
              <span style={{ fontSize: isMobile ? "0.65rem" : "0.72rem", color: input.length > charLimit ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
                {input.length} / {charLimit}
              </span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tempel teks yang dibuat oleh AI (ChatGPT, Gemini, dll.) di sini..."
              className="form-input"
              style={{ minHeight: isMobile ? "40vh" : "200px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, fontSize: isMobile ? "0.8rem" : "0.95rem", border: isMobile ? "none" : "1px solid var(--border)", padding: isMobile ? "0.5rem 0" : "0.75rem 1rem", backgroundColor: isMobile ? "transparent" : "var(--background)" }}
              maxLength={charLimit}
              disabled={plan === "free"}
            />
          </div>

          {/* Output */}
          {(loading || output) && (
            <div className="glass-panel" style={{ padding: isMobile ? "1rem" : "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <label style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", fontWeight: 600 }}>
                  Versi Manusiawi
                  {!loading && output && (
                    <span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>
                      {output.split(/\s+/).filter(Boolean).length} kata
                    </span>
                  )}
                </label>
                {!loading && output && (
                  <button className="btn btn-outline" onClick={handleCopy} style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", gap: "0.35rem" }}>
                    <PremiumIcon name={copied ? "check" : "send"} size={13} />
                    {copied ? "Tersalin!" : "Salin"}
                  </button>
                )}
              </div>
              {loading && !output ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {[95, 80, 100, 75, 60].map((w, i) => (
                    <div key={i} className="animate-pulse" style={{ height: "15px", width: `${w}%`, backgroundColor: "rgba(245,158,11,0.2)", borderRadius: "4px" }} />
                  ))}
                </div>
              ) : (
                <div className="markdown-body" style={{ backgroundColor: isMobile ? "var(--surface-hover)" : "transparent", padding: isMobile ? "0.75rem" : "0", borderRadius: "8px", fontSize: isMobile ? "0.8rem" : "0.95rem", lineHeight: 1.6 }}>
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Settings */}
        {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "0.75rem" : "1.25rem" }}>

          {/* Intensitas */}
          <div className={isMobile ? "native-card" : "glass-panel p-5"} style={{ margin: isMobile ? "0 -0.75rem" : 0 }}>
            <button 
              onClick={() => setExpandedIntensitas(!expandedIntensitas)}
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
                marginBottom: expandedIntensitas ? "0.75rem" : 0
              }}
            >
              <span>🔥 Intensitas Humanisasi</span>
              <PremiumIcon name="chevronDown" size={18} style={{ transform: expandedIntensitas ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
            </button>
            
            {expandedIntensitas && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {INTENSITAS_LIST.map(item => (
                  <button key={item.id} onClick={() => setIntensitas(item.id)} disabled={loading || plan === "free"} style={{
                    textAlign: "left", padding: "0.7rem 0.9rem",
                    border: `1.5px solid ${intensitas === item.id ? "#F59E0B" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)", cursor: plan === "free" ? "not-allowed" : "pointer",
                    backgroundColor: intensitas === item.id ? "rgba(245,158,11,0.08)" : "transparent",
                    fontFamily: "inherit", opacity: plan === "free" ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: intensitas === item.id ? "#D97706" : "var(--text-main)", marginBottom: "0.15rem" }}>{item.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Style Penulisan */}
          <div className={isMobile ? "native-card" : "glass-panel p-5"} style={{ margin: isMobile ? "0 -0.75rem" : 0 }}>
            <button 
              onClick={() => setExpandedStyle(!expandedStyle)}
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
                marginBottom: expandedStyle ? "0.75rem" : 0
              }}
            >
              <span>✍️ Gaya Penulisan</span>
              <PremiumIcon name="chevronDown" size={18} style={{ transform: expandedStyle ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
            </button>
            
            {expandedStyle && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {STYLE_LIST.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)} disabled={loading || plan === "free"} style={{
                    textAlign: "left", padding: "0.6rem 0.9rem",
                    border: `1.5px solid ${style === s.id ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)", cursor: plan === "free" ? "not-allowed" : "pointer",
                    backgroundColor: style === s.id ? "var(--primary-light)" : "transparent",
                    fontFamily: "inherit", opacity: plan === "free" ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: style === s.id ? "var(--primary)" : "var(--text-main)", marginBottom: "0.15rem" }}>{s.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className={isMobile ? "native-card" : "glass-panel p-5"} style={{ margin: isMobile ? "0 -0.75rem" : 0, borderBottom: isMobile ? "none" : "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span className="text-muted">Kredit Anda</span>
              <span style={{ fontWeight: 700, color: canAfford ? "var(--text-main)" : "var(--danger)" }}>{credits}</span>
            </div>
            <button
              className="btn btn-primary w-full"
              style={{ padding: "0.75rem", fontSize: "0.95rem", background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
              onClick={handleHumanize}
              disabled={loading || !canAfford || !input.trim() || plan === "free"}
            >
              {loading ? (
                <><PremiumIcon name="sparkles" size={16} className="animate-pulse" /> Memanusiakan...</>
              ) : (
                <><PremiumIcon name="sparkles" size={16} /> Humanize Sekarang</>
              )}
            </button>
            {plan === "free" && (
              <Link href="/dashboard/langganan" className="btn btn-outline w-full text-center" style={{ padding: "0.5rem", fontSize: "0.8rem" }}>
                Upgrade ke Pro
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
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem" }}>Pengaturan Humanizer</h3>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.85rem" }}>🔥 Intensitas Humanisasi</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {INTENSITAS_LIST.map(item => (
                  <button key={item.id} onClick={() => setIntensitas(item.id)} disabled={loading || plan === "free"} style={{
                    textAlign: "left", padding: "0.7rem 0.9rem",
                    border: `1.5px solid ${intensitas === item.id ? "#F59E0B" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)", cursor: plan === "free" ? "not-allowed" : "pointer",
                    backgroundColor: intensitas === item.id ? "rgba(245,158,11,0.08)" : "transparent",
                    fontFamily: "inherit", opacity: plan === "free" ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: intensitas === item.id ? "#D97706" : "var(--text-main)", marginBottom: "0.15rem" }}>{item.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.85rem" }}>✍️ Gaya Penulisan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {STYLE_LIST.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)} disabled={loading || plan === "free"} style={{
                    textAlign: "left", padding: "0.6rem 0.9rem",
                    border: `1.5px solid ${style === s.id ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)", cursor: plan === "free" ? "not-allowed" : "pointer",
                    backgroundColor: style === s.id ? "var(--primary-light)" : "transparent",
                    fontFamily: "inherit", opacity: plan === "free" ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: style === s.id ? "var(--primary)" : "var(--text-main)", marginBottom: "0.15rem" }}>{s.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{s.desc}</div>
                  </button>
                ))}
              </div>
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
          <button className="btn btn-primary" style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 600, borderRadius: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", background: "linear-gradient(135deg, #F59E0B, #D97706)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "auto" }} onClick={handleHumanize} disabled={loading || !canAfford || !input.trim() || plan === "free"}>
            {loading ? <><PremiumIcon name="sparkles" size={14} className="animate-pulse" /> Proses...</> : <><PremiumIcon name="sparkles" size={14} /> Humanize</>}
          </button>
        </div>
      )}

    </div>
  );
}
