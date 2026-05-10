"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { d1Request } from "@/lib/d1Client";
import { auth, googleProvider } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";

const loginBenefits = [
  "Lanjutkan draf skripsi dari terakhir kamu berhenti.",
  "Buka catatan, referensi, dan revisi dalam satu workspace.",
  "Gunakan bantuan AI untuk merapikan ide tanpa kehilangan arah riset.",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userResponse = await d1Request("users", { id: userCredential.user.uid }).catch(() => null);
      const role = userResponse?.data?.role || "user";

      router.push(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      console.error(err);
      setError("Email atau password belum cocok. Coba cek lagi pelan-pelan.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in D1
      const userResponse = await d1Request("users", { id: user.uid }).catch(() => null);

      if (!userResponse?.data) {
        // Create new user profile in D1
        await d1Request("users", {
          method: "POST",
          body: {
            email: user.email,
            name: user.displayName || "User Skripzy",
            plan: "free",
            credits: 15
          }
        });
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/cancelled-popup-request") {
        setError("Gagal masuk dengan Google. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="landing-two-col" style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div>
          <span className="landing-kicker">
            <PremiumIcon name="zap" size={14} />
            Masuk ke workspace
          </span>
          <h1 className="landing-heading" style={{ fontSize: "clamp(2.4rem, 5vw, 4.25rem)", marginTop: "1rem", marginBottom: "1.25rem" }}>
            Balik lagi ke risetmu.
          </h1>
          <p className="landing-copy" style={{ fontSize: "1.08rem", maxWidth: "58ch", marginBottom: "1.5rem" }}>
            Semua progres kecil tetap berarti. Masuk, lihat lagi catatanmu, lalu lanjutkan satu bagian yang paling mungkin dikerjakan hari ini.
          </p>

          <div className="landing-stack" style={{ maxWidth: 560 }}>
            {loginBenefits.map((item) => (
              <div key={item} className="landing-card" style={{ padding: "0.95rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <PremiumIcon name="checkCircle" size={18} className="text-primary" />
                <span style={{ color: "var(--text-main)", fontWeight: 700, lineHeight: 1.45 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-card animate-fade-in" style={{ padding: "clamp(1.5rem, 4vw, 2.25rem)", maxWidth: 460, width: "100%", marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.5rem" }}>
            <div className="landing-icon-box">
              <PremiumIcon name="layoutTemplate" size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "var(--text-main)" }}>
                Login Skripzy
              </h2>
              <p className="landing-copy" style={{ margin: 0, fontSize: "0.92rem" }}>
                Masuk untuk membuka dashboard riset.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: 8, fontSize: "0.9rem", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
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

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" htmlFor="password">Password</label>
                <Link href="/forgot-password" style={{ fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600 }}>
                  Lupa password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              style={{ padding: "0.85rem", fontSize: "1rem", borderRadius: 999, fontWeight: 800 }}
              disabled={loading}
            >
              {loading ? "Membuka workspace..." : "Masuk ke Workspace"}
              {!loading && <PremiumIcon name="arrowRight" size={18} />}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Atau</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="btn btn-outline w-full"
            style={{ 
              padding: "0.85rem", 
              fontSize: "1rem", 
              borderRadius: 999, 
              fontWeight: 700,
              background: "rgba(var(--surface-rgb), 0.8)",
              display: "flex",
              gap: "0.75rem"
            }}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81.38z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Masuk dengan Google
          </button>

          <div className="text-center mt-6" style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Belum punya akun? <Link href="/register" className="text-primary font-semibold">Daftar gratis</Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
