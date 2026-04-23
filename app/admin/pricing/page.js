"use client";

import { useEffect, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { subscribeToPricing, addPricing, updatePricing, deletePricing } from "@/lib/adminPricing";

const CATEGORIES = ["tool", "plan", "topup"];

const CATEGORY_COLORS = {
  tool: { bg: "rgba(6,182,212,0.12)", color: "#06b6d4", label: "Tool" },
  plan: { bg: "rgba(139,92,246,0.12)", color: "#8b5cf6", label: "Plan" },
  topup: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Top-up" },
};

const DEFAULT_FORM = {
  toolName: "",
  description: "",
  category: "tool",
  creditCost: 0,
  planPrices: { free: 0, pro: 0, plus: 0 },
};

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.tool;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.65rem",
        borderRadius: 999,
        fontSize: "0.73rem",
        fontWeight: 700,
        backgroundColor: c.bg,
        color: c.color,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {c.label}
    </span>
  );
}

function PricingFormModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          toolName: item.toolName || "",
          description: item.description || "",
          category: item.category || "tool",
          creditCost: item.creditCost ?? 0,
          planPrices: {
            free: item.planPrices?.free ?? 0,
            pro: item.planPrices?.pro ?? 0,
            plus: item.planPrices?.plus ?? 0,
          },
        }
      : { ...DEFAULT_FORM, planPrices: { free: 0, pro: 0, plus: 0 } }
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.toolName.trim()) return alert("Nama harus diisi!");
    setLoading(true);
    try {
      await onSave(item?.id, {
        ...form,
        creditCost: Number(form.creditCost),
        planPrices: {
          free: Number(form.planPrices.free),
          pro: Number(form.planPrices.pro),
          plus: Number(form.planPrices.plus),
        },
      });
      onClose();
    } catch (e) {
      alert("Gagal menyimpan: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.65rem 0.9rem",
    borderRadius: 8,
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface-hover)",
    color: "var(--text-main)",
    fontSize: "0.9rem",
    boxSizing: "border-box",
    fontFamily: "inherit",
    marginTop: "0.35rem",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "2rem",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          margin: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              {item ? "Edit Harga" : "Tambah Harga Baru"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {item ? "Perbarui konfigurasi harga" : "Tambahkan item harga baru ke sistem"}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem" }}>
            <PremiumIcon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Nama */}
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Nama Tool / Paket *
            <input
              type="text"
              value={form.toolName}
              onChange={(e) => setForm((f) => ({ ...f, toolName: e.target.value }))}
              placeholder="contoh: Parafrase, Plan Pro, Top-up 500"
              style={inputStyle}
            />
          </label>

          {/* Deskripsi */}
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Deskripsi
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi singkat..."
              style={inputStyle}
            />
          </label>

          {/* Kategori */}
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Kategori
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              style={inputStyle}
            >
              <option value="tool">Tool (per penggunaan)</option>
              <option value="plan">Plan (langganan)</option>
              <option value="topup">Top-up Kredit</option>
            </select>
          </label>

          {/* Credit Cost */}
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Biaya Kredit (per penggunaan)
            <input
              type="number"
              min={0}
              value={form.creditCost}
              onChange={(e) => setForm((f) => ({ ...f, creditCost: e.target.value }))}
              style={inputStyle}
            />
          </label>

          {/* Plan Prices */}
          <div>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Harga per Plan (Rp / bulan)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {["free", "pro", "plus"].map((plan) => (
                <label key={plan} style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  <input
                    type="number"
                    min={0}
                    value={form.planPrices[plan]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        planPrices: { ...f.planPrices, [plan]: e.target.value },
                      }))
                    }
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem" }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.75rem", borderRadius: 8 }}>
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              flex: 2,
              padding: "0.75rem",
              borderRadius: 8,
              backgroundColor: "var(--primary)",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontSize: "0.9rem",
            }}
          >
            {loading ? "Menyimpan..." : item ? "Simpan Perubahan" : "Tambah Harga"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PricingCard({ item, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Hapus harga "${item.toolName}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch (e) {
      alert("Gagal hapus: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        transition: "box-shadow 0.2s, transform 0.2s",
        position: "relative",
        overflow: "hidden",
        color: "var(--text-main)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: CATEGORY_COLORS[item.category]?.color || "var(--primary)",
          borderRadius: "14px 14px 0 0",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, marginBottom: "0.3rem" }}>{item.toolName}</h3>
          {item.description && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.description}</p>
          )}
        </div>
        <CategoryBadge category={item.category} />
      </div>

      {/* Credit Cost */}
      <div
        style={{
          padding: "0.6rem 1rem",
          backgroundColor: "rgba(139,92,246,0.08)",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Biaya Kredit</span>
        <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>
          {item.creditCost?.toLocaleString("id-ID") || 0}
          <span style={{ fontSize: "0.7rem", marginLeft: 4, color: "var(--text-muted)", fontWeight: 400 }}>kredit</span>
        </span>
      </div>

      {/* Plan Prices */}
      {item.planPrices && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          {["free", "pro", "plus"].map((plan) => (
            <div
              key={plan}
              style={{
                textAlign: "center",
                padding: "0.5rem",
                backgroundColor: "var(--surface-hover)",
                borderRadius: 8,
              }}
            >
              <p style={{ margin: "0 0 0.2rem 0", fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                {plan}
              </p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>
                {item.planPrices[plan] === 0
                  ? "Gratis"
                  : `Rp ${Number(item.planPrices[plan]).toLocaleString("id-ID")}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
        <button
          onClick={() => onEdit(item)}
          style={{
            flex: 1,
            padding: "0.55rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          <PremiumIcon name="edit" size={14} />
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: "0.55rem 0.75rem",
            borderRadius: 8,
            border: "none",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            cursor: deleting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          <PremiumIcon name="trash2" size={14} />
        </button>
      </div>
    </div>
  );
}

export default function PricingManagement() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeToPricing((data) => {
      setPricing(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (id, data) => {
    if (id) {
      await updatePricing(id, data);
    } else {
      await addPricing(data);
    }
  };

  const handleEdit = (item) => {
    setEditTarget(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    await deletePricing(id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditTarget(null);
  };

  const filtered = pricing.filter((p) => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const matchSearch = !search || p.toolName?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat data harga...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
            Manajemen Harga
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
            Kelola harga kredit tools, plan berlangganan, dan paket top-up
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.7rem 1.25rem",
            borderRadius: 10,
            backgroundColor: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            flexShrink: 0,
          }}
        >
          <PremiumIcon name="plus" size={18} />
          Tambah Harga
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {["all", "tool", "plan", "topup"].map((cat) => {
          const count = cat === "all" ? pricing.length : pricing.filter((p) => p.category === cat).length;
          const labels = { all: "Semua Harga", tool: "Tools", plan: "Plan", topup: "Top-up" };
          const colors = { all: "#8b5cf6", tool: "#06b6d4", plan: "#8b5cf6", topup: "#22c55e" };
          return (
            <div
              key={cat}
              onClick={() => setCatFilter(cat)}
              style={{
                backgroundColor: "var(--surface)",
                border: `1.5px solid ${catFilter === cat ? colors[cat] : "var(--border)"}`,
                borderRadius: 12,
                padding: "1rem 1.25rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{labels[cat]}</p>
              <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: catFilter === cat ? colors[cat] : "var(--text-main)" }}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1.5rem", maxWidth: 360 }}>
        <PremiumIcon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Cari nama tool atau paket..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "0.6rem 1rem 0.6rem 2.5rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-hover)",
            color: "var(--text-main)",
            fontSize: "0.9rem",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "2px dashed var(--border)",
            borderRadius: 14,
            padding: "4rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <PremiumIcon name="tag" size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: 600, marginBottom: "0.5rem" }}>Belum ada data harga</p>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>Klik "Tambah Harga" untuk menambahkan item harga baru</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filtered.map((item) => (
            <PricingCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PricingFormModal
          item={editTarget}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
