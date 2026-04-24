"use client";

import { useEffect, useMemo, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import {
  subscribeToPricing,
  addPricing,
  updatePricing,
  deletePricing,
  upsertPricing,
} from "@/lib/adminPricing";
import {
  buildBillingCatalog,
  DEFAULT_TOOL_PRICING,
  formatRupiah,
  getPlanDisplayName,
  getTotalCreditsFromTopup,
} from "@/lib/billing";

const DEFAULT_MODAL = {
  type: null,
  item: null,
};

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inputStyle() {
  return {
    width: "100%",
    padding: "0.7rem 0.95rem",
    borderRadius: 10,
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface-hover)",
    color: "var(--text-main)",
    fontSize: "0.9rem",
    boxSizing: "border-box",
    fontFamily: "inherit",
    marginTop: "0.35rem",
  };
}

function sectionCardStyle(activeColor) {
  return {
    backgroundColor: "var(--surface)",
    border: `1px solid ${activeColor || "var(--border)"}`,
    borderRadius: 18,
    padding: "1.25rem",
    boxShadow: "var(--shadow-sm)",
  };
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: "rgba(2,6,23,0.58)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          boxShadow: "0 28px 80px rgba(15,23,42,0.22)",
          padding: "1.6rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>{title}</h3>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.84rem", color: "var(--text-muted)" }}>
              {subtitle}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.45rem" }}>
            <PremiumIcon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PlanPriceModal({ item, onClose, onSave }) {
  const [price, setPrice] = useState(item?.price ?? 0);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(item.planId, numberValue(price));
      onClose();
    } catch (error) {
      alert(`Gagal menyimpan harga plan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={`Edit Harga ${item?.name}`}
      subtitle="Plan selalu tetap tiga slot: Free, Pro, dan Plus."
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            padding: "1rem",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${item?.glow || "rgba(79,70,229,0.08)"}, transparent)`,
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Plan Terkunci
          </p>
          <p style={{ margin: "0.35rem 0 0", fontWeight: 700 }}>{item?.description}</p>
        </div>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Harga Bulanan
          <input
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            style={inputStyle()}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.8rem" }}>
          Batal
        </button>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: "0.8rem" }}>
          {loading ? "Menyimpan..." : "Simpan Harga"}
        </button>
      </div>
    </ModalShell>
  );
}

function TopupModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    amount: item?.amount ?? 0,
    bonusCredits: item?.bonusCredits ?? 0,
    price: item?.price ?? 0,
    badgeText: item?.badgeText || "",
    popular: Boolean(item?.popular),
    accent: item?.accent || "#10B981",
  });
  const [loading, setLoading] = useState(false);

  const saveField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Nama paket kredit wajib diisi.");
      return;
    }
    if (numberValue(form.amount) <= 0) {
      alert("Jumlah kredit utama harus lebih dari 0.");
      return;
    }

    setLoading(true);
    try {
      await onSave(item?.pricingId, form);
      onClose();
    } catch (error) {
      alert(`Gagal menyimpan paket kredit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={item ? "Edit Paket Kredit" : "Tambah Paket Kredit"}
      subtitle="Paket kredit akan langsung ikut muncul atau hilang di halaman langganan user."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Nama Paket
          <input
            type="text"
            value={form.name}
            onChange={(event) => saveField("name", event.target.value)}
            placeholder="Contoh: Boost Pack"
            style={inputStyle()}
          />
        </label>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Deskripsi Singkat
          <input
            type="text"
            value={form.description}
            onChange={(event) => saveField("description", event.target.value)}
            placeholder="Deskripsi ringkas untuk user"
            style={inputStyle()}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
            Kredit Utama
            <input
              type="number"
              min={1}
              value={form.amount}
              onChange={(event) => saveField("amount", event.target.value)}
              style={inputStyle()}
            />
          </label>

          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
            Bonus Kredit
            <input
              type="number"
              min={0}
              value={form.bonusCredits}
              onChange={(event) => saveField("bonusCredits", event.target.value)}
              style={inputStyle()}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
            Harga Paket
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(event) => saveField("price", event.target.value)}
              style={inputStyle()}
            />
          </label>

          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
            Badge Kecil
            <input
              type="text"
              value={form.badgeText}
              onChange={(event) => saveField("badgeText", event.target.value)}
              placeholder="Contoh: Best Value"
              style={inputStyle()}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
            Warna Aksen
            <input
              type="text"
              value={form.accent}
              onChange={(event) => saveField("accent", event.target.value)}
              placeholder="#10B981"
              style={inputStyle()}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.86rem", fontWeight: 700, marginTop: "1.9rem" }}>
            <input
              type="checkbox"
              checked={form.popular}
              onChange={(event) => saveField("popular", event.target.checked)}
            />
            Tampilkan sebagai paket unggulan
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.8rem" }}>
          Batal
        </button>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: "0.8rem" }}>
          {loading ? "Menyimpan..." : item ? "Simpan Paket" : "Tambah Paket"}
        </button>
      </div>
    </ModalShell>
  );
}

function ToolModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    slug: item?.slug || "",
    toolName: item?.title || item?.toolName || "",
    description: item?.description || "",
    creditCost: item?.creditCost ?? 0,
  });
  const [loading, setLoading] = useState(false);

  const saveField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.slug.trim()) {
      alert("Slug tool wajib diisi.");
      return;
    }
    if (!form.toolName.trim()) {
      alert("Nama tool wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      await onSave(item?.pricingId, form);
      onClose();
    } catch (error) {
      alert(`Gagal menyimpan biaya tool: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={item ? "Edit Biaya Tool" : "Tambah Tool Pricing"}
      subtitle="Gunakan slug yang benar agar biaya tool langsung terhubung ke halaman user."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Slug Tool
          <input
            type="text"
            value={form.slug}
            onChange={(event) => saveField("slug", event.target.value)}
            placeholder="contoh: parafrase"
            style={inputStyle()}
          />
        </label>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Nama Tool
          <input
            type="text"
            value={form.toolName}
            onChange={(event) => saveField("toolName", event.target.value)}
            placeholder="contoh: Parafrase"
            style={inputStyle()}
          />
        </label>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Deskripsi
          <input
            type="text"
            value={form.description}
            onChange={(event) => saveField("description", event.target.value)}
            placeholder="Opsional"
            style={inputStyle()}
          />
        </label>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Biaya Kredit
          <input
            type="number"
            min={0}
            value={form.creditCost}
            onChange={(event) => saveField("creditCost", event.target.value)}
            style={inputStyle()}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.8rem" }}>
          Batal
        </button>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: "0.8rem" }}>
          {loading ? "Menyimpan..." : item ? "Simpan Biaya" : "Tambah Tool"}
        </button>
      </div>
    </ModalShell>
  );
}

function PlanCard({ item, onEdit }) {
  return (
    <div
      style={{
        ...sectionCardStyle(item.popular ? item.accent : "var(--border)"),
        background: `linear-gradient(180deg, ${item.glow}, transparent 60%)`,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        minHeight: 280,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.73rem", color: item.accent, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>
            {item.label}
          </p>
          <h3 style={{ margin: "0.35rem 0 0", fontSize: "1.28rem", fontWeight: 800 }}>{item.name}</h3>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.84rem", color: "var(--text-muted)" }}>{item.description}</p>
        </div>
        {item.popular && (
          <span
            style={{
              padding: "0.32rem 0.7rem",
              borderRadius: 999,
              backgroundColor: item.accent,
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Populer
          </span>
        )}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Rp</span>
          <span style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>{numberValue(item.price).toLocaleString("id-ID")}</span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/bulan</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", flex: 1 }}>
        {item.features.map((feature) => (
          <div key={feature} style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
            <PremiumIcon name="checkCircle" size={16} style={{ color: item.accent, marginTop: "2px", flexShrink: 0 }} />
            <span style={{ fontSize: "0.84rem", lineHeight: 1.45 }}>{feature}</span>
          </div>
        ))}
      </div>

      <button onClick={() => onEdit(item)} className="btn btn-primary" style={{ width: "100%", padding: "0.8rem", backgroundColor: item.accent }}>
        <PremiumIcon name="edit" size={16} />
        Edit Harga
      </button>
    </div>
  );
}

function TopupCard({ item, onEdit, onDelete }) {
  return (
    <div
      style={{
        ...sectionCardStyle(item.popular ? item.accent : "var(--border)"),
        display: "flex",
        flexDirection: "column",
        gap: "0.95rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${item.accent}18, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800 }}>{item.name}</h3>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>{item.description}</p>
        </div>
        {item.badgeText && (
          <span
            style={{
              alignSelf: "flex-start",
              padding: "0.28rem 0.7rem",
              borderRadius: 999,
              backgroundColor: item.accent,
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: 800,
            }}
          >
            {item.badgeText}
          </span>
        )}
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
        <div style={{ padding: "0.9rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
            Total Kredit
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "1.55rem", fontWeight: 900 }}>
            {getTotalCreditsFromTopup(item).toLocaleString("id-ID")}
          </p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {item.amount.toLocaleString("id-ID")} utama{item.bonusCredits > 0 ? ` + ${item.bonusCredits.toLocaleString("id-ID")} bonus` : ""}
          </p>
        </div>
        <div style={{ padding: "0.9rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
            Harga
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "1.25rem", fontWeight: 900 }}>
            {formatRupiah(item.price)}
          </p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: item.popular ? item.accent : "var(--text-muted)", fontWeight: item.popular ? 700 : 500 }}>
            {item.popular ? "Paket unggulan" : "Paket reguler"}
          </p>
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", gap: "0.6rem", marginTop: "auto" }}>
        <button onClick={() => onEdit(item)} className="btn btn-outline" style={{ flex: 1, padding: "0.72rem" }}>
          <PremiumIcon name="edit" size={14} />
          Edit
        </button>
        <button
          onClick={() => onDelete(item.pricingId, item.name)}
          className="btn"
          style={{
            padding: "0.72rem 0.95rem",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#EF4444",
            border: "1px solid rgba(239,68,68,0.18)",
          }}
        >
          <PremiumIcon name="trash2" size={14} />
        </button>
      </div>
    </div>
  );
}

function ToolCard({ item, onEdit, onDelete, isDefault }) {
  const hasRemoteOverride = Boolean(item.pricingId);

  return (
    <div
      style={{
        ...sectionCardStyle(hasRemoteOverride ? "rgba(79,70,229,0.25)" : "var(--border)"),
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{item.title}</h3>
          <p style={{ margin: "0.32rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.slug}</p>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            padding: "0.28rem 0.7rem",
            borderRadius: 999,
            backgroundColor: hasRemoteOverride ? "rgba(79,70,229,0.12)" : "rgba(100,116,139,0.12)",
            color: hasRemoteOverride ? "var(--primary)" : "#64748B",
            fontSize: "0.68rem",
            fontWeight: 800,
          }}
        >
          {hasRemoteOverride ? "Override" : "Default"}
        </span>
      </div>

      <div
        style={{
          padding: "0.95rem",
          borderRadius: 14,
          backgroundColor: "var(--surface-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
            Biaya Kredit
          </p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "1.35rem", fontWeight: 900 }}>{item.creditCost}</p>
        </div>
        <PremiumIcon name="zap" size={20} style={{ color: "var(--primary)" }} />
      </div>

      <div style={{ display: "flex", gap: "0.55rem" }}>
        <button onClick={() => onEdit(item)} className="btn btn-outline" style={{ flex: 1, padding: "0.72rem" }}>
          <PremiumIcon name="edit" size={14} />
          Edit
        </button>
        {(hasRemoteOverride || !isDefault) && (
          <button
            onClick={() => onDelete(item.pricingId, item.title)}
            className="btn"
            style={{
              padding: "0.72rem 0.95rem",
              backgroundColor: "rgba(239,68,68,0.1)",
              color: "#EF4444",
              border: "1px solid rgba(239,68,68,0.18)",
            }}
            title={isDefault ? "Reset ke default" : "Hapus"}
          >
            <PremiumIcon name={isDefault ? "xCircle" : "trash2"} size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PricingManagement() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(DEFAULT_MODAL);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToPricing((items) => {
      setPricing(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const catalog = useMemo(() => buildBillingCatalog(pricing), [pricing]);
  const lowerSearch = search.trim().toLowerCase();

  const filteredTopups = useMemo(() => {
    return catalog.topups.filter((item) => {
      if (!lowerSearch) return true;
      return [item.name, item.description, item.badgeText]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(lowerSearch));
    });
  }, [catalog.topups, lowerSearch]);

  const filteredTools = useMemo(() => {
    return catalog.tools.filter((item) => {
      if (!lowerSearch) return true;
      return [item.title, item.slug, item.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(lowerSearch));
    });
  }, [catalog.tools, lowerSearch]);

  const counts = {
    plans: catalog.plans.length,
    topups: catalog.topups.length,
    tools: catalog.tools.length,
  };

  const openModal = (type, item = null) => setModal({ type, item });
  const closeModal = () => setModal(DEFAULT_MODAL);

  const savePlan = async (planId, price) => {
    const currentPlan = catalog.planMap[planId];
    await upsertPricing(`plan-${planId}`, {
      category: "plan",
      planId,
      toolName: getPlanDisplayName(planId),
      description: currentPlan?.description || "",
      price: numberValue(price),
      popular: currentPlan?.popular || false,
      features: currentPlan?.features || [],
    });
  };

  const saveTopup = async (pricingId, form) => {
    const payload = {
      category: "topup",
      toolName: form.name.trim(),
      description: form.description.trim(),
      amount: numberValue(form.amount),
      bonusCredits: numberValue(form.bonusCredits),
      price: numberValue(form.price),
      badgeText: form.badgeText.trim() || null,
      popular: Boolean(form.popular),
      accent: form.accent.trim() || "#10B981",
    };

    if (pricingId) {
      await updatePricing(pricingId, payload);
      return;
    }

    await addPricing(payload);
  };

  const saveTool = async (pricingId, form) => {
    const safeSlug = form.slug.trim().toLowerCase();
    const payload = {
      category: "tool",
      slug: safeSlug,
      toolName: form.toolName.trim(),
      description: form.description.trim(),
      creditCost: numberValue(form.creditCost),
    };

    if (pricingId) {
      await updatePricing(pricingId, payload);
      return;
    }

    await upsertPricing(`tool-${safeSlug}`, payload);
  };

  const handleDelete = async (pricingId, label) => {
    if (!pricingId) return;
    if (!confirm(`Hapus konfigurasi "${label}"?`)) return;
    await deletePricing(pricingId);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={42} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Memuat konfigurasi billing...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>
            Manajemen Harga
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "0.4rem 0 0", fontSize: "0.95rem" }}>
            Satu pusat kontrol untuk plan, paket kredit, dan biaya tool yang tampil di halaman user.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => openModal("topup")} className="btn btn-primary" style={{ padding: "0.75rem 1rem" }}>
            <PremiumIcon name="plus" size={16} />
            Tambah Paket Kredit
          </button>
          <button onClick={() => openModal("tool")} className="btn btn-outline" style={{ padding: "0.75rem 1rem" }}>
            <PremiumIcon name="zap" size={16} />
            Tambah Tool Pricing
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Plan Tetap", value: counts.plans, color: "#4F46E5", bg: "rgba(79,70,229,0.1)" },
          { label: "Paket Kredit", value: counts.topups, color: "#10B981", bg: "rgba(16,185,129,0.1)" },
          { label: "Tool Terhubung", value: counts.tools, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
        ].map((item) => (
          <div key={item.label} style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "1rem 1.1rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.8rem" }}>
              <PremiumIcon name={item.label === "Plan Tetap" ? "tag" : item.label === "Paket Kredit" ? "coins" : "zap"} size={18} />
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.label}</p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "1.8rem", fontWeight: 900, color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ position: "relative", maxWidth: 420, marginBottom: "2rem" }}>
        <PremiumIcon name="search" size={16} style={{ position: "absolute", top: "50%", left: 14, transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari paket kredit atau tool pricing..."
          style={{ ...inputStyle(), marginTop: 0, paddingLeft: "2.7rem" }}
        />
      </div>

      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Plan Langganan</h2>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Tiga plan ini selalu tetap muncul di halaman user. Admin hanya mengubah harga, bukan menambah atau menghapus slot plan.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          {catalog.plans.map((item) => (
            <PlanCard key={item.planId} item={item} onEdit={(selected) => openModal("plan", selected)} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Paket Kredit Dinamis</h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Tambah, ubah, atau hapus kartu kredit. Halaman langganan user akan mengikuti realtime.
            </p>
          </div>
          <button onClick={() => openModal("topup")} className="btn btn-primary">
            <PremiumIcon name="plus" size={16} />
            Paket Baru
          </button>
        </div>

        {filteredTopups.length === 0 ? (
          <div style={{ backgroundColor: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 18, padding: "3rem", textAlign: "center" }}>
            <PremiumIcon name="coins" size={32} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Belum ada paket kredit ditemukan.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
            {filteredTopups.map((item) => (
              <TopupCard key={item.slug} item={item} onEdit={(selected) => openModal("topup", selected)} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Biaya Tool Terhubung</h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Perubahan biaya tool langsung dipakai di kartu dashboard user dan halaman tool yang sudah terhubung.
            </p>
          </div>
          <button onClick={() => openModal("tool")} className="btn btn-outline">
            <PremiumIcon name="plus" size={16} />
            Tambah Tool
          </button>
        </div>

        {filteredTools.length === 0 ? (
          <div style={{ backgroundColor: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 18, padding: "3rem", textAlign: "center" }}>
            <PremiumIcon name="zap" size={32} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
            <p style={{ margin: 0, fontWeight: 700 }}>Tidak ada tool pricing yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {filteredTools.map((item) => (
              <ToolCard
                key={item.slug}
                item={item}
                onEdit={(selected) => openModal("tool", selected)}
                onDelete={handleDelete}
                isDefault={DEFAULT_TOOL_PRICING.some((tool) => tool.slug === item.slug)}
              />
            ))}
          </div>
        )}
      </section>

      {modal.type === "plan" && (
        <PlanPriceModal item={modal.item} onClose={closeModal} onSave={savePlan} />
      )}
      {modal.type === "topup" && (
        <TopupModal item={modal.item} onClose={closeModal} onSave={saveTopup} />
      )}
      {modal.type === "tool" && (
        <ToolModal item={modal.item} onClose={closeModal} onSave={saveTool} />
      )}
    </div>
  );
}
