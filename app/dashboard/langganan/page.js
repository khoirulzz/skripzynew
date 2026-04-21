"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Free Plan",
    price: "0",
    desc: "Cocok untuk mencoba dasar fitur AI.",
    features: [
      "2.000 karakter max per AI",
      "Akses Parafrase & Cek Grammar",
      "Asisten AI Dasar",
      "Akses terbatas ke Workspace Editor"
    ]
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: "49.000",
    desc: "Fitur lengkap untuk pejuang skripsi.",
    popular: true,
    features: [
      "5.000 karakter max per AI",
      "Akses Semua Fitur (Humanizer, Simulasi)",
      "Referensi Cerdas Instan",
      "Prioritas Server AI Tercepat"
    ]
  },
  {
    id: "plus",
    name: "Plus Plan",
    price: "99.000",
    desc: "Untuk riset berat & publikasi jurnal.",
    features: [
      "8.000 karakter max per AI",
      "Convert Skripsi ke Jurnal (Akan Rilis)",
      "Detektor AI Tingkat Lanjut",
      "Unlimited Workspace Database"
    ]
  }
];

const TOP_UPS = [
  { id: "k-50", amount: 50, price: "15.000" },
  { id: "k-120", amount: 120, price: "30.000", bonus: "+20" },
  { id: "k-300", amount: 300, price: "60.000", bonus: "+60" },
];

export default function LanggananPage() {
  const { user, userData } = useAuth();
  const currentPlan = userData?.plan || "free";
  const currentCredits = userData?.credits ?? 0;

  const [loadingAction, setLoadingAction] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpgradePlan = async (planId) => {
    if (!user) return;
    if (planId === currentPlan) return;
    
    setLoadingAction(planId);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      // Simulasi delay payment gateway
      await new Promise(r => setTimeout(r, 1500));

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { 
        plan: planId 
      });

      setSuccessMsg(`Berhasil upgrade ke ${planId.toUpperCase()} Plan!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Gagal melakukan upgrade: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTopUp = async (amount) => {
    if (!user) return;

    setLoadingAction(`topup-${amount}`);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      // Simulasi delay payment gateway
      await new Promise(r => setTimeout(r, 1500));

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { 
        credits: increment(amount) 
      });

      setSuccessMsg(`Berhasil Top-Up ${amount} Kredit!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Gagal melakukan top-up: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "3rem" }}>
       {/* Header */}
       <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)" }}><PremiumIcon name="arrowLeft" size={20} /></Link>
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Langganan & Kredit</h1>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>Kelola paket langganan dan sisa penggunaan AI Anda.</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(16,185,129,0.1)", color: "var(--success)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.2)", marginBottom: "1.5rem", textAlign: "center", fontWeight: 600 }}>
          <PremiumIcon name="check" size={18} style={{ marginRight: "0.5rem" }} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "1.5rem", textAlign: "center", fontWeight: 600 }}>
          <PremiumIcon name="alertCircle" size={18} style={{ marginRight: "0.5rem" }} /> {errorMsg}
        </div>
      )}

      {/* Info Status Saat Ini */}
      <div className="glass-panel p-6 mb-8" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "2rem", background: "linear-gradient(135deg,rgba(79,70,229,0.05), rgba(139,92,246,0.05))", alignItems: "center" }}>
         <div style={{ textAlign: "center", paddingRight: "2rem", borderRight: "1px solid var(--border)" }}>
           <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600}}>Status Paket</p>
           <h2 style={{ fontSize: "1.6rem", margin: 0, color: "var(--primary)", textTransform: "capitalize" }}>{currentPlan} Plan</h2>
         </div>
         <div style={{ textAlign: "center" }}>
           <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 0.5rem 0", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600}}>Sisa Kredit AI</p>
           <h2 style={{ fontSize: "1.6rem", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <PremiumIcon name="zap" size={20} style={{ color: "#F59E0B" }} />
              {currentCredits}
           </h2>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem" }}>
        
        {/* SECTION: PAKET LANGGANAN */}
        <section>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.2rem" }}>Pilih Paket Unggulan</h2>
            <p className="text-muted" style={{ fontSize: "0.875rem", margin: 0 }}>Buka kunci semua limit fitur cerdas Skripzy sesuai kebutuhan.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {PLANS.map(plan => {
              const isActive = currentPlan === plan.id;
              
              return (
                <div key={plan.id} className="glass-panel p-6" style={{
                  display: "flex", flexDirection: "column", height: "100%", position: "relative",
                  border: plan.popular ? "2px solid var(--primary)" : "1px solid var(--border)",
                  transform: plan.popular ? "scale(1.02)" : "scale(1)",
                  boxShadow: plan.popular ? "var(--shadow-lg)" : "var(--shadow-sm)"
                }}>
                  {plan.popular && (
                     <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px" }}>
                       PALING LARIS
                     </div>
                  )}
                  
                  <h3 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>{plan.name}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", marginBottom: "0.5rem" }}>
                     <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-muted)" }}>Rp</span>
                     <span style={{ fontSize: "2.0rem", fontWeight: 800 }}>{plan.price}</span>
                     <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/bulan</span>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "1.5rem", minHeight: "40px" }}>{plan.desc}</p>
                  
                  <div style={{ flex: 1 }}>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem 0", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem" }}>
                          <PremiumIcon name="check" size={16} style={{ color: "var(--success)", flexShrink: 0, marginTop: "2px" }} />
                          <span style={{ lineHeight: 1.4 }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button 
                    className={`btn ${isActive ? 'btn-outline' : plan.popular ? 'btn-primary' : 'btn-outline'}`}
                    style={{ width: "100%", padding: "0.8rem", fontSize: "0.95rem" }}
                    onClick={() => handleUpgradePlan(plan.id)}
                    disabled={isActive || loadingAction}
                  >
                    {loadingAction === plan.id ? "Memproses..." : isActive ? "Paket Aktif" : "Pilih Paket"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION: TOP UP KREDIT */}
        <section>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.2rem" }}>Isi Ulang Kredit AI</h2>
            <p className="text-muted" style={{ fontSize: "0.875rem", margin: 0 }}>Kredit tidak hangus, digunakan per aksi di fitur Quick Tools.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1.5rem" }}>
             {TOP_UPS.map(top => (
               <div key={top.id} className="glass-panel p-5" style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
                 <div style={{ position: "relative" }}>
                   {top.bonus && (
                     <div style={{ position: "absolute", top: "-10px", right: "0", backgroundColor: "#F59E0B", color: "white", padding: "2px 8px", borderRadius: "8px", fontSize: "0.65rem", fontWeight: 800 }}>
                       +{top.bonus}
                     </div>
                   )}
                   <PremiumIcon name="zap" size={28} style={{ color: "#F59E0B", margin: "0 auto 0.5rem" }} />
                   <h3 style={{ fontSize: "1.6rem", margin: 0 }}>{top.amount}</h3>
                   <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Kredit</span>
                 </div>
                 
                 <div style={{ fontSize: "1.0rem", fontWeight: 700, margin: "0.5rem 0" }}>
                   Rp {top.price}
                 </div>

                 <button 
                   className="btn btn-outline" 
                   style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem", borderColor: "#F59E0B", color: "#B45309", backgroundColor: "rgba(245,158,11,0.05)" }}
                   onClick={() => handleTopUp(top.amount)}
                   disabled={loadingAction}
                 >
                   {loadingAction === `topup-${top.amount}` ? "Proses..." : "Beli"}
                 </button>
               </div>
             ))}
          </div>
        </section>

      </div>
    </div>
  );
}
