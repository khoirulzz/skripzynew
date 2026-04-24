"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnapshot = await getDoc(userRef);
      const role = userSnapshot.exists() ? userSnapshot.data().role : "user";

      router.push(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      console.error(err);
      setError("Email atau password tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="glass-panel p-8 animate-fade-in">
        <div className="flex items-center justify-center mb-6">
          <PremiumIcon name="zap" size={40} className="text-primary" />
        </div>
        
        <h1 className="text-center" style={{ fontSize: "1.75rem" }}>Masuk ke Workspace</h1>
        <p className="text-center mb-8">Lanjutkan riset dan skripsi Anda</p>

        {error && (
          <div className="mb-6 p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "0.875rem" }}>
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
            <label className="form-label" htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            style={{ padding: "0.75rem", fontSize: "1rem" }}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          Belum punya akun? <Link href="/register" className="text-primary font-medium">Daftar sekarang</Link>
        </div>
      </div>
    </AuthGuard>
  );
}
