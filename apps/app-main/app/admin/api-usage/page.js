"use client";

import { useState, useEffect } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { useAuth } from "@/components/providers/AuthProvider";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

export default function ApiUsagePage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [error, setError] = useState(null);

  // Stats summaries
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/api-usage`, {
        method: "GET",
        headers: {
          "x-skripzy-secret": WORKER_SECRET
        }
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat data API Usage");
      }

      setUsageData(data.data || []);
      
      // Calculate summary
      let reqs = 0;
      let toks = 0;
      (data.data || []).forEach(row => {
        reqs += row.total_requests || 0;
        toks += row.total_tokens || 0;
      });
      setTotalRequests(reqs);
      setTotalTokens(toks);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat("id-ID").format(num || 0);
  };

  const getModelBadge = (modelName) => {
    let color = "var(--text-muted)";
    let bg = "var(--surface-hover)";
    
    if (modelName.includes("flash-latest")) {
      color = "#8B5CF6"; bg = "rgba(139, 92, 246, 0.1)";
    } else if (modelName.includes("2.5-flash")) {
      color = "#10B981"; bg = "rgba(16, 185, 129, 0.1)";
    } else if (modelName.includes("lite")) {
      color = "#F59E0B"; bg = "rgba(245, 158, 11, 0.1)";
    } else if (modelName.includes("embedding")) {
      color = "#3B82F6"; bg = "rgba(59, 130, 246, 0.1)";
    }

    return (
      <span style={{ 
        padding: "0.2rem 0.5rem", 
        borderRadius: "var(--radius-sm)", 
        fontSize: "0.75rem", 
        fontWeight: 600,
        color: color,
        backgroundColor: bg,
        display: "inline-block"
      }}>
        {modelName}
      </span>
    );
  };

  // Group data by Date for the table
  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
            <PremiumIcon name="loader" className="animate-spin" size={24} style={{ color: "var(--primary)" }} />
            <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>Memuat data usage...</p>
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--danger)" }}>
            <PremiumIcon name="alertCircle" size={24} />
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>{error}</p>
          </td>
        </tr>
      );
    }

    if (usageData.length === 0) {
      return (
        <tr>
          <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
            <PremiumIcon name="activity" size={24} style={{ opacity: 0.5 }} />
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>Belum ada data penggunaan API yang tercatat.</p>
          </td>
        </tr>
      );
    }

    return usageData.map((row, idx) => (
      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
        <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-main)" }}>
          {new Date(row.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </td>
        <td style={{ padding: "1rem" }}>
          {getModelBadge(row.model_name)}
        </td>
        <td style={{ padding: "1rem", fontSize: "0.85rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
          {row.api_key.substring(0, 10)}...
        </td>
        <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)", textAlign: "right" }}>
          {formatNumber(row.total_requests)}
        </td>
        <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)", textAlign: "right" }}>
          {formatNumber(row.total_tokens)}
        </td>
      </tr>
    ));
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <PremiumIcon name="activity" style={{ color: "var(--primary)" }} />
            API Usage Monitor
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
            Pantau penggunaan load balancing, rotasi API keys, dan limit rate lokal.
          </p>
        </div>
        <button 
          onClick={fetchUsageData}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <PremiumIcon name="refreshCw" size={16} className={loading ? "animate-spin" : ""} />
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        
        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PremiumIcon name="zap" size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Total API Requests</p>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{formatNumber(totalRequests)}</h2>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PremiumIcon name="database" size={20} style={{ color: "#10B981" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Total Tokens Digunakan</p>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{formatNumber(totalTokens)}</h2>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PremiumIcon name="server" size={20} style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Rotasi Key Aktif</p>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                {new Set(usageData.map(d => d.api_key)).size} Keys
              </h2>
            </div>
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-hover)" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PremiumIcon name="barChart2" size={18} />
            Laporan Harian per Model
          </h2>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--text-muted)" }}>
                <th style={{ padding: "1rem", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tanggal</th>
                <th style={{ padding: "1rem", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Model AI</th>
                <th style={{ padding: "1rem", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>API Key (Prefix)</th>
                <th style={{ padding: "1rem", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Total Request</th>
                <th style={{ padding: "1rem", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Total Tokens</th>
              </tr>
            </thead>
            <tbody>
              {renderTableBody()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
