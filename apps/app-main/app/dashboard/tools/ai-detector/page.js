"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { callGemini, MODELS } from "@/lib/callWorker";
import { deductCredits, refundCredits, getCharLimit } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

const CREDIT_COST = 3;
const API_GROUP = "group_4";

const SYSTEM_INSTRUCTION = `Kamu adalah ahli linguistik komputasional dan detektor AI profesional. Tugasmu adalah menganalisis teks yang diberikan dan menentukan probabilitas bahwa teks tersebut di-generate oleh AI (seperti ChatGPT, Claude, Gemini).

Analisis pola seperti:
1. Kurangnya "burstiness" (variasi panjang kalimat selalu sama/konsisten).
2. Kurangnya "perplexity" (pilihan kata sangat standar dan sangat mudah ditebak).
3. Penggunaan kata transisi repetitif.
4. Gaya tulisan kelewat formal/mekanis tanpa nuansa emosi manusia bersangkutan.
5. Penggunaan pola kalimat klise yang konsisten/terlalu banyak di dalam paragraf.
Berikan respons HANYA dalam format JSON berikut (tanpa markdown blok):
{
  "probability": <angka 0-100 mewakili kemungkinan teks ditulis AI>,
  "verdict": "<Kesimpulan singkat padat, contoh: 'Kemungkinan Besar AI' atau 'Sangat Natural'>",
  "analysis": [
    "<Poin 1 alasanmu>",
    "<Poin 2 alasanmu>",
    "<Poin 3 alasanmu>"
  ]
}

Jangan tambahkan teks apapun di luar format JSON.`;

function Gauge({ value, isMobile }) {
  const isAI = value > 60;
  const color = isAI ? "var(--danger)" : "var(--success)";
  const bgColor = isAI ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";

  return (
    <div style={{ textAlign: "center", padding: "1.5rem" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{
          width: isMobile ? "110px" : "140px", height: isMobile ? "110px" : "140px", borderRadius: "50%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          border: `8px solid ${color}`, backgroundColor: bgColor, transition: "all 0.5s ease"
        }}>
          <span style={{ fontSize: isMobile ? "2rem" : "2.5rem", fontWeight: 800, color: color, lineHeight: 1 }}>{value}%</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginTop: "0.25rem" }}>Indikasi AI</span>
        </div>
      </div>
    </div>
  );
}

export default function AIDetectorPage() {
  const clickRef = useRef(false);
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const plan = userData?.plan || "free";
  const charLimit = getCharLimit(plan);

  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const creditCost = toolMap["ai-detector"]?.creditCost ?? CREDIT_COST;
  const credits = userData?.credits ?? 0;
  const canAfford = credits >= creditCost;

  const handleCheck = async () => {
    if (clickRef.current) return;
    if (!user || !input.trim()) return;
    if (!canAfford) { setError(`Kredit tidak cukup. Butuh ${creditCost} credit.`); return; }
    if (input.length > charLimit) { setError(`Teks melebihi batas ${charLimit} karakter.`); return; }

    setLoading(true);
    clickRef.current = true;
    setError("");
    setResult(null);

    try {
      await deductCredits(user.uid, creditCost);

      const raw = await callGemini({
        prompt: input,
        systemInstruction: SYSTEM_INSTRUCTION,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: 0.1,
        responseMimeType: "application/json",
      });

      let jsonStr = raw.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(jsonStr);
      setResult(parsed);
    } catch (err) {
      await refundCredits(user.uid, creditCost).catch(() => { });
      setError(err.message || "Terjadi kesalahan saat menganalisis teks.");
    } finally {
      setLoading(false);
      clickRef.current = false;
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: isMobile ? "2rem" : 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "1.5rem" : "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)" }} title="Kembali">
            <PremiumIcon name="arrowLeft" size={isMobile ? 18 : 20} />
          </Link>
          <div>
            <h1 style={{ fontSize: isMobile ? "1rem" : "1.5rem", margin: 0 }}>AI Detector</h1>
            <p style={{ margin: "0.1rem 0 0 0", fontSize: isMobile ? "0.65rem" : "0.75rem", color: "var(--text-muted)" }}>Periksa probabilitas apakah teks ditulis oleh AI atau manusia</p>
          </div>
        </div>
        <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.85rem", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-lg)", fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", whiteSpace: "nowrap" }}>
          <PremiumIcon name="zap" size={14} />
          <span>{creditCost} credit</span>
          <span style={{ padding: "2px 8px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 800, marginLeft: "0.25rem" }}>PRO</span>
        </div>
      </div>

      {plan === "free" && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>Fitur Khusus Pro & Plus</p>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>AI Detector hanya tersedia bagi pengguna dengan plan berbayar.</p>
          </div>
          <Link href="/dashboard/langganan" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>Upgrade</Link>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "var(--radius-md)", fontSize: "0.87rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <PremiumIcon name="alertCircle" size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "1rem" : "1.5rem" }}>
        {/* KIRI: Input Area */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", padding: isMobile ? "1rem" : "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <label style={{ fontSize: isMobile ? "0.75rem" : "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Teks untuk Diperiksa</label>
              <span style={{ fontSize: isMobile ? "0.65rem" : "0.72rem", color: input.length > charLimit ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
                {input.length.toLocaleString()} / {charLimit.toLocaleString()}
              </span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tempel teks Anda di sini... (minimal 100 karakter)"
              className="form-input"
              style={{ minHeight: isMobile ? "40vh" : "320px", resize: "vertical", flex: 1, fontFamily: "'Outfit', sans-serif", lineHeight: 1.6, fontSize: isMobile ? "0.8rem" : "0.95rem", border: isMobile ? "none" : "1px solid var(--border)", padding: isMobile ? "0.5rem 0" : "0.75rem 1rem", backgroundColor: isMobile ? "transparent" : "var(--background)" }}
              maxLength={charLimit}
              disabled={plan === "free"}
            />
            {!isMobile && (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: "150px", padding: "0.8rem", fontWeight: 600, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}
                  onClick={handleCheck}
                  disabled={loading || !canAfford || !input.trim() || plan === "free"}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size={16} className="text-white" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <PremiumIcon name="search" size={16} />
                      Cek Teks
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KANAN: Output/Result Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "5rem" : 0 }}>
          {loading && (
            <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: isMobile ? "1.5rem" : "2rem", minHeight: isMobile ? "150px" : "200px", justifyContent: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LoadingSpinner size={24} className="text-primary" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p className="text-muted" style={{ margin: 0, fontSize: isMobile ? "0.8rem" : "1rem" }}>Memeriksa pola linguistik...</p>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", padding: isMobile ? "1rem" : "1.5rem" }}>
              <Gauge value={result.probability || 0} isMobile={isMobile} />

              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: result.probability > 60 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
                  {result.verdict}
                </h3>
              </div>

              <div style={{ backgroundColor: "var(--surface-hover)", padding: "1.25rem", borderRadius: "10px", flex: 1 }}>
                <h4 style={{ fontSize: isMobile ? "0.8rem" : "0.9rem", fontWeight: 600, margin: "0 0 1rem 0", color: "var(--text-main)" }}>📋 Analisis Linguistik</h4>
                <div className="markdown-body" style={{ fontSize: isMobile ? "0.8rem" : "0.95rem" }}>
                  <ReactMarkdown>
                    {result.analysis?.map(item => `- ${item}`).join('\n')}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", minHeight: isMobile ? "150px" : "200px", padding: isMobile ? "1.5rem" : "2rem", justifyContent: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PremiumIcon name="search" size={24} className="text-muted" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p className="text-muted" style={{ margin: 0, fontSize: isMobile ? "0.75rem" : "0.85rem" }}>Masukkan teks di sebelah kiri untuk memulai analisis</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sticky Bottom Bar ────────────── */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: "1.5rem", left: "1rem", right: "1rem", zIndex: 50, display: "flex", pointerEvents: "none" }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: "0.6rem", fontSize: "0.85rem", fontWeight: 600, borderRadius: "24px", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", pointerEvents: "auto" }} onClick={handleCheck} disabled={loading || !canAfford || !input.trim() || plan === "free"}>
            {loading ? <><LoadingSpinner size={14} className="text-white" /> Menganalisis...</> : <><PremiumIcon name="search" size={14} /> Cek Teks</>}
          </button>
        </div>
      )}
    </div>
  );
}
