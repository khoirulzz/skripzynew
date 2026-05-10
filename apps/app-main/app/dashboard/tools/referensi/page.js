"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import ReactMarkdown from "react-markdown";
import { searchPapersWithFallback, getErrorMessage } from "@/lib/referenceApis";
import { callGemini, MODELS } from "@/lib/callWorker";
import { deductCredits, refundCredits } from "@/lib/credits";
import AnimatedLoadingScreen from "@/components/workspace/AnimatedLoadingScreen";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
import Link from "next/link";

const COST_SUMMARY = 1;
const API_GROUP = "group_4";

function getSourceLabel(source = "") {
  if (source.startsWith("mixed")) return "Gabungan Sumber";
  if (source === "core") return "Core UK API";
  if (source === "openalex") return "OpenAlex";
  if (source === "unpaywall") return "Unpaywall";
  return "Sumber Tidak Diketahui";
}

function PaperCard({ paper, onSummarize, hasSummary, isSummarizing, summaryCost, summaryText }) {
  return (
    <div className="glass-panel p-6" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0", fontWeight: 700 }}>
          <a href={paper.displayUrl || paper.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>
            {paper.title}
          </a>
        </h3>

        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          {paper.authorString} • {paper.year || "Tahun tidak diketahui"} {paper.venue ? `• ${paper.venue}` : ""}
        </div>

        {paper.hasFullText && (
          <a href={paper.displayUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success)", padding: "2px 8px", borderRadius: "10px", textDecoration: "none", fontWeight: 600, marginBottom: "0.75rem" }}>
            <PremiumIcon name="fileText" size={12} /> Full-text PDF Tersedia
          </a>
        )}

        <p style={{ fontSize: "0.9rem", lineHeight: 1.6, margin: 0, color: "var(--text-main)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {paper.abstract || <em style={{ color: "var(--text-muted)" }}>Abstrak tidak tersedia.</em>}
        </p>
      </div>

      <div style={{ backgroundColor: "var(--surface-hover)", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.8rem", borderLeft: "3px solid var(--border)" }}>
        <span style={{ fontWeight: 600, marginRight: "0.5rem", color: "var(--text-muted)" }}>Sitasi:</span>
        {paper.authorString} ({paper.year}). {paper.title}. {paper.venue || 'Sumber tidak diketahui'}.
      </div>

      {paper.abstract && !hasSummary && (
        <div style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}>
          <button
            className="btn btn-outline"
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
            onClick={() => onSummarize(paper)}
            disabled={isSummarizing}
          >
            {isSummarizing ? "Meringkas..." : `Ringkas dengan AI (-${summaryCost} Kredit)`}
          </button>
        </div>
      )}

      {hasSummary && (
        <div style={{ marginTop: "1rem", backgroundColor: "rgba(79, 70, 229, 0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(79, 70, 229, 0.2)" }}>
          <h4 style={{ fontSize: "0.9rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <PremiumIcon name="sparkles" size={16} /> Hasil Ringkasan AI
          </h4>
          <div className="markdown-body">
            <ReactMarkdown>{summaryText}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function PaperSection({ title, description, papers, onSummarize, summaries, loadingSum, summaryCost, emptyText }) {
  if (!papers || papers.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(99, 102, 241, 0.1)", borderRadius: "8px", fontSize: "0.85rem", color: "var(--primary)" }}>
        {title} — {description}
      </div>

      {papers.map(paper => {
        const hasSummary = !!summaries[paper.id];
        const isSummarizing = !!loadingSum[paper.id];

        return (
          <PaperCard
            key={paper.id}
            paper={paper}
            onSummarize={onSummarize}
            hasSummary={hasSummary}
            isSummarizing={isSummarizing}
            summaryCost={summaryCost}
            summaryText={summaries[paper.id]}
          />
        );
      })}

      {!papers.length && emptyText ? (
        <div style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>{emptyText}</div>
      ) : null}
    </div>
  );
}

export default function ReferensiCerdasPage() {
  const { user, userData } = useAuth();
  const { toolMap } = useBillingCatalog();
  const credits = userData?.credits ?? 0;
  const summaryCost = toolMap["referensi-ringkas"]?.creditCost ?? COST_SUMMARY;

  const [query, setQuery] = useState("");
  const [yearRange, setYearRange] = useState("5");
  const [papers, setPapers] = useState([]);
  const [featuredPapers, setFeaturedPapers] = useState([]);
  const [relatedPapers, setRelatedPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiAttempt, setApiAttempt] = useState("core");
  const [error, setError] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [summaries, setSummaries] = useState({});
  const [loadingSum, setLoadingSum] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearchMessage("");
    setPapers([]);
    setFeaturedPapers([]);
    setRelatedPapers([]);
    setSummaries({});
    setApiAttempt("core");

    try {
      const result = await searchPapersWithFallback(query, { limit: 10, yearRange });
      setPapers(result.papers || []);
      setFeaturedPapers(result.featuredPapers || result.papers || []);
      setRelatedPapers(result.relatedPapers || []);
      setApiAttempt(result.source);
      setSearchMessage(result.message || "");

      if ((result.papers || []).length === 0) {
        setError("Tidak ditemukan hasil yang cocok dengan kata kunci tersebut. Coba ubah kata kunci atau tahun pencarian.");
      }
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async (paper) => {
    if (!user) return;
    if (credits < summaryCost) {
      alert(`Kredit tidak cukup. Butuh ${summaryCost} credit.`);
      return;
    }
    if (!paper.abstract) {
      alert("Abstrak tidak tersedia untuk diringkas.");
      return;
    }

    setLoadingSum(prev => ({ ...prev, [paper.id]: true }));
    try {
      await deductCredits(user.uid, summaryCost);

      const prompt = `Abstrak Jurnal:\nJudul: ${paper.title}\nAbstrak: ${paper.abstract}\n\nTugas:\nBerikan ringkasan abstrak di atas dalam bahasa Indonesia yang sangat mudah dipahami.\nTuliskan 1 paragraf inti (apa masalahnya, metode yang dipakai, dan hasilnya), serta 3 bullet point temuan utama.`;

      const aiResponse = await callGemini({
        prompt,
        model: MODELS.primary,
        group: API_GROUP,
        temperature: 0.5,
      });

      setSummaries(prev => ({ ...prev, [paper.id]: aiResponse }));
    } catch (err) {
      await refundCredits(user.uid, summaryCost).catch(() => {});
      console.error(err);
      alert("Gagal meringkas abstrak: " + err.message);
    } finally {
      setLoadingSum(prev => ({ ...prev, [paper.id]: false }));
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)" }}>
          <PremiumIcon name="arrowLeft" size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Referensi Cerdas</h1>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Cari sumber ilmiah global & ringkas instan (Core + OpenAlex + Unpaywall)
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.85rem", backgroundColor: "var(--surface-hover)", borderRadius: "var(--radius-lg)", fontSize: "0.8rem", fontWeight: 600 }}>
          <span>Kredit:</span>
          <span style={{ color: "var(--text-main)" }}>{credits}</span>
        </div>
      </div>

      {/* Box Pencarian */}
      <div className="glass-panel p-6 mb-6">
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-group" style={{ flex: "1 1 300px", margin: 0 }}>
            <label className="form-label">Kata Kunci Pencarian</label>
            <input
              type="text"
              className="form-input"
              placeholder="Contoh: Digital transformation in education"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ width: "200px", margin: 0 }}>
            <label className="form-label">Tahun</label>
            <select className="form-input" value={yearRange} onChange={e => setYearRange(e.target.value)}>
              <option value="3">3 Tahun Terakhir</option>
              <option value="5">5 Tahun Terakhir</option>
              <option value="10">10 Tahun Terakhir</option>
              <option value="all">Semua Tahun</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()} style={{ height: "42px", padding: "0 1.5rem" }}>
            {loading ? "Mencari..." : "Cari Jurnal"}
          </button>
        </form>
      </div>

      {/* Hasil & Error */}
      {error && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: "8px", marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <PremiumIcon name="alertCircle" size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>{error}</p>
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
              <button className="btn btn-outline" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }} onClick={() => { setError(""); setQuery(""); }}>
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <AnimatedLoadingScreen isLoading={loading} apiAttempt={apiAttempt} />}

      {!loading && !error && searchMessage && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(99, 102, 241, 0.1)", borderRadius: "8px", fontSize: "0.85rem", color: "var(--primary)", marginBottom: "1rem" }}>
          {searchMessage}
        </div>
      )}

      {!loading && featuredPapers.length > 0 && (
        <PaperSection
          title="🔥 Hasil Paling Relevan"
          description={`${featuredPapers.length} referensi teratas yang paling sesuai dengan topik pencarian`}
          papers={featuredPapers}
          onSummarize={handleSummarize}
          summaries={summaries}
          loadingSum={loadingSum}
          summaryCost={summaryCost}
        />
      )}

      {!loading && relatedPapers.length > 0 && (
        <div style={{ marginTop: featuredPapers.length > 0 ? "2rem" : 0 }}>
          <PaperSection
            title="📚 Referensi Mungkin Terkait"
            description={`${relatedPapers.length} referensi tambahan yang masih punya keterkaitan topik`}
            papers={relatedPapers}
            onSummarize={handleSummarize}
            summaries={summaries}
            loadingSum={loadingSum}
            summaryCost={summaryCost}
          />
        </div>
      )}

      {!loading && papers.length === 0 && !error && searchMessage && (
        <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "rgba(148, 163, 184, 0.08)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Tidak ada referensi yang cukup kuat untuk ditampilkan pada mode ini.
        </div>
      )}
    </div>
  );
}
