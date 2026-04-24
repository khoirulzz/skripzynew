"use client";

import { useEffect, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import {
  subscribeToTopups,
  approveTopup,
  rejectTopup,
  editUserCredits,
  getTopupStats,
  getUserWithCredits,
} from "@/lib/adminCredits";
import { formatRupiah, getBillingRequestSummary } from "@/lib/billing";

const STATUS_COLORS = {
  pending: { bg: "rgba(245,158,11,0.12)", color: "#D97706", label: "Pending" },
  approved: { bg: "rgba(16,185,129,0.12)", color: "#059669", label: "Disetujui" },
  rejected: { bg: "rgba(239,68,68,0.12)", color: "#DC2626", label: "Ditolak" },
};

function StatusBadge({ status }) {
  const tone = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.28rem 0.75rem",
        borderRadius: 999,
        backgroundColor: tone.bg,
        color: tone.color,
        fontSize: "0.76rem",
        fontWeight: 800,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: tone.color }} />
      {tone.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const isPlan = type === "plan";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.25rem 0.65rem",
        borderRadius: 999,
        backgroundColor: isPlan ? "rgba(79,70,229,0.12)" : "rgba(16,185,129,0.12)",
        color: isPlan ? "var(--primary)" : "#059669",
        fontSize: "0.72rem",
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      {isPlan ? "Plan" : "Kredit"}
    </span>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "1.1rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.85rem",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${color}18`,
          color,
        }}
      >
        <PremiumIcon name={icon} size={20} />
      </div>
      <div>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.8rem" }}>{label}</p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "1.45rem", fontWeight: 900 }}>{value}</p>
      </div>
    </div>
  );
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
          maxWidth: 460,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: "1.5rem",
          boxShadow: "0 28px 80px rgba(15,23,42,0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800 }}>{title}</h3>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>{subtitle}</p>
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

function EditCreditsModal({ user, onClose, onSave }) {
  const [credits, setCredits] = useState(user?.credits ?? 0);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(user.id, Number(credits));
      onClose();
    } catch (error) {
      alert(`Gagal mengubah kredit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Edit Kredit User"
      subtitle="Perubahan akan langsung memperbarui saldo kredit user."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <div
          style={{
            padding: "1rem",
            borderRadius: 16,
            backgroundColor: "var(--surface-hover)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>User</p>
          <p style={{ margin: "0.3rem 0 0", fontWeight: 800 }}>
            {user?.namaLengkap || user?.displayName || user?.email || user?.id}
          </p>
        </div>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Jumlah Kredit Baru
          <input
            type="number"
            min={0}
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            className="form-input"
            style={{ marginTop: "0.35rem" }}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.4rem" }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.75rem" }}>
          Batal
        </button>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: "0.75rem" }}>
          {loading ? "Menyimpan..." : "Simpan Kredit"}
        </button>
      </div>
    </ModalShell>
  );
}

function RejectModal({ item, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(item.id, reason);
      onClose();
    } catch (error) {
      alert(`Gagal menolak request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="Tolak Permintaan"
      subtitle="Alasan penolakan akan tampil juga di halaman user."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <div
          style={{
            padding: "1rem",
            borderRadius: 16,
            backgroundColor: "rgba(239,68,68,0.08)",
            color: "#B91C1C",
            fontSize: "0.85rem",
          }}
        >
          <strong>{item.userName || item.userId}</strong> mengirim request untuk{" "}
          <strong>{getBillingRequestSummary(item)}</strong>.
        </div>

        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Alasan Penolakan
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="form-textarea"
            style={{ marginTop: "0.35rem" }}
            placeholder="Contoh: nominal transfer tidak sesuai."
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.4rem" }}>
        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.75rem" }}>
          Batal
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="btn"
          style={{
            flex: 1,
            padding: "0.75rem",
            backgroundColor: "#EF4444",
            color: "#fff",
            border: "1px solid #EF4444",
          }}
        >
          {loading ? "Memproses..." : "Tolak Request"}
        </button>
      </div>
    </ModalShell>
  );
}

function RequestCard({ item, onApprove, onReject, onEditCredits, actionLoading }) {
  const isPlan = item.requestType === "plan";
  const requestValue = isPlan
    ? item.planName || item.productName || "Plan Upgrade"
    : `+${Number(item.amount || 0).toLocaleString("id-ID")} kredit`;

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: "1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.95rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
            <TypeBadge type={item.requestType || "topup"} />
            <StatusBadge status={item.status} />
          </div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
            {item.userName || "Tanpa Nama"}
          </h3>
          <p style={{ margin: "0.28rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {item.userEmail || item.userId}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Total Bayar
          </p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "1rem", fontWeight: 900 }}>
            {formatRupiah(item.finalPrice || item.basePrice || 0)}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <div style={{ padding: "0.85rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Produk
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.92rem", fontWeight: 800 }}>{getBillingRequestSummary(item)}</p>
        </div>
        <div style={{ padding: "0.85rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Hasil Approval
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.92rem", fontWeight: 800 }}>{requestValue}</p>
        </div>
        <div style={{ padding: "0.85rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Channel
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.92rem", fontWeight: 800 }}>{item.paymentChannelLabel || "-"}</p>
        </div>
        <div style={{ padding: "0.85rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
            Waktu
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.92rem", fontWeight: 800 }}>{formatDate(item.timestamp)}</p>
        </div>
      </div>

      {(item.promoCode || item.customerNotes || item.rejectedReason) && (
        <div style={{ display: "grid", gap: "0.7rem" }}>
          {item.promoCode && (
            <div style={{ padding: "0.8rem 0.95rem", borderRadius: 14, backgroundColor: "rgba(79,70,229,0.08)", color: "var(--primary)", fontSize: "0.82rem" }}>
              Promo terpakai: <strong>{item.promoCode}</strong>
            </div>
          )}
          {item.customerNotes && (
            <div style={{ padding: "0.8rem 0.95rem", borderRadius: 14, backgroundColor: "var(--surface-hover)", fontSize: "0.82rem" }}>
              <strong>Catatan user:</strong> {item.customerNotes}
            </div>
          )}
          {item.rejectedReason && (
            <div style={{ padding: "0.8rem 0.95rem", borderRadius: 14, backgroundColor: "rgba(239,68,68,0.08)", color: "#B91C1C", fontSize: "0.82rem" }}>
              <strong>Alasan reject:</strong> {item.rejectedReason}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {item.status === "pending" && (
          <>
            <button
              onClick={() => onApprove(item)}
              disabled={actionLoading[item.id] === "approving"}
              className="btn btn-primary"
              style={{ padding: "0.7rem 0.95rem", backgroundColor: "#10B981" }}
            >
              <PremiumIcon name="check" size={14} />
              {actionLoading[item.id] === "approving" ? "Memproses..." : "Approve"}
            </button>
            <button
              onClick={() => onReject(item)}
              className="btn"
              style={{
                padding: "0.7rem 0.95rem",
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "#EF4444",
                border: "1px solid rgba(239,68,68,0.18)",
              }}
            >
              <PremiumIcon name="x" size={14} />
              Tolak
            </button>
          </>
        )}

        <button onClick={() => onEditCredits(item.userId)} className="btn btn-outline" style={{ padding: "0.7rem 0.95rem" }}>
          <PremiumIcon name="coins" size={14} />
          Edit Kredit User
        </button>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreditManagement() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    approvedPlans: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const unsubscribe = subscribeToTopups((items) => {
      setRequests(items);
      setLoading(false);
      getTopupStats().then(setStats);
    });

    return () => unsubscribe();
  }, []);

  const refreshStats = async () => {
    const nextStats = await getTopupStats();
    setStats(nextStats);
  };

  const handleApprove = async (item) => {
    if (!confirm(`Approve request ${getBillingRequestSummary(item)} untuk ${item.userName || item.userId}?`)) {
      return;
    }

    setActionLoading((current) => ({ ...current, [item.id]: "approving" }));
    try {
      await approveTopup(item);
      await refreshStats();
    } catch (error) {
      alert(`Gagal approve request: ${error.message}`);
    } finally {
      setActionLoading((current) => ({ ...current, [item.id]: null }));
    }
  };

  const handleReject = async (requestId, reason) => {
    await rejectTopup(requestId, reason);
    await refreshStats();
  };

  const handleEditCredits = async (userId, newCredits) => {
    await editUserCredits(userId, newCredits);
  };

  const openEditCredits = async (userId) => {
    try {
      const user = await getUserWithCredits(userId);
      if (!user) {
        alert("Data user tidak ditemukan.");
        return;
      }
      setEditTarget(user);
    } catch (error) {
      alert(`Gagal mengambil data user: ${error.message}`);
    }
  };

  const filteredRequests = requests.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const queryValue = search.trim().toLowerCase();
    const matchesSearch =
      !queryValue ||
      item.userName?.toLowerCase().includes(queryValue) ||
      item.userEmail?.toLowerCase().includes(queryValue) ||
      item.userId?.toLowerCase().includes(queryValue) ||
      item.productName?.toLowerCase().includes(queryValue) ||
      item.paymentChannelLabel?.toLowerCase().includes(queryValue);

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={42} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", margin: 0 }}>Memuat request pembayaran...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>
          Manajemen Kredit & Payment Request
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "0.4rem 0 0", fontSize: "0.95rem" }}>
          Approve atau reject top-up kredit dan upgrade plan manual yang dikirim user dari halaman langganan.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard icon="clock" label="Pending" value={stats.pending} color="#D97706" />
        <StatCard icon="checkCircle" label="Disetujui" value={stats.approved} color="#059669" />
        <StatCard icon="xCircle" label="Ditolak" value={stats.rejected} color="#DC2626" />
        <StatCard icon="coins" label="Kredit Terdistribusi" value={Number(stats.totalAmount).toLocaleString("id-ID")} color="#10B981" />
        <StatCard icon="tag" label="Plan Diaktifkan" value={stats.approvedPlans} color="#4F46E5" />
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["all", "pending", "approved", "rejected"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                padding: "0.45rem 0.95rem",
                borderRadius: 999,
                border: `1.5px solid ${filter === item ? "var(--primary)" : "var(--border)"}`,
                backgroundColor: filter === item ? "var(--primary)" : "transparent",
                color: filter === item ? "#fff" : "var(--text-muted)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.82rem",
              }}
            >
              {item === "all" ? "Semua" : item === "pending" ? "Pending" : item === "approved" ? "Approved" : "Rejected"}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <PremiumIcon name="search" size={16} style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari user, produk, atau channel..."
            className="form-input"
            style={{ paddingLeft: "2.4rem" }}
          />
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div style={{ backgroundColor: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 20, padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <PremiumIcon name="inbox" size={36} style={{ opacity: 0.35, marginBottom: "0.8rem" }} />
          <p style={{ margin: 0, fontWeight: 800 }}>Tidak ada request yang cocok dengan filter saat ini.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredRequests.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={setRejectTarget}
              onEditCredits={openEditCredits}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {editTarget && (
        <EditCreditsModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditCredits}
        />
      )}

      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
