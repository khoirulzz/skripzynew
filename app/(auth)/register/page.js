"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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

      // Migrate to existing structure
      await setDoc(doc(db, "users", user.uid), {
        namaLengkap: formData.namaLengkap,
        email: formData.email,
        status: formData.status,
        asalInstitusi: formData.asalInstitusi,
        createdAt: serverTimestamp(),
        plan: "free",
        credits: 15,
        role: "user"
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

  return (
    <AuthGuard requireAuth={false}>
      <div className="glass-panel p-8 animate-fade-in" style={{ margin: "2rem 0" }}>
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
            <input id="password" type="password" className="form-input" placeholder="••••••••" value={formData.password} onChange={handleChange} minLength={6} required />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            style={{ padding: "0.75rem", fontSize: "1rem" }}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <div className="text-center mt-6" style={{ fontSize: "0.875rem" }}>
          Sudah punya akun? <Link href="/login" className="text-primary font-medium">Masuk</Link>
        </div>
      </div>
    </AuthGuard>
  );
}
