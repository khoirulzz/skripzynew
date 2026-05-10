"use client";

import { useEffect, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { 
  subscribeToPromos, 
  createPromo, 
  updatePromo, 
  deletePromo, 
  togglePromoActive,
  isPromoActive 
} from "@/lib/adminPromos";

const DEFAULT_FORM = {
  code: "",
  description: "",
  type: "percent", // percent | fixed
  discountValue: 0,
  validUntil: "",
  usageLimit: 0,
  isActive: true,
};

function PromoFormModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(
    item
      ? {
          code: item.code || "",
          description: item.description || "",
          type: item.type || "percent",
          discountValue: item.discountPercent || item.discountAmount || 0,
          validUntil: item.validUntil ? (item.validUntil.toDate ? item.validUntil.toDate().toISOString().split('T')[0] : new Date(item.validUntil).toISOString().split('T')[0]) : "",
          usageLimit: item.usageLimit || 0,
          isActive: item.isActive ?? true,
        }
      : DEFAULT_FORM
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.code.trim()) return alert("Kode promo harus diisi!");
    if (form.discountValue <= 0) return alert("Nilai diskon harus lebih dari 0!");
    
    setLoading(true);
    try {
      const data = {
        ...form,
        code: form.code.toUpperCase(),
        [form.type === "percent" ? "discountPercent" : "discountAmount"]: Number(form.discountValue),
      };
      
      // Clean up the object based on type
      if (form.type === "percent") delete data.discountAmount;
      else delete data.discountPercent;
      
      delete data.discountValue;

      if (item) {
        await onSave(item.id, data);
      } else {
        await onSave(null, data);
      }
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
          maxWidth: 500,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          margin: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              {item ? "Edit Promo" : "Buat Promo Baru"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {item ? "Perbarui detail kode promo" : "Tambahkan kode diskon baru ke sistem"}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem" }}>
            <PremiumIcon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Kode Promo *
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="CONTOH: RAMADAN2024"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Deskripsi
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Diskon spesial ramadan..."
              style={inputStyle}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Tipe Diskon
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                style={inputStyle}
              >
                <option value="percent">Persentase (%)</option>
                <option value="fixed">Nominal Tetap (Rp)</option>
              </select>
            </label>

            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Nilai Diskon
              <input
                type="number"
                min={0}
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Berlaku Hingga
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                style={inputStyle}
              />
            </label>

            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Batas Penggunaan (0 = Unlimited)
              <input
                type="number"
                min={0}
                value={form.usageLimit}
                onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label htmlFor="isActive" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", color: "var(--text-main)" }}>
              Aktifkan Kode Promo
            </label>
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
            {loading ? "Memproses..." : item ? "Simpan Perubahan" : "Buat Promo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromoCard({ promo, onEdit, onDelete, onToggle }) {
  const active = isPromoActive(promo);
  const expiryDate = promo.validUntil ? (promo.validUntil.toDate ? promo.validUntil.toDate() : new Date(promo.validUntil)) : null;
  const isExpired = expiryDate && expiryDate < new Date();
  const isLimitReached = promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit;

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative",
        opacity: active ? 1 : 0.7,
        transition: "all 0.2s",
        color: "var(--text-main)",
      }}
    >
      {/* Status Badge */}
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <span
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: 99,
            fontSize: "0.65rem",
            fontWeight: 800,
            textTransform: "uppercase",
            backgroundColor: active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: active ? "#22c55e" : "#ef4444",
          }}
        >
          {active ? "Aktif" : isExpired ? "Expired" : isLimitReached ? "Limit" : "Non-aktif"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: "rgba(139,92,246,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
          }}
        >
          <PremiumIcon name="ticket" size={22} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>{promo.code}</h3>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{promo.description || "Tidak ada deskripsi"}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ padding: "0.5rem", backgroundColor: "var(--surface-hover)", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Diskon</p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: "1rem" }}>
            {promo.type === "percent" ? `${promo.discountPercent}%` : `Rp ${promo.discountAmount?.toLocaleString("id-ID")}`}
          </p>
        </div>
        <div style={{ padding: "0.5rem", backgroundColor: "var(--surface-hover)", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Terpakai</p>
          <p style={{ margin: 0, fontWeight: 800, fontSize: "1rem" }}>
            {promo.usedCount || 0}
            {promo.usageLimit > 0 ? <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}> / {promo.usageLimit}</span> : ""}
          </p>
        </div>
      </div>

      {promo.validUntil && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: isExpired ? "#ef4444" : "var(--text-muted)" }}>
          <PremiumIcon name="calendar" size={14} />
          <span>Berlaku hingga: {expiryDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.5rem" }}>
        <button
          onClick={() => onEdit(promo)}
          style={{
            flex: 1,
            padding: "0.5rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.3rem",
          }}
        >
          <PremiumIcon name="edit" size={14} />
          Edit
        </button>
        <button
          onClick={() => onToggle(promo.id, !promo.isActive)}
          style={{
            flex: 1,
            padding: "0.5rem",
            borderRadius: 8,
            border: "none",
            backgroundColor: promo.isActive ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            color: promo.isActive ? "#ef4444" : "#22c55e",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.3rem",
          }}
        >
          <PremiumIcon name={promo.isActive ? "pause" : "play"} size={14} />
          {promo.isActive ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => { if(confirm(`Hapus promo ${promo.code}?`)) onDelete(promo.id) }}
          style={{
            padding: "0.5rem",
            borderRadius: 8,
            border: "none",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            cursor: "pointer",
          }}
        >
          <PremiumIcon name="trash2" size={14} />
        </button>
      </div>
    </div>
  );
}

export default function PromoManagement() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeToPromos((data) => {
      setPromos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (id, data) => {
    if (id) {
      await updatePromo(id, data);
    } else {
      await createPromo(data);
    }
  };

  const handleToggle = async (id, status) => {
    try {
      await togglePromoActive(id, status);
    } catch (e) {
      alert("Gagal mengubah status: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePromo(id);
    } catch (e) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  const filtered = promos.filter(p => p.code?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat data promo...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
            Manajemen Promo
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
            Kelola kode diskon dan kampanye promosi
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
          }}
        >
          <PremiumIcon name="plus" size={18} />
          Buat Promo
        </button>
      </div>

      {/* Stats Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Total Promo</p>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)" }}>{promos.length}</p>
        </div>
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Promo Aktif</p>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "#22c55e" }}>{promos.filter(isPromoActive).length}</p>
        </div>
        <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Total Penggunaan</p>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--primary)" }}>
            {promos.reduce((acc, p) => acc + (p.usedCount || 0), 0)}
          </p>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "1.5rem", maxWidth: 360 }}>
        <PremiumIcon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Cari kode promo..."
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

      {filtered.length === 0 ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)", border: "2px dashed var(--border)", borderRadius: 14 }}>
          <PremiumIcon name="gift" size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Belum ada kode promo ditemukan</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {filtered.map(promo => (
            <PromoCard 
              key={promo.id} 
              promo={promo} 
              onEdit={(p) => { setEditTarget(p); setShowModal(true); }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PromoFormModal
          item={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
