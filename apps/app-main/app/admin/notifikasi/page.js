"use client";

import { useEffect, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { d1Request } from "@/lib/d1Client";

const DEFAULT_FORM = {
  type: "global",
  title: "",
  message: "",
  userId: "",
  actionUrl: "",
};

function NotificationFormModal({ onClose, onSave }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return alert("Judul notifikasi harus diisi!");
    if (!form.message.trim()) return alert("Pesan notifikasi harus diisi!");
    if (form.type !== "global" && !form.userId.trim()) {
      return alert("User ID wajib diisi untuk notifikasi privat!");
    }
    
    setLoading(true);
    try {
      const data = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: form.title,
        message: form.message,
        type: form.type,
        actionUrl: form.actionUrl || null,
        userId: form.type === "global" ? null : form.userId,
        isRead: 0,
      };
      
      await onSave(data);
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
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Buat Notifikasi Baru</h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Kirim notifikasi ke semua pengguna atau spesifik
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem" }}>
            <PremiumIcon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Tipe Notifikasi
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              style={inputStyle}
            >
              <option value="global">Global (Semua Pengguna)</option>
              <option value="chat">Private Chat / Info Khusus</option>
              <option value="system">Sistem</option>
            </select>
          </label>

          {form.type !== "global" && (
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              User ID Penerima *
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                placeholder="ID Pengguna..."
                style={inputStyle}
              />
            </label>
          )}

          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Judul Notifikasi *
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Promo Spesial..."
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            Isi Pesan *
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Deskripsi notifikasi..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
            URL Tujuan (Opsional)
            <input
              type="text"
              value={form.actionUrl}
              onChange={(e) => setForm((f) => ({ ...f, actionUrl: e.target.value }))}
              placeholder="/dashboard/langganan"
              style={inputStyle}
            />
          </label>
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
            {loading ? "Memproses..." : "Kirim Notifikasi"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notif, onDelete }) {
  const isGlobal = !notif.userId;

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        position: "relative",
        color: "var(--text-main)",
      }}
    >
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <span
          style={{
            padding: "0.25rem 0.6rem",
            borderRadius: 99,
            fontSize: "0.65rem",
            fontWeight: 800,
            textTransform: "uppercase",
            backgroundColor: isGlobal ? "rgba(34,197,94,0.12)" : "rgba(139,92,246,0.12)",
            color: isGlobal ? "#22c55e" : "#8b5cf6",
          }}
        >
          {isGlobal ? "Global" : "Private"}
        </span>
      </div>

      <div>
        <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 700 }}>{notif.title}</h3>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
          {notif.message}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>Tipe:</span> {notif.type}
        </div>
        {!isGlobal && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: 600 }}>User ID:</span> {notif.userId}
          </div>
        )}
        {notif.actionUrl && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <span style={{ fontWeight: 600 }}>URL:</span> {notif.actionUrl}
          </div>
        )}
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>Tanggal:</span> {new Date(notif.createdAt).toLocaleString("id-ID")}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => { if(confirm(`Hapus notifikasi ini?`)) onDelete(notif.id) }}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: 8,
            border: "none",
            backgroundColor: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            fontSize: "0.8rem",
            fontWeight: 600
          }}
        >
          <PremiumIcon name="trash2" size={14} />
          Hapus Notifikasi
        </button>
      </div>
    </div>
  );
}

export default function NotificationManagement() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const fetchNotifications = async () => {
    try {
      const res = await d1Request("notifications");
      // Sort newest first
      const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(sorted);
    } catch (error) {
      console.error("Gagal memuat notifikasi", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreate = async (data) => {
    try {
      await d1Request("notifications", {
        method: "POST",
        body: data
      });
      fetchNotifications();
    } catch (e) {
      alert("Gagal menambahkan notifikasi: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await d1Request("notifications", {
        method: "DELETE",
        id
      });
      fetchNotifications();
    } catch (e) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  const filtered = notifications.filter(n => 
    n.title?.toLowerCase().includes(search.toLowerCase()) || 
    n.message?.toLowerCase().includes(search.toLowerCase()) ||
    (n.userId && n.userId.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat data notifikasi...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
            Manajemen Notifikasi
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
            Kelola pengumuman global dan pesan privat pengguna
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
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
          Buat Notifikasi
        </button>
      </div>

      <div style={{ position: "relative", marginBottom: "1.5rem", maxWidth: 360 }}>
        <PremiumIcon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Cari judul, pesan, atau User ID..."
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
          <PremiumIcon name="bell" size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Belum ada notifikasi ditemukan</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {filtered.map(notif => (
            <NotificationCard 
              key={notif.id} 
              notif={notif} 
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NotificationFormModal
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
