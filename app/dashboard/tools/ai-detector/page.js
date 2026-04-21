"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { callGemini, MODELS } from "@/lib/callWorker";
import { deductCredits, refundCredits, getCharLimit } from "@/lib/credits";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const CREDIT_COST = 3;
const API_GROUP = "group_4";

const SYSTEM_INSTRUCTION = `Kamu adalah ahli linguistik komputasional dan detektor AI profesional. Tugasmu adalah menganalisis teks yang diberikan dan menentukan probabilitas bahwa teks tersebut di-generate oleh AI (seperti ChatGPT, Claude, Gemini).

Analisis pola seperti:
1. Kurangnya "burstiness" (variasi panjang kalimat selalu sama/konsisten).
2. Kurangnya "perplexity" (pilihan kata sangat standar dan sangat mudah ditebak).
3. Penggunaan kata transisi repetitif.
4. Gaya tulisan kelewat formal/mekanis tanpa nuansa emosi manusia bersangkutan.

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

function Gauge({ value }) {
  const isAI = value > 60;
  const color = isAI ? "var(--danger)" : "var(--success)";
  const bgColor = isAI ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)";

  return (
    <div style={{ textAlign: "center", padding: "1.5rem" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <div style={{
          width: "140px", height: "140px", borderRadius: "50%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          border: `8px solid ${color}`, backgroundColor: bgColor, transition: "all 0.5s ease"
        }}>
          <span style={{ fontSize: "2.5rem", fontWeight: 800, color: color, lineHeight: 1 }}>{value}%</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginTop: "0.25rem" }}>Indikasi AI</span>
        </div>
      </div>
    </div>
  );
}

export default function AIDetectorPage() {
  const { user, userData } = useAuth();
  const plan = userData?.plan || "free";
  const charLimit = getCharLimit(plan);

  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const credits = userData?.credits ?? 0;
  const canAfford = credits >= CREDIT_COST;

  const handleCheck = async () => {
    if (!user || !input.trim()) return;
    if (!canAfford) { setError(`Kredit tidak cukup. Butuh ${CREDIT_COST} credit.`); return; }
    if (input.length > charLimit) { setError(`Teks melebihi batas ${charLimit} karakter.`); return; }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      await deductCredits(user.uid, CREDIT_COST);

      const raw = await callGemini({
        prompt: input,
        systemInstruction: SYSTEM_INSTRUCTION,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: 0.1, // Harus strict dan konsisten
      });

      const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) throw new Error("Format respons tidak valid. Coba lagi.");
      
      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (err) {
      await refundCredits(user.uid, CREDIT_COST).catch(() => {});
      setError(err.message || "Terjadi kesalahan saat menganalisis teks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)", padding: "0.5rem", marginTop: "0.25rem" }} title="Kembali">
          <PremiumIcon name="arrowLeft" size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>AI Detector</h1>
          <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>Periksa probabilitas apakah teks ditulis oleh AI atau manusia</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-lg)", fontSize: "0.8rem", fontWeight: 600, color: "var(--danger)", whiteSpace: "nowrap" }}>
          <PremiumIcon name="zap" size={14} />
          <span>{CREDIT_COST} credit</span>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* KIRI: Input Area */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="glass-panel p-6" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>Teks untuk Diperiksa</label>
              <span style={{ fontSize: "0.72rem", color: input.length > charLimit ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
                {input.length.toLocaleString()} / {charLimit.toLocaleString()}
              </span>
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tempel teks Anda di sini... (minimal 100 karakter)"
              className="form-textarea"
              style={{ minHeight: "320px", resize: "vertical", flex: 1, marginBottom: "1rem", fontFamily: "'Outfit', sans-serif", lineHeight: 1.7 }}
              maxLength={charLimit}
              disabled={plan === "free"}
            />
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, minWidth: "150px", padding: "0.8rem", fontWeight: 600 }}
                onClick={handleCheck}
                disabled={loading || !canAfford || !input.trim() || plan === "free"}
              >
                {loading ? (
                  <>
                    <PremiumIcon name="zap" size={16} />
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
          </div>
        </div>

        {/* KANAN: Output/Result Area */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading && (
            <div className="glass-panel p-6" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", minHeight: "400px", justifyContent: "center" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PremiumIcon name="zap" size={32} className="text-primary animate-pulse" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p className="text-main" style={{ margin: 0, fontWeight: 600, marginBottom: "0.25rem" }}>Menganalisis Teks</p>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Memeriksa pola linguistik dan karakteristik kalimat...</p>
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="glass-panel p-6" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Gauge value={result.probability || 0} />
              
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: result.probability > 60 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
                  {result.verdict}
                </h3>
              </div>
              
              <div style={{ backgroundColor: "var(--surface-hover)", padding: "1.25rem", borderRadius: "10px", flex: 1 }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 1rem 0", color: "var(--text-main)" }}>📋 Analisis Linguistik</h4>
                <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--text-muted)" }}>
                  {result.analysis?.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: "0.75rem" }}>
                      <span style={{ color: "var(--text-main)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="glass-panel p-6" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", minHeight: "400px", justifyContent: "center" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PremiumIcon name="search" size={28} className="text-muted" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p className="text-main" style={{ margin: 0, fontWeight: 600, marginBottom: "0.25rem" }}>Belum ada hasil</p>
                <p className="text-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Masukkan teks di sebelah kiri untuk memulai analisis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
