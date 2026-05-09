"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Link reset password sudah dikirim ke emailmu. Silakan cek inbox (atau folder spam).");
    } catch (err) {
      console.error(err);
      setError("Gagal mengirim email reset. Pastikan email yang kamu masukkan sudah benar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="landing-card animate-fade-in" style={{ padding: "clamp(1.5rem, 4vw, 2.25rem)", maxWidth: 460, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.5rem" }}>
          <div className="landing-icon-box">
            <PremiumIcon name="key" size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "var(--text-main)" }}>
              Lupa Password?
            </h2>
            <p className="landing-copy" style={{ margin: 0, fontSize: "0.92rem" }}>
              Tenang, kami bantu kirim link resetnya.
            </p>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--success)", borderRadius: 8, fontSize: "0.9rem", lineHeight: 1.5 }}>
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: 8, fontSize: "0.9rem", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {!message ? (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Terdaftar</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              style={{ padding: "0.85rem", fontSize: "1rem", borderRadius: 999, fontWeight: 800 }}
              disabled={loading}
            >
              {loading ? "Mengirim link..." : "Kirim Link Reset"}
              {!loading && <PremiumIcon name="mail" size={18} />}
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="btn btn-primary w-full mt-4"
            style={{ padding: "0.85rem", fontSize: "1rem", borderRadius: 999, fontWeight: 800 }}
          >
            Kembali ke Login
          </Link>
        )}

        <div className="text-center mt-6" style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
          Ingat passwordnya? <Link href="/login" className="text-primary font-semibold">Masuk saja</Link>
        </div>
      </div>
    </AuthGuard>
  );
}
