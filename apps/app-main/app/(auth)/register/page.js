"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { d1Request } from "@/lib/d1Client";
import { auth, googleProvider } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    namaLengkap: "",
    email: "",
    password: "",
    status: "",
    asalInstitusi: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!formData.status) {
      setError("Silakan pilih status (Mahasiswa/Akademisi/Pelajar)");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Create user profile in D1
      await d1Request("users", {
        method: "POST",
        body: {
          id: user.uid,
          email: formData.email,
          name: formData.namaLengkap,
          namaLengkap: formData.namaLengkap,
          plan: "free",
          credits: 15,
          status: formData.status,
          asalInstitusi: formData.asalInstitusi
        }
      });

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email sudah terdaftar. Silakan Log in.");
      } else {
        setError("Gagal mendaftar: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      let user;

      if (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        user = userCredential.user;
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        user = result.user;
      }

      const userResponse = await d1Request("users", { id: user.uid }).catch(() => null);

      if (!userResponse?.data) {
        await d1Request("users", {
          method: "POST",
          body: {
            id: user.uid,
            email: user.email,
            name: user.displayName || "User Skripzy",
            namaLengkap: user.displayName || "User Skripzy",
            plan: "free",
            credits: 15
          }
        });
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/cancelled-popup-request") {
        setError("Gagal daftar dengan Google. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="landing-card p-8 animate-fade-in" style={{ margin: "2rem auto", maxWidth: 560 }}>
        <div className="flex items-center justify-center mb-6">
          <PremiumIcon name="zap" size={40} className="text-primary" />
        </div>
        
        <h1 className="text-center" style={{ fontSize: "1.75rem" }}>Buat Akun</h1>
        <p className="text-center mb-8">Mulai tulis skripsi Anda bersama AI</p>

        {error && (
          <div className="mb-6 p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="namaLengkap">Nama Lengkap</label>
            <input id="namaLengkap" type="text" className="form-input" placeholder="Nama Anda" value={formData.namaLengkap} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form-input" placeholder="nama@email.com" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="status">Status</label>
              <select id="status" className="form-input form-select" value={formData.status} onChange={handleChange} required>
                <option value="" disabled>Pilih Status...</option>
                <option value="Mahasiswa">Mahasiswa</option>
                <option value="Pelajar">Pelajar</option>
                <option value="Akademisi">Akademisi</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" htmlFor="asalInstitusi">Asal Institusi</label>
              <input id="asalInstitusi" type="text" className="form-input" placeholder="Nama Kampus/Sekolah" value={formData.asalInstitusi} onChange={handleChange} required />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-input" placeholder="Minimal 6 karakter" value={formData.password} onChange={handleChange} minLength={6} required />
          </div>

          <div className="flex items-start mt-4 mb-4" style={{ cursor: "pointer", gap: "12px" }}>
            <input
              id="agreed"
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              required
              style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer", accentColor: "var(--primary)", flexShrink: 0 }}
            />
            <label htmlFor="agreed" className="text-sm m-0" style={{ color: "var(--text-main)", lineHeight: "1.5", cursor: "pointer", userSelect: "none" }}>
              Saya telah membaca dan memahami <Link href="https://skripzy.id/terms" target="_blank" className="text-primary font-bold hover:underline">Terms &amp; Conditions</Link>, <Link href="https://skripzy.id/privacy-policy" target="_blank" className="text-primary font-bold hover:underline">Privacy Policy</Link>, serta <Link href="https://skripzy.id/ai-usage-disclaimer" target="_blank" className="text-primary font-bold hover:underline">AI Usage Disclaimer</Link>.
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-2" 
            style={{ padding: "0.85rem", fontSize: "1rem", borderRadius: 999, fontWeight: 800 }}
            disabled={loading || !agreed}
          >
            {loading ? "Memproses..." : "Daftar Akun"}
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
          Daftar dengan Google
        </button>

        <div className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          Sudah punya akun? <Link href="/login" className="text-primary font-medium">Masuk</Link>
        </div>
      </div>
    </AuthGuard>
  );
}
