"use client";

import { useEffect, useState } from "react";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { subscribeToUsers, updateUser, deleteUserDoc } from "@/lib/adminUsers";

const PLAN_COLORS = {
  free: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", label: "Free" },
  pro: { bg: "rgba(139,92,246,0.12)", color: "#8b5cf6", label: "Pro" },
  plus: { bg: "rgba(234,179,8,0.12)", color: "#eab308", label: "Plus" },
};

function PlanBadge({ plan }) {
  const p = PLAN_COLORS[plan?.toLowerCase()] || PLAN_COLORS.free;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.65rem",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
        backgroundColor: p.bg,
        color: p.color,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {p.label}
    </span>
  );
}

function Avatar({ name, email }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() || "?";
  const colors = ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: "0.85rem",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// Modal Edit User
function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    namaLengkap: user.namaLengkap || user.displayName || "",
    plan: user.plan || "free",
    credits: user.credits ?? 0,
    role: user.role || "user",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(user.id, {
        namaLengkap: form.namaLengkap,
        plan: form.plan,
        credits: Number(form.credits),
        role: form.role,
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
    marginTop: "0.35rem",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--text-muted)",
    marginBottom: "1rem",
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
          maxWidth: 480,
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <Avatar name={user.namaLengkap || user.displayName} email={user.email} />
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Edit User</h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{user.email}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: "0.4rem", marginLeft: "auto" }}>
            <PremiumIcon name="x" size={20} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
          <label style={labelStyle}>
            Nama Lengkap
            <input
              type="text"
              value={form.namaLengkap}
              onChange={(e) => setForm((f) => ({ ...f, namaLengkap: e.target.value }))}
              style={{ ...inputStyle, gridColumn: "1/-1" }}
            />
          </label>

          <label style={labelStyle}>
            Plan
            <select
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              style={inputStyle}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="plus">Plus</option>
            </select>
          </label>

          <label style={labelStyle}>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              style={inputStyle}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label style={{ ...labelStyle, gridColumn: "1/-1" }}>
            Kredit
            <input
              type="number"
              min={0}
              value={form.credits}
              onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: "0.75rem", borderRadius: 8 }}>
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
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
              fontSize: "0.9rem",
            }}
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    const unsub = subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdate = async (userId, data) => {
    await updateUser(userId, data);
  };

  const handleDelete = async (user) => {
    if (!confirm(`Hapus user "${user.namaLengkap || user.email}"? Tindakan ini tidak dapat diurungkan.`)) return;
    try {
      await deleteUserDoc(user.id);
    } catch (e) {
      alert("Gagal hapus: " + e.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filtered = users.filter((u) => {
    const matchPlan = planFilter === "all" || u.plan?.toLowerCase() === planFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.namaLengkap?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q);
    return matchPlan && matchSearch;
  });

  // Summary counts
  const counts = {
    total: users.length,
    free: users.filter((u) => !u.plan || u.plan === "free").length,
    pro: users.filter((u) => u.plan === "pro").length,
    plus: users.filter((u) => u.plan === "plus").length,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem" }}>
        <PremiumIcon name="loader" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat data user...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.35rem 0", letterSpacing: "-0.02em" }}>
          Manajemen User
        </h1>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
          Lihat, edit, dan kelola semua pengguna platform
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total User", value: counts.total, color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
          { label: "Free", value: counts.free, color: "#94a3b8", bg: "rgba(100,116,139,0.1)" },
          { label: "Pro", value: counts.pro, color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
          { label: "Plus", value: counts.plus, color: "#eab308", bg: "rgba(234,179,8,0.12)" },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.1rem 1.25rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>{c.label}</p>
            <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["all", "free", "pro", "plus"].map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: 999,
                fontSize: "0.83rem",
                fontWeight: 600,
                border: "1.5px solid",
                cursor: "pointer",
                borderColor: planFilter === p ? "var(--primary)" : "var(--border)",
                backgroundColor: planFilter === p ? "var(--primary)" : "transparent",
                color: planFilter === p ? "#fff" : "var(--text-muted)",
              }}
            >
              {p === "all" ? "Semua" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <PremiumIcon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari nama atau email..."
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
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", flexShrink: 0 }}>
          {filtered.length} user
        </p>
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
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 80px 100px 100px 120px",
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
          <span>Email</span>
          <span>Plan</span>
          <span style={{ textAlign: "right" }}>Kredit</span>
          <span>Bergabung</span>
          <span style={{ textAlign: "right" }}>Aksi</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
            <PremiumIcon name="users" size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Tidak ada user ditemukan</p>
          </div>
        ) : (
          filtered.map((user) => (
            <div
              key={user.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 80px 100px 100px 120px",
                gap: "1rem",
                padding: "0.9rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* User Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                <Avatar name={user.namaLengkap || user.displayName} email={user.email} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.namaLengkap || user.displayName || "Tanpa Nama"}
                  </p>
                  {user.role === "admin" && (
                    <span style={{ fontSize: "0.7rem", color: "#8b5cf6", fontWeight: 700 }}>ADMIN</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div style={{ fontSize: "0.83rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </div>

              {/* Plan */}
              <div><PlanBadge plan={user.plan} /></div>

              {/* Kredit */}
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: "0.95rem", color: "var(--primary)" }}>
                {(user.credits ?? 0).toLocaleString("id-ID")}
              </div>

              {/* Bergabung */}
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {formatDate(user.createdAt)}
              </div>

              {/* Aksi */}
              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditTarget(user)}
                  title="Edit User"
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: 7,
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                >
                  <PremiumIcon name="edit" size={13} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  title="Hapus User"
                  style={{
                    padding: "0.45rem",
                    borderRadius: 7,
                    border: "none",
                    backgroundColor: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <PremiumIcon name="trash2" size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}
