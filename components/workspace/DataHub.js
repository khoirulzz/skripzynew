"use client";

import { useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { FormBuilder } from "./FormBuilder";
import { DataAnalysisDashboard } from "./DataAnalysisDashboard";

export function DataHub({ workspaceId }) {
  const [activeTab, setActiveTab] = useState("kuesioner"); // 'kuesioner', 'wawancara', 'analisis'
  const [showFormBuilder, setShowFormBuilder] = useState(false);

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* Header Hub */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem 0", display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <PremiumIcon name="database" size={30} className="text-primary" />
          Manajemen Data Penelitian
        </h1>
        <p className="text-muted" style={{ margin: 0, fontSize: "1rem" }}>
          Buat kuesioner, input transkrip wawancara, dan lakukan uji statistik dalam satu tempat terpusat.
        </p>
      </div>

      {/* Internal Navigation */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", marginBottom: "2rem" }}>
        {["kuesioner", "wawancara", "analisis"].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: "0.75rem 1.5rem", 
              borderBottom: activeTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === tab ? "var(--text-main)" : "var(--text-muted)",
              fontWeight: activeTab === tab ? 600 : 500,
              textTransform: "capitalize",
              background: "transparent", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer"
            }}
          >
            {tab === "kuesioner" ? "Skripzy Forms" : tab === "wawancara" ? "Transkrip Wawancara" : "Hasil & Analisis"}
          </button>
        ))}
      </div>

      {/* Tab: Kuesioner */}
      {activeTab === "kuesioner" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-panel p-8 flex flex-col items-start gap-4">
            <div style={{ padding: "1rem", backgroundColor: "rgba(79, 70, 229, 0.1)", borderRadius: "12px", color: "var(--primary)" }}>
              <PremiumIcon name="layoutTemplate" size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Buat Skripzy Form Baru</h3>
            <p className="text-muted text-sm" style={{ margin: 0, lineHeight: 1.5 }}>
              Desain kuesioner dengan variabel yang terstruktur. Form ini dapat dibagikan dengan link publik dan respon akan langsung tercatat di sini.
            </p>
            <button className="btn btn-primary mt-2" onClick={() => setShowFormBuilder(true)}>
              <PremiumIcon name="plus" size={18} /> Rancang Form
            </button>
          </div>

          <div className="glass-panel p-8 flex flex-col items-start gap-4" style={{ opacity: 0.7 }}>
            <div style={{ padding: "1rem", backgroundColor: "var(--surface-hover)", borderRadius: "12px", color: "var(--text-muted)" }}>
              <PremiumIcon name="database" size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Hubungkan Google Form</h3>
            <p className="text-muted text-sm" style={{ margin: 0, lineHeight: 1.5 }}>
              Punya form yang sudah disebar di Google Forms? Import data respon Anda dalam format CSV untuk diuji validitasnya.
            </p>
            <button className="btn btn-outline mt-2 disabled:opacity-50" disabled>
              Segera Hadir
            </button>
          </div>
        </div>
      )}

      {/* Tab: Wawancara */}
      {activeTab === "wawancara" && (
        <div className="glass-panel p-8" style={{ textAlign: "center", minHeight: "400px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <PremiumIcon name="mic" size={48} className="text-muted mb-4 opacity-50" />
          <h3 style={{ fontSize: "1.5rem", margin: "0 0 1rem 0" }}>Transkrip Wawancara Kualitatif</h3>
          <p className="text-muted max-w-lg mb-6">
            Ketik hasil catatan lapangan/wawancara mendalam di sini, dan AI akan membantu merangkum narasi tematik untuk Anda letakkan di Bab IV.
          </p>
          <button className="btn btn-primary" onClick={() => alert("Fitur Editor Wawancara akan disediakan. Saat ini Anda dapat menaruh rangkuman secara manual di Laci Referensi.")}>
            + Tambah Transkrip Baru
          </button>
        </div>
      )}

      {/* Tab: Analisis */}
      {activeTab === "analisis" && (
        <div style={{ minHeight: "500px" }}>
          <DataAnalysisDashboard workspaceId={workspaceId} />
        </div>
      )}

      {/* Full Form Builder Modal */}
      {showFormBuilder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "var(--background)", overflowY: "auto" }}>
          <FormBuilder workspaceId={workspaceId} onClose={() => setShowFormBuilder(false)} />
        </div>
      )}

    </div>
  );
}
