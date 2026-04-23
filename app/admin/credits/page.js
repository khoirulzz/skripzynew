"use client";

import { useEffect, useState, useCallback } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import {
  subscribeToTopups,
  approveTopup,
  rejectTopup,
  editUserCredits,
  getTopupStats,
} from "@/lib/adminCredits";

const STATUS_COLORS = {
  pending: { bg: "rgba(234,179,8,0.12)", color: "#eab308", label: "Pending" },
  approved: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Disetujui" },
  rejected: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Ditolak" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.25rem 0.75rem",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: 600,
        backgroundColor: s.bg,
        color: s.color,
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: s.color,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    warning: { bg: "rgba(234,179,8,0.1)", text: "#eab308" },
    success: { bg: "rgba(34,197,94,0.1)", text: "#22c55e" },
    danger: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
    primary: { bg: "rgba(139,92,246,0.1)", text: "var(--primary)" },
  };
  const c = colors[color] || colors.primary;
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: c.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: c.text,
          flexShrink: 0,
        }}
      >
        <PremiumIcon name={icon} size={22} />
      </div>
      <div>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>{label}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1.4rem" }}>{value}</p>
      </div>
    </div>
  );
}

// Modal Edit Kredit User
function EditCreditsModal({ user, onClose, onSave }) {
  const [credits, setCredits] = useState(user?.credits ?? 0);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(user.userId, Number(credits));
      onClose();
    } catch (e) {
      alert("Gagal mengubah kredit: " + e.message);
    } finally {
      setLoading(false);
    }
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
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "2rem",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Edit Kredit User</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem" }}>
            <PremiumIcon name="x" size={20} />
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          User: <strong style={{ color: "var(--text-main)" }}>{user?.userName || user?.userId}</strong>
        </p>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
          Jumlah Kredit Baru
        </label>
        <input
          type="number"
          min={0}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-hover)",
            color: "var(--text-main)",
            fontSize: "1rem",
            marginBottom: "1.5rem",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ flex: 1, padding: "0.75rem", borderRadius: 8 }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 8,
              backgroundColor: "var(--primary)",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Reject dengan alasan
function RejectModal({ topup, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(topup.id, reason);
      onClose();
    } catch (e) {
      alert("Gagal menolak: " + e.message);
    } finally {
      setLoading(false);
    }
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
      }}
    >
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "2rem",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#ef4444" }}>Tolak Top-up</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem" }}>
            <PremiumIcon name="x" size={20} />
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Tolak top-up <strong style={{ color: "var(--text-main)" }}>{topup.amount?.toLocaleString("id-ID")} kredit</strong> dari{" "}
          <strong style={{ color: "var(--text-main)" }}>{topup.userName || topup.userId}</strong>?
        </p>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
          Alasan Penolakan (opsional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Masukkan alasan penolakan..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface-hover)",
            color: "var(--text-main)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.75rem", borderRadius: 8 }}>
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 8,
              backgroundColor: "#ef4444",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Memproses..." : "Tolak Top-up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreditManagement() {
  const [topups, setTopups] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | approved | rejected
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const unsub = subscribeToTopups((data) => {
      setTopups(data);
      setLoading(false);
    });

    getTopupStats().then(setStats);

    return () => unsub();
  }, []);

  const handleApprove = async (topup) => {
    if (!confirm(`Approve top-up ${topup.amount?.toLocaleString("id-ID")} kredit untuk ${topup.userName || topup.userId}?`)) return;
    setActionLoading((prev) => ({ ...prev, [topup.id]: "approving" }));
    try {
      await approveTopup(topup.id, topup.userId, topup.amount);
      const newStats = await getTopupStats();
      setStats(newStats);
    } catch (e) {
      alert("Gagal approve: " + e.message);
    } finally {
      setActionLoading((prev) => ({ ...prev, [topup.id]: null }));
    }
  };

  const handleReject = async (topupId, reason) => {
    await rejectTopup(topupId, reason);
    const newStats = await getTopupStats();
    setStats(newStats);
  };

  const handleEditCredits = async (userId, newCredits) => {
    await editUserCredits(userId, newCredits);
  };

  const filtered = topups.filter((t) => {
    const matchStatus = filter === "all" || t.status === filter;
    const matchSearch =
      !search ||
      t.userName?.toLowerCase().includes(search.toLowerCase()) ||
      t.userId?.toLowerCase().includes(search.toLowerCase()) ||
      t.amount?.toString().includes(search);
    return matchStatus && matchSearch;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat data kredit...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
          Manajemen Kredit
        </h1>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
          Kelola permintaan top-up dan saldo kredit pengguna
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard icon="clock" label="Pending" value={stats.pending} color="warning" />
        <StatCard icon="checkCircle" label="Disetujui" value={stats.approved} color="success" />
        <StatCard icon="xCircle" label="Ditolak" value={stats.rejected} color="danger" />
        <StatCard icon="coins" label="Total Kredit Terdistribusi" value={stats.totalAmount.toLocaleString("id-ID")} color="primary" />
      </div>

      {/* Filter & Search */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 999,
                fontSize: "0.83rem",
                fontWeight: 600,
                border: "1.5px solid",
                cursor: "pointer",
                transition: "all 0.15s",
                borderColor: filter === f ? "var(--primary)" : "var(--border)",
                backgroundColor: filter === f ? "var(--primary)" : "transparent",
                color: filter === f ? "#fff" : "var(--text-muted)",
              }}
            >
              {f === "all" ? "Semua" : f === "pending" ? "Pending" : f === "approved" ? "Disetujui" : "Ditolak"}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <PremiumIcon
            name="search"
            size={16}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Cari user atau jumlah..."
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
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 120px 180px 160px",
            gap: "1rem",
            padding: "0.85rem 1.25rem",
            backgroundColor: "var(--surface-hover)",
            borderBottom: "1px solid var(--border)",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <span>User</span>
          <span>Waktu</span>
          <span>Jumlah</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Aksi</span>
        </div>

        {/* Table Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            <PremiumIcon name="inbox" size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Tidak ada data top-up</p>
          </div>
        ) : (
          filtered.map((topup) => (
            <div
              key={topup.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 120px 180px 160px",
                gap: "1rem",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* User */}
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{topup.userName || "Tanpa Nama"}</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{topup.userId}</p>
              </div>

              {/* Waktu */}
              <div style={{ fontSize: "0.83rem", color: "var(--text-muted)" }}>
                {formatDate(topup.timestamp)}
              </div>

              {/* Jumlah */}
              <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>
                +{topup.amount?.toLocaleString("id-ID")}
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400, marginLeft: 3 }}>kr</span>
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={topup.status} />
                {topup.status === "rejected" && topup.rejectedReason && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#ef4444", fontStyle: "italic" }}>
                    {topup.rejectedReason}
                  </p>
                )}
              </div>

              {/* Aksi */}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                {topup.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(topup)}
                      disabled={actionLoading[topup.id] === "approving"}
                      title="Approve"
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: 7,
                        border: "none",
                        backgroundColor: "rgba(34,197,94,0.15)",
                        color: "#22c55e",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        transition: "all 0.15s",
                      }}
                    >
                      <PremiumIcon name="check" size={14} />
                      {actionLoading[topup.id] === "approving" ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => setRejectTarget(topup)}
                      title="Reject"
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: 7,
                        border: "none",
                        backgroundColor: "rgba(239,68,68,0.12)",
                        color: "#ef4444",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        transition: "all 0.15s",
                      }}
                    >
                      <PremiumIcon name="x" size={14} />
                      Tolak
                    </button>
                  </>
                )}
                <button
                  onClick={() => setEditTarget(topup)}
                  title="Edit Kredit"
                  style={{
                    padding: "0.45rem",
                    borderRadius: 7,
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <PremiumIcon name="edit" size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {editTarget && (
        <EditCreditsModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditCredits}
        />
      )}
      {rejectTarget && (
        <RejectModal
          topup={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
