"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { d1Request } from "@/lib/d1Client";
import Link from "next/link";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

const PLAN_BADGE = {
  free: { label: "FREE", color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  pro: { label: "PRO", color: "#4F46E5", bg: "rgba(79,70,229,0.12)" },
  plus: { label: "PLUS", color: "#EA580C", bg: "rgba(234,88,12,0.12)" },
  premium: { label: "PREMIUM", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
};

// ─── Cloudinary Upload Helper ────────────────────────────────
async function uploadProfilePhotoToCloudinary(file) {
  // Compress to max 300px before upload
  const compressed = await compressImage(file, 300);

  const sigRes = await fetch(`${WORKER_URL}/api/cloudinary-sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-skripzy-secret": WORKER_SECRET
    },
    body: JSON.stringify({ folder: "Skripzy/Profil" }),
  });
  if (!sigRes.ok) throw new Error("Gagal mendapatkan signature upload.");
  const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", "Skripzy/Profil");

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) throw new Error("Upload foto profil gagal.");
  const uploadData = await uploadRes.json();
  return uploadData.secure_url;
}

function compressImage(file, maxSize) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Section Component ────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
        {title}
      </p>
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden", borderRadius: 18 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────
function Row({ icon, label, value, onClick, danger, chevron = true, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.9rem 1rem",
        cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid var(--border)",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: danger ? "rgba(239,68,68,0.1)" : "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <PremiumIcon name={icon} size={16} style={{ color: danger ? "var(--danger)" : "var(--text-muted)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: danger ? "var(--danger)" : "var(--text-main)" }}>{label}</p>
        {value && <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>}
        {children}
      </div>
      {chevron && onClick && <PremiumIcon name="chevronRight" size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingInstitusi, setEditingInstitusi] = useState(false);
  const [namaValue, setNamaValue] = useState("");
  const [institusiValue, setInstitusiValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (userData) {
      setNamaValue(userData.namaLengkap || userData.name || "");
      setInstitusiValue(userData.asalInstitusi || "");
      setPhotoUrl(userData.photoUrl || null);
    }
  }, [userData]);

  const showMsg = (msg, isError = false) => {
    if (isError) setErrorMsg(msg);
    else setSuccessMsg(msg);
    setTimeout(() => { setSuccessMsg(""); setErrorMsg(""); }, 3000);
  };

  const handleSaveName = async () => {
    if (!namaValue.trim()) return;
    setSaving(true);
    try {
      await d1Request("users", { method: "PATCH", id: user.uid, body: { namaLengkap: namaValue.trim(), name: namaValue.trim(), updated_at: new Date().toISOString() } });
      await refreshUserData();
      setEditingName(false);
      showMsg("Nama berhasil diperbarui!");
    } catch (e) { showMsg(e.message || "Gagal menyimpan nama.", true); }
    finally { setSaving(false); }
  };

  const handleSaveInstitusi = async () => {
    setSaving(true);
    try {
      await d1Request("users", { method: "PATCH", id: user.uid, body: { asalInstitusi: institusiValue.trim(), updated_at: new Date().toISOString() } });
      await refreshUserData();
      setEditingInstitusi(false);
      showMsg("Institusi berhasil diperbarui!");
    } catch (e) { showMsg(e.message || "Gagal menyimpan institusi.", true); }
    finally { setSaving(false); }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadProfilePhotoToCloudinary(file);
      await d1Request("users", { method: "PATCH", id: user.uid, body: { photoUrl: url, updated_at: new Date().toISOString() } });
      setPhotoUrl(url);
      await refreshUserData();
      showMsg("Foto profil berhasil diperbarui!");
    } catch (e) { showMsg(e.message || "Gagal upload foto.", true); }
    finally { setPhotoUploading(false); }
  };

  const handleLogout = async () => {
    if (!confirm("Yakin ingin keluar?")) return;
    await signOut(auth);
    router.push("/login");
  };

  const plan = userData?.plan || "free";
  const badge = PLAN_BADGE[plan] || PLAN_BADGE.free;
  const credits = userData?.credits ?? 0;
  const initials = (userData?.namaLengkap || userData?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="animate-fade-in" style={{ maxWidth: "600px", margin: "0 auto", padding: isMobile ? "0 0 4rem 0" : "0 1.25rem 3rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem", padding: isMobile ? "0 1rem" : "0" }}>
        {!isMobile && (
          <Link href="/dashboard" style={{ color: "var(--text-muted)" }}>
            <PremiumIcon name="arrowLeft" size={20} />
          </Link>
        )}
        <div>
          <h1 style={{ fontSize: isMobile ? "1.15rem" : "1.6rem", margin: 0, fontWeight: 900 }}>Pengaturan</h1>
          <p style={{ margin: "0.1rem 0 0", fontSize: isMobile ? "0.7rem" : "0.8rem", color: "var(--text-muted)" }}>Kelola profil & akun Anda</p>
        </div>
      </div>

      {/* ── Feedback Messages ── */}
      {(successMsg || errorMsg) && (
        <div style={{ margin: isMobile ? "0 1rem 1rem" : "0 0 1rem", padding: "0.75rem 1rem", borderRadius: 14, backgroundColor: successMsg ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${successMsg ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, color: successMsg ? "#047857" : "#B91C1C", fontSize: "0.82rem", fontWeight: 600 }}>
          {successMsg || errorMsg}
        </div>
      )}

      <div style={{ padding: isMobile ? "0 1rem" : "0" }}>

        {/* ── Profile Card ── */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: 20, marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center", position: "relative" }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", cursor: "pointer", border: "3px solid var(--primary)", backgroundColor: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              {photoUploading ? (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", borderRadius: "50%" }}>
                  <LoadingSpinner size={24} className="text-white" />
                </div>
              ) : photoUrl ? (
                <img src={photoUrl} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "2rem", fontWeight: 900, color: "var(--primary)" }}>{initials}</span>
              )}
            </div>
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
              <PremiumIcon name="camera" size={12} style={{ color: "white" }} />
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />

          {/* Name & Plan Badge */}
          <div>
            <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text-main)" }}>{userData?.namaLengkap || userData?.name || "Pengguna Skripzy"}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>{userData?.email || user?.email}</p>
          </div>

          {/* Plan & Credits mini strip */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ padding: "0.3rem 0.85rem", borderRadius: 999, backgroundColor: badge.bg, color: badge.color, fontSize: "0.7rem", fontWeight: 800 }}>
              {badge.label}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
              <PremiumIcon name="coins" size={14} style={{ color: "#F59E0B" }} />
              {credits.toLocaleString("id-ID")} Kredit
            </span>
          </div>

          <Link href="/dashboard/langganan" style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 700, textDecoration: "none", marginTop: "-0.25rem" }}>
            Kelola Langganan →
          </Link>
        </div>

        {/* ── Profil Section ── */}
        <Section title="Profil">
          {/* Nama */}
          {editingName ? (
            <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Nama Lengkap</label>
              <input
                autoFocus
                className="form-input"
                value={namaValue}
                onChange={e => setNamaValue(e.target.value)}
                style={{ fontSize: "0.85rem", padding: "0.6rem", marginBottom: "0.75rem" }}
                onKeyDown={e => e.key === "Enter" && handleSaveName()}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: "0.55rem", fontSize: "0.8rem", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={handleSaveName} disabled={saving}>
                  {saving ? <><LoadingSpinner size={14} className="text-white" /> Menyimpan...</> : "Simpan"}
                </button>
                <button className="btn btn-ghost" style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }} onClick={() => { setEditingName(false); setNamaValue(userData?.namaLengkap || ""); }}>Batal</button>
              </div>
            </div>
          ) : (
            <Row icon="user" label="Nama Lengkap" value={userData?.namaLengkap || userData?.name || "Belum diatur"} onClick={() => setEditingName(true)} />
          )}

          {/* Institusi */}
          {editingInstitusi ? (
            <div style={{ padding: "0.9rem 1rem" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.4rem" }}>Asal Institusi / Kampus</label>
              <input
                autoFocus
                className="form-input"
                value={institusiValue}
                placeholder="Contoh: Universitas Gadjah Mada"
                onChange={e => setInstitusiValue(e.target.value)}
                style={{ fontSize: "0.85rem", padding: "0.6rem", marginBottom: "0.75rem" }}
                onKeyDown={e => e.key === "Enter" && handleSaveInstitusi()}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: "0.55rem", fontSize: "0.8rem", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={handleSaveInstitusi} disabled={saving}>
                  {saving ? <><LoadingSpinner size={14} className="text-white" /> Menyimpan...</> : "Simpan"}
                </button>
                <button className="btn btn-ghost" style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }} onClick={() => { setEditingInstitusi(false); setInstitusiValue(userData?.asalInstitusi || ""); }}>Batal</button>
              </div>
            </div>
          ) : (
            <Row icon="building" label="Institusi / Kampus" value={userData?.asalInstitusi || "Belum diatur"} onClick={() => setEditingInstitusi(true)} style={{ borderBottom: "none" }} />
          )}
        </Section>

        {/* ── Akun Section ── */}
        <Section title="Akun">
          <Row icon="shield" label="Email" value={userData?.email || user?.email || "-"} chevron={false} />
          <Row icon="user" label="Status" value={userData?.status || "Belum diatur"} chevron={false} />
          <Row icon="creditCard" label="Status Plan" value={badge.label + " — " + credits.toLocaleString("id-ID") + " kredit tersisa"} onClick={() => router.push("/dashboard/langganan")} />
        </Section>

        {/* ── Bantuan Section ── */}
        <Section title="Bantuan & Dukungan">
          <Row icon="messageCircle" label="Hubungi Admin" value="WhatsApp / Bantuan" onClick={() => window.open("https://wa.me/6285771298582", "_blank")} />
          <Row icon="helpCircle" label="Syarat & Ketentuan" value="skripzy.id/privacy-policy" onClick={() => window.open("/terms", "_blank")} />
        </Section>

        {/* ── Keluar Section ── */}
        <Section title="Lainnya">
          <Row icon="logout" label="Keluar" danger onClick={handleLogout} chevron={false} />
        </Section>

        <p style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "1rem" }}>
          Skripzy v2.1 Workspace Research © 2026
        </p>
      </div>
    </div>
  );
}
