"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { callGemini } from "@/lib/callWorker";
import { deductCredits, refundCredits } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const CREDIT_COST = 2;
const API_GROUP   = "group_3";
const CHAR_LIMIT  = 3000;

const SYSTEM_INSTRUCTION = `Kamu adalah ahli bahasa Indonesia dan bahasa inggris, serta pemeriksa tata bahasa profesional. Tugas kamu adalah menganalisis teks yang diberikan dan mengidentifikasi serta memperbaiki kesalahan gramatikal.

Berikan respons HANYA dalam format JSON berikut (tanpa markdown code block, langsung JSON murni):
{
  "skor": <angka 0-100 mewakili kualitas tata bahasa, 100 = sempurna>,
  "ringkasan": "<1-2 kalimat ringkasan kondisi tata bahasa teks>",
  "kesalahan": [
    {
      "no": 1,
      "asli": "<teks asli yang salah>",
      "perbaikan": "<teks yang sudah diperbaiki>",
      "alasan": "<penjelasan singkat mengapa salah>"
    }
  ],
  "teks_diperbaiki": "<SELURUH teks input yang sudah diperbaiki semua kesalahannya>"
}

Jika tidak ada kesalahan, kembalikan "kesalahan" sebagai array kosong [] dan "skor" 100. Jangan sertakan hal lain di luar JSON.`;

// ── Skor gauge ───────────────────────────────────────────────
function ScoreGauge({ skor }) {
  const color = skor >= 80 ? "var(--success)" : skor >= 50 ? "#F59E0B" : "var(--danger)";
  const label = skor >= 80 ? "Sangat Baik" : skor >= 60 ? "Cukup Baik" : skor >= 40 ? "Perlu Perbaikan" : "Banyak Kesalahan";
  return (
    <div style={{ textAlign: "center", padding: "1.5rem" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <svg width={120} height={80} viewBox="0 0 120 80">
          <path d="M 10 70 A 50 50 0 0 1 110 70" stroke="var(--border)" strokeWidth={10} fill="none" strokeLinecap="round" />
          <path
            d="M 10 70 A 50 50 0 0 1 110 70"
            stroke={color} strokeWidth={10} fill="none" strokeLinecap="round"
            strokeDasharray={`${(skor / 100) * 157} 157`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color, lineHeight: 1 }}>{skor}</div>
        </div>
      </div>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", fontWeight: 600, color }}>{label}</p>
    </div>
  );
}

export default function CekGrammarPage() {
  const { user, userData } = useAuth();
  const [input, setInput]       = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [copiedFix, setCopiedFix] = useState(false);
  const [activeTab, setActiveTab] = useState("kesalahan"); // 'kesalahan' | 'perbaikan'

  const credits   = userData?.credits ?? 0;
  const canAfford = credits >= CREDIT_COST;

  const handleCheck = async () => {
    if (!user || !input.trim()) return;
    if (!canAfford) { setError(`Kredit tidak cukup. Butuh ${CREDIT_COST} credit.`); return; }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      await deductCredits(user.uid, CREDIT_COST);

      const raw = await callGemini({
        prompt: input,
        systemInstruction: SYSTEM_INSTRUCTION,
        group: API_GROUP,
        temperature: 0.2, // Grammar butuh strict
      });

      // Parse JSON – AI tidak selalu 100% clean, ambil yang antara { dan }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format respons AI tidak valid. Coba lagi.");

      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (err) {
      await refundCredits(user.uid, CREDIT_COST).catch(() => {});
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFix = () => {
    navigator.clipboard.writeText(result?.teks_diperbaiki || "");
    setCopiedFix(true);
    setTimeout(() => setCopiedFix(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)" }}><PremiumIcon name="arrowLeft" size={20} /></Link>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Cek Grammar</h1>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>Deteksi & perbaiki kesalahan tata bahasa secara otomatis</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.85rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-lg)", fontSize: "0.8rem", fontWeight: 600 }}>
          <PremiumIcon name="zap" size={14} className="text-primary" />
          <span>{CREDIT_COST} credit / cek</span>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.87rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <PremiumIcon name="alertCircle" size={16} /> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* Left: Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-panel p-6">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Teks yang ingin dicek</label>
              <span style={{ fontSize: "0.72rem", color: input.length > CHAR_LIMIT ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
                {input.length} / {CHAR_LIMIT}
              </span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tempel atau ketik teks yang ingin Anda cek tata bahasanya di sini..."
              className="form-input"
              style={{ minHeight: "280px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.8 }}
              maxLength={CHAR_LIMIT}
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: "0.65rem" }}
                onClick={handleCheck}
                disabled={loading || !canAfford || !input.trim()}
              >
                {loading ? (
                  <><PremiumIcon name="zap" size={16} className="animate-pulse" /> Menganalisis...</>
                ) : (
                  <><PremiumIcon name="check" size={16} /> Cek Grammar</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Result */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {loading && (
            <div className="glass-panel p-6 text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", minHeight: "200px", justifyContent: "center" }}>
              <PremiumIcon name="zap" size={36} className="text-primary animate-pulse" />
              <p className="text-muted" style={{ margin: 0 }}>AI sedang membaca teks Anda...</p>
            </div>
          )}

          {!loading && result && (
            <>
              {/* Score */}
              <div className="glass-panel">
                <ScoreGauge skor={result.skor ?? 0} />
                <p style={{ textAlign: "center", fontSize: "0.82rem", padding: "0 1.5rem 1.25rem", margin: 0 }}>{result.ringkasan}</p>
              </div>

              {/* Tabs */}
              <div className="glass-panel" style={{ overflow: "hidden" }}>
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                  {["kesalahan", "perbaikan"].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      flex: 1, padding: "0.65rem", fontSize: "0.82rem", fontWeight: 600, border: "none",
                      backgroundColor: activeTab === tab ? "var(--surface-hover)" : "transparent",
                      color: activeTab === tab ? "var(--text-main)" : "var(--text-muted)",
                      cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
                    }}>
                      {tab === "kesalahan" ? `Kesalahan (${result.kesalahan?.length || 0})` : "Teks Diperbaiki"}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "1.25rem", maxHeight: "320px", overflowY: "auto" }}>
                  {activeTab === "kesalahan" ? (
                    result.kesalahan?.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--success)", padding: "2rem" }}>
                        <PremiumIcon name="check" size={32} style={{ margin: "0 auto 0.5rem" }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada kesalahan ditemukan!</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        {result.kesalahan?.map((item, i) => (
                          <div key={i} style={{ padding: "0.85rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--danger)" }}>
                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", alignItems: "flex-start" }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 800, backgroundColor: "var(--danger)", color: "white", borderRadius: "50%", width: "18px", height: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>{item.no}</span>
                              <div>
                                <div style={{ fontSize: "0.8rem" }}>
                                  <span style={{ textDecoration: "line-through", color: "var(--danger)" }}>{item.asli}</span>
                                  <span style={{ margin: "0 0.35rem", color: "var(--text-muted)" }}>→</span>
                                  <span style={{ color: "var(--success)", fontWeight: 600 }}>{item.perbaikan}</span>
                                </div>
                                <p style={{ fontSize: "0.72rem", margin: "0.3rem 0 0", color: "var(--text-muted)" }}>{item.alasan}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
                        <button className="btn btn-outline" onClick={handleCopyFix} style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>
                          <PremiumIcon name={copiedFix ? "check" : "send"} size={13} />
                          {copiedFix ? "Tersalin!" : "Salin"}
                        </button>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.8, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{result.teks_diperbaiki}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!loading && !result && (
            <div className="glass-panel p-6" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center", minHeight: "200px", justifyContent: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PremiumIcon name="check" size={24} style={{ color: "var(--success)" }} />
              </div>
              <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Masukkan teks di kiri, lalu klik "Cek Grammar" untuk melihat hasilnya di sini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
