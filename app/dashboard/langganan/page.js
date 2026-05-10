"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import { validatePromoCode } from "@/lib/adminPromos";
import {
  calculatePromoBreakdown,
  createBillingRequest,
  formatRupiah,
  getBillingRequestSummary,
  getPaymentChannelById,
  getPaymentMethodById,
  getTotalCreditsFromTopup,
  MANUAL_PAYMENT_CHANNELS,
  PAYMENT_METHODS,
  BILLING_PERIODS,
  calculatePeriodPrice,
  createDokuPayment,
} from "@/lib/billing";
import {
  useActivePromos,
  useBillingCatalog,
  useUserBillingRequests,
} from "@/lib/useBillingCatalog";

const STATUS_STYLES = {
  pending: { bg: "rgba(245,158,11,0.12)", color: "#D97706", label: "Menunggu Verifikasi" },
  approved: { bg: "rgba(16,185,129,0.12)", color: "#059669", label: "Disetujui" },
  rejected: { bg: "rgba(239,68,68,0.12)", color: "#DC2626", label: "Ditolak" },
  waiting_payment: { bg: "rgba(59,130,246,0.12)", color: "#2563EB", label: "Menunggu Pembayaran" },
};

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const tone = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.35rem 0.75rem", borderRadius: 999, backgroundColor: tone.bg, color: tone.color, fontSize: "0.74rem", fontWeight: 800 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: tone.color }} />
      {tone.label}
    </span>
  );
}

function ChoiceCard({ title, subtitle, badge, selected, disabled, accent, onClick, children }) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = selected || expanded;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%", textAlign: "left",
        background: selected ? `linear-gradient(180deg, ${accent}12, transparent 90%), var(--surface)` : "var(--surface)",
        border: `1.5px solid ${selected ? accent : "var(--border)"}`,
        borderRadius: 20, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1, transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: selected ? `0 12px 24px ${accent}20` : "var(--shadow-sm)",
        display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
      }}
    >
      {selected && (
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "80%", height: "40%", background: `radial-gradient(ellipse at top, ${accent}30, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
      )}
      <div style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
            {badge && (
              <span style={{ padding: "0.25rem 0.65rem", borderRadius: 999, backgroundColor: selected ? accent : `${accent}20`, color: selected ? "#fff" : accent, fontSize: "0.65rem", fontWeight: 800, whiteSpace: "nowrap", transition: "all 0.3s ease" }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{subtitle}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          style={{ background: isExpanded ? `${accent}15` : "var(--surface-hover)", border: "none", color: isExpanded ? accent : "var(--text-muted)", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
          aria-label="Toggle details"
        >
           <PremiumIcon name="chevronDown" size={18} />
        </button>
      </div>
      <div style={{ maxHeight: isExpanded ? "800px" : "0", opacity: isExpanded ? 1 : 0, transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", padding: isExpanded ? "0 1.2rem 1.2rem 1.2rem" : "0 1.2rem", position: "relative", zIndex: 1 }}>
        <div style={{ paddingTop: "0.8rem", borderTop: isExpanded ? "1px dashed var(--border)" : "none", transition: "border-color 0.3s ease" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function OrderHistoryCard({ item }) {
  const isPlan = item.requestType === "plan";
  return (
    <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "var(--shadow-sm)", transition: "all 0.2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ padding: "0.25rem 0.65rem", borderRadius: 999, backgroundColor: isPlan ? "rgba(79,70,229,0.12)" : "rgba(16,185,129,0.12)", color: isPlan ? "var(--primary)" : "#059669", fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {isPlan ? "Plan" : "Kredit"}
            </span>
            <StatusBadge status={item.status} />
          </div>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{getBillingRequestSummary(item)}</h3>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.paymentChannelLabel || item.paymentMethodLabel} • {formatDate(item.timestamp)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Nilai</p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "1.15rem", fontWeight: 900 }}>{formatRupiah(item.finalPrice || item.basePrice || 0)}</p>
        </div>
      </div>
      {!isPlan && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
          <div style={{ padding: "0.85rem", borderRadius: 16, backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Kredit Masuk</p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "1.05rem", fontWeight: 800 }}>+{Number(item.amount || 0).toLocaleString("id-ID")}</p>
          </div>
          {item.promoCode && (
            <div style={{ padding: "0.85rem", borderRadius: 16, backgroundColor: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>Promo</p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "1.05rem", fontWeight: 800, color: "#047857" }}>{item.promoCode}</p>
            </div>
          )}
        </div>
      )}
      {item.rejectedReason && (
        <div style={{ padding: "1rem", borderRadius: 16, backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#B91C1C", fontSize: "0.85rem" }}>
          <strong>Catatan admin:</strong> {item.rejectedReason}
        </div>
      )}
    </div>
  );
}

function StepperProgress({ currentStep, steps }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "1rem", margin: "0 -1rem 1rem", padding: "0 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", position: "relative", minWidth: "450px" }}>
        <div style={{ position: "absolute", top: "20px", left: 0, right: 0, height: "2px", backgroundColor: "var(--border)", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "20px", left: 0, width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`, height: "2px", backgroundColor: "var(--primary)", transition: "width 0.4s ease", zIndex: 0 }} />
        
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isPast = stepNum < currentStep;
          return (
            <div key={stepNum} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, position: "relative", width: "80px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 800, backgroundColor: isActive || isPast ? "var(--primary)" : "var(--surface)", color: isActive || isPast ? "#fff" : "var(--text-muted)", border: `2px solid ${isActive || isPast ? "var(--primary)" : "var(--border)"}`, transition: "all 0.3s ease", boxShadow: isActive ? "0 0 0 4px rgba(79,70,229,0.2)" : "none" }}>
                {isPast ? <PremiumIcon name="check" size={18} /> : stepNum}
              </div>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", fontWeight: isActive ? 800 : 700, color: isActive ? "var(--text-main)" : "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LanggananPage() {
  const { user, userData, refreshUserData } = useAuth();
  const { plans, topups, planMap, topupMap } = useBillingCatalog();
  const activePromos = useActivePromos();
  const userRequests = useUserBillingRequests(user?.uid);

  const currentPlan = userData?.plan || "free";
  const currentCredits = userData?.credits ?? 0;

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState("manual");

  const totalSteps = paymentMethodId === "manual" ? 5 : 4;
  const stepLabels = paymentMethodId === "manual" 
    ? ["Pilih Paket", "Metode", "Ringkasan", "Bayar", "Upload Bukti"]
    : ["Pilih Paket", "Metode", "Ringkasan", "Bayar"];
  const [paymentChannelId, setPaymentChannelId] = useState(MANUAL_PAYMENT_CHANNELS[0]?.id || "");
  const [promoInput, setPromoInput] = useState("");
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [billingPeriodId, setBillingPeriodId] = useState("monthly");
  
  // Step 5 specific
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const paymentStatus = searchParams.get("payment");
      if (paymentStatus === "success") {
        setSuccessMsg("Pembayaran berhasil diproses! Saldo atau paket Anda akan segera diperbarui.");
        if (typeof refreshUserData === "function") {
          refreshUserData();
        }
      } else if (paymentStatus === "failed") {
        setErrorMsg("Pembayaran gagal diproses. Silakan coba lagi.");
      } else if (paymentStatus === "cancelled") {
        setErrorMsg("Pembayaran dibatalkan.");
      }

      if (paymentStatus) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const defaultTarget = useMemo(() => {
    const recommendedPlan =
      plans.find((item) => item.planId === "pro" && item.planId !== currentPlan) ||
      plans.find((item) => item.planId !== currentPlan && item.price > 0) ||
      null;

    if (topups.length > 0) {
      const featuredTopup = topups.find((item) => item.popular) || topups[0];
      return { type: "topup", id: featuredTopup.slug };
    }

    if (recommendedPlan) {
      return { type: "plan", id: recommendedPlan.planId };
    }

    return null;
  }, [currentPlan, plans, topups]);

  const selectedOrder = useMemo(() => {
    const target = selectedTarget || defaultTarget;
    if (!target) return null;

    if (target.type === "plan") {
      const item = planMap[target.id];
      return item ? { type: "plan", item } : null;
    }

    const item = topupMap[target.id];
    return item ? { type: "topup", item } : null;
  }, [defaultTarget, planMap, selectedTarget, topupMap]);

  const selectedPaymentMethod = getPaymentMethodById(paymentMethodId);
  const selectedPaymentChannel = getPaymentChannelById(paymentChannelId);

  const basePriceForPeriod = useMemo(() => {
    if (selectedOrder?.type === "plan") {
      return calculatePeriodPrice(selectedOrder.item.price || 0, billingPeriodId).totalPrice;
    }
    return selectedOrder?.item?.price || 0;
  }, [selectedOrder, billingPeriodId]);

  const priceBreakdown = useMemo(
    () => calculatePromoBreakdown(basePriceForPeriod, selectedPromo),
    [basePriceForPeriod, selectedPromo]
  );

  const groupedChannels = useMemo(() => {
    return {
      bank: MANUAL_PAYMENT_CHANNELS.filter((item) => item.group === "bank"),
      qris: MANUAL_PAYMENT_CHANNELS.filter((item) => item.group === "qris"),
      ewallet: MANUAL_PAYMENT_CHANNELS.filter((item) => item.group === "ewallet"),
    };
  }, []);

  const pendingRequests = userRequests.filter((item) => item.status === "pending");
  const latestRequests = userRequests.slice(0, 6);

  const clearMessages = () => {
    setSuccessMsg("");
    setErrorMsg("");
  };

  const handleApplyPromo = async (codeFromChip = "") => {
    const finalCode = (codeFromChip || promoInput).trim().toUpperCase();
    if (!finalCode) {
      setPromoError("Masukkan kode promo terlebih dahulu.");
      return;
    }

    setPromoLoading(true);
    setPromoError("");
    try {
      const promo = await validatePromoCode(finalCode);
      setSelectedPromo(promo);
      setPromoInput(finalCode);
    } catch (error) {
      setSelectedPromo(null);
      setPromoError(error.message || "Kode promo tidak valid.");
    } finally {
      setPromoLoading(false);
    }
  };

  const validateStep = (step) => {
    clearMessages();
    if (step === 1) {
      if (!selectedOrder) {
        setErrorMsg("Pilih plan atau top up terlebih dahulu.");
        return false;
      }
      if (selectedOrder.type === "plan" && selectedOrder.item.planId === currentPlan) {
        setErrorMsg("Plan ini sudah aktif di akun Anda.");
        return false;
      }
    }
    if (step === 2) {
      if (paymentMethodId === "manual" && !selectedPaymentChannel) {
        setErrorMsg("Pilih channel pembayaran manual terlebih dahulu.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    clearMessages();
  };

  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Ukuran file maksimal 5MB.");
        return;
      }
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file) => {
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
    
    // 1. Get Signature
    const sigRes = await fetch(`${WORKER_URL}/api/cloudinary-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "Skripzy/Pembayaran" }),
    });
    
    if (!sigRes.ok) throw new Error("Gagal mendapatkan signature Cloudinary.");
    const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

    // 2. Upload to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", "Skripzy/Pembayaran");

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) throw new Error("Upload bukti transfer gagal.");
    const uploadData = await uploadRes.json();
    return uploadData.secure_url;
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedOrder) return;
    clearMessages();

    setSubmitting(true);
    try {
      if (paymentMethodId === "automatic") {
        const dokuRes = await createDokuPayment({
          user, userData,
          requestType: selectedOrder.type,
          selectedItem: selectedOrder.item,
          promo: selectedPromo,
          priceBreakdown,
          billingPeriod: billingPeriodId,
        });

        if (dokuRes.paymentUrl) {
          window.location.href = dokuRes.paymentUrl;
          return; 
        }
      } else {
        // Validation for step 5
        if (currentStep === 5 && !proofFile) {
           setErrorMsg("Harap unggah bukti transfer.");
           setSubmitting(false);
           return;
        }

        let proofUrl = "";
        if (currentStep === 5 && proofFile) {
          proofUrl = await uploadToCloudinary(proofFile);
        }

        await createBillingRequest({
          user, userData,
          requestType: selectedOrder.type,
          selectedItem: selectedOrder.item,
          paymentMethodId,
          paymentChannelId,
          promo: selectedPromo,
          priceBreakdown,
          customerNotes,
          referenceNumber,
          proofImageUrl: proofUrl
        });

        setSuccessMsg(
          selectedOrder.type === "plan"
            ? "Permintaan upgrade plan berhasil dikirim. Admin akan memverifikasi pembayaran manual Anda."
            : "Permintaan top-up kredit berhasil dikirim. Kredit akan masuk setelah admin menyetujui pembayaran."
        );
        
        // Reset form to start
        setCurrentStep(1);
        setCustomerNotes("");
        setReferenceNumber("");
        setProofFile(null);
        setUploadPreview("");
      }
    } catch (error) {
      setErrorMsg(error.message || "Gagal membuat permintaan pembayaran.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto", padding: "0 1.25rem 3rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "2rem" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)", paddingTop: "0.2rem" }}>
          <PremiumIcon name="arrowLeft" size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 900 }}>Billing Studio</h1>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.92rem", color: "var(--text-muted)" }}>
            Langganan & Top Up yang langsung terhubung ke admin.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "clamp(1.25rem, 5vw, 2rem)", boxShadow: "0 12px 32px rgba(0,0,0,0.03)", marginBottom: "2rem" }}>
        <StepperProgress currentStep={currentStep} steps={stepLabels} />

        {(successMsg || errorMsg) && (
          <div style={{ marginBottom: "1.25rem", padding: "1rem", borderRadius: 18, border: `1px solid ${successMsg ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`, backgroundColor: successMsg ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", color: successMsg ? "#047857" : "#B91C1C", display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
            <PremiumIcon name={successMsg ? "checkCircle" : "alertCircle"} size={18} style={{ marginTop: "2px" }} />
            <span style={{ fontWeight: 700 }}>{successMsg || errorMsg}</span>
          </div>
        )}

        {/* STEP 1: PILIH PAKET */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>Pilih Plan Langganan</h2>
              </div>
              <div style={{ 
                display: "flex", 
                gap: "0.4rem", 
                background: "var(--surface)", 
                padding: "0.35rem", 
                borderRadius: "999px", 
                border: "1px solid var(--border)",
                maxWidth: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}>
                <style dangerouslySetInnerHTML={{ __html: `
                  div::-webkit-scrollbar { display: none; }
                `}} />
                {BILLING_PERIODS.map((period) => (
                  <button 
                    key={period.id} 
                    onClick={() => setBillingPeriodId(period.id)} 
                    style={{ 
                      padding: "0.5rem 0.9rem", 
                      borderRadius: "999px", 
                      fontSize: "0.8rem", 
                      fontWeight: billingPeriodId === period.id ? 800 : 600, 
                      background: billingPeriodId === period.id ? "var(--primary)" : "transparent", 
                      color: billingPeriodId === period.id ? "#fff" : "var(--text-muted)", 
                      border: "none", 
                      cursor: "pointer", 
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      flexShrink: 0
                    }}
                  >
                    {period.label}
                    {period.discount > 0 && (
                      <span style={{ 
                        padding: "0.15rem 0.45rem", 
                        borderRadius: "999px", 
                        background: billingPeriodId === period.id ? "rgba(255,255,255,0.25)" : "rgba(16,185,129,0.15)", 
                        color: billingPeriodId === period.id ? "#fff" : "#059669", 
                        fontSize: "0.62rem", 
                        fontWeight: 900 
                      }}>
                        -{period.discount}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {plans.map((plan) => {
                const isSelected = selectedOrder?.type === "plan" && selectedOrder.item.planId === plan.planId;
                const isCurrent = currentPlan === plan.planId;
                return (
                  <ChoiceCard key={plan.planId} title={plan.name} subtitle={plan.description} badge={plan.popular ? "Paling Dipilih" : isCurrent ? "Aktif" : null} selected={isSelected} disabled={false} accent={plan.accent} onClick={() => { clearMessages(); setSelectedTarget({ type: "plan", id: plan.planId }); }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Rp</span>
                      <span style={{ fontSize: "2rem", fontWeight: 900 }}>{Number(calculatePeriodPrice(plan.price || 0, billingPeriodId).finalPrice).toLocaleString("id-ID")}</span>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>/{BILLING_PERIODS.find(p => p.id === billingPeriodId)?.label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                      {plan.creditsPerMonth && <div style={{ display: "flex", gap: "0.5rem" }}><PremiumIcon name="coins" size={15} style={{ color: "#F59E0B" }} /> <span style={{ fontSize: "0.82rem", fontWeight: 800 }}>{plan.creditsPerMonth} Kredit / bulan</span></div>}
                      {plan.features.map((feature) => (
                        <div key={feature} style={{ display: "flex", gap: "0.5rem" }}><PremiumIcon name="checkCircle" size={15} style={{ color: plan.accent }} /> <span style={{ fontSize: "0.82rem" }}>{feature}</span></div>
                      ))}
                    </div>
                  </ChoiceCard>
                );
              })}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>Top Up Kredit Dinamis</h2>
            </div>
            
            {topups.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {topups.map((item) => {
                  const isSelected = selectedOrder?.type === "topup" && selectedOrder.item.slug === item.slug;
                  return (
                    <ChoiceCard key={item.slug} title={item.name} subtitle={item.description} badge={item.badgeText} selected={isSelected} disabled={false} accent={item.accent} onClick={() => { clearMessages(); setSelectedTarget({ type: "topup", id: item.slug }); }}>
                      <div style={{ padding: "0.9rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
                        <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Kredit</p>
                        <p style={{ margin: "0.3rem 0 0", fontSize: "1.65rem", fontWeight: 900 }}>{getTotalCreditsFromTopup(item).toLocaleString("id-ID")}</p>
                      </div>
                      <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Harga paket</span>
                        <span style={{ fontSize: "1rem", fontWeight: 900 }}>{formatRupiah(item.price)}</span>
                      </div>
                    </ChoiceCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: METODE PEMBAYARAN */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
             <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>Pilih Metode Pembayaran</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
              {PAYMENT_METHODS.map((item) => {
                const isSelected = paymentMethodId === item.id;
                return (
                  <ChoiceCard key={item.id} title={item.label} subtitle={item.description} badge={item.badgeText} selected={isSelected} disabled={false} accent={item.accent} onClick={() => { setPaymentMethodId(item.id); clearMessages(); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 0.9rem", borderRadius: 14, backgroundColor: item.id === "automatic" ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.08)", color: item.id === "automatic" ? "#2563EB" : "#047857", fontSize: "0.8rem", fontWeight: 700 }}>
                      <PremiumIcon name={item.id === "automatic" ? "sparkles" : "checkCircle"} size={16} />
                      {item.id === "automatic" ? "Checkout otomatis via DOKU" : "Verifikasi manual oleh admin"}
                    </div>
                  </ChoiceCard>
                );
              })}
            </div>

            {paymentMethodId === "manual" && (
              <div className="animate-fade-in">
                {[ { key: "bank", title: "Bank Transfer" }, { key: "qris", title: "QRIS" }, { key: "ewallet", title: "E-Wallet" } ].map((group) => (
                  <div key={group.key} style={{ marginBottom: "1.5rem" }}>
                    <p style={{ margin: "0 0 0.7rem", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{group.title}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "0.8rem" }}>
                      {groupedChannels[group.key].map((channel) => (
                        <ChoiceCard key={channel.id} title={channel.label} subtitle={channel.helper} badge={paymentChannelId === channel.id ? "Dipilih" : null} selected={paymentChannelId === channel.id} disabled={false} accent={channel.accent} onClick={() => setPaymentChannelId(channel.id)}>
                          <div style={{ padding: "0.75rem 0.9rem", borderRadius: 14, backgroundColor: "var(--surface-hover)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                            <div>
                              <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Detail Tujuan</p>
                              <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", fontWeight: 800 }}>{channel.value}</p>
                            </div>
                            {channel.logo ? (
                               <Image src={channel.logo} alt={channel.label} width={36} height={36} style={{objectFit: "contain", borderRadius: 8}}/>
                            ) : (
                               <PremiumIcon name={channel.icon} size={24} style={{ color: channel.accent }} />
                            )}
                          </div>
                        </ChoiceCard>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: RINGKASAN */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>Pesanan Anda</h2>
            </div>
            <div style={{ padding: "clamp(1rem, 4vw, 1.5rem)", borderRadius: 20, background: selectedOrder?.type === "plan" ? "linear-gradient(135deg, rgba(79,70,229,0.08), transparent)" : "linear-gradient(135deg, rgba(16,185,129,0.08), transparent)", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Produk Dipilih</p>
                  <h3 style={{ margin: "0.32rem 0 0", fontSize: "1.2rem", fontWeight: 900 }}>{selectedOrder?.item.name}</h3>
                </div>
              </div>
              <div style={{ display: "grid", gap: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span className="text-muted">Harga Dasar</span>
                  <strong>{formatRupiah(priceBreakdown.basePrice)}</strong>
                </div>
                {priceBreakdown.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span className="text-muted">Diskon Promo</span>
                    <strong style={{ color: "#059669" }}>-{formatRupiah(priceBreakdown.discountAmount)}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span className="text-muted">Metode</span>
                  <strong>{selectedPaymentMethod?.label || "-"}</strong>
                </div>
                {paymentMethodId === "manual" && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span className="text-muted">Channel</span>
                    <strong>{selectedPaymentChannel?.label || "-"}</strong>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px dashed var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700 }}>TOTAL TAGIHAN</p>
                <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "var(--primary)" }}>{formatRupiah(priceBreakdown.finalPrice)}</p>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 20, padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>Punya Promo?</h3>
              <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <input type="text" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Masukkan kode promo" className="form-input" style={{ flex: "1 1 200px" }} />
                <button type="button" onClick={() => handleApplyPromo()} className="btn btn-outline" disabled={promoLoading}>
                  {promoLoading ? "Cek..." : "Pakai Promo"}
                </button>
              </div>
              {selectedPromo && (
                <div style={{ marginTop: "1rem", padding: "0.9rem", borderRadius: 14, backgroundColor: "rgba(16,185,129,0.08)", color: "#047857", fontSize: "0.85rem" }}>
                  Promo <strong>{selectedPromo.code}</strong> aktif. Potongan: <strong>{formatRupiah(priceBreakdown.discountAmount)}</strong>
                </div>
              )}
              {promoError && <p style={{ margin: "0.65rem 0 0", fontSize: "0.85rem", color: "#B91C1C", fontWeight: 700 }}>{promoError}</p>}
            </div>

            {paymentMethodId === "manual" && (
              <div style={{ marginTop: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.5rem" }}>Catatan Tambahan (Opsional)</label>
                <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} className="form-textarea" rows={3} placeholder="Contoh: Transfer atas nama Budi." />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: BAYAR */}
        {currentStep === 4 && (
          <div className="animate-fade-in" style={{ textAlign: "center", padding: "2rem 0" }}>
             <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "rgba(79,70,229,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
               <PremiumIcon name="sparkles" size={40} style={{ color: "var(--primary)" }} />
             </div>
             <h2 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "0.5rem" }}>Selesaikan Pembayaran</h2>
             <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 400, margin: "0 auto 2rem" }}>
               {paymentMethodId === "automatic" 
                 ? "Anda akan diarahkan ke payment gateway DOKU untuk menyelesaikan pembayaran dengan aman."
                 : `Lanjutkan untuk melihat detail rekening dan mengunggah bukti transfer manual Anda ke ${selectedPaymentChannel?.label}.`}
             </p>
             
             <div style={{ background: "var(--surface-hover)", padding: "1.5rem", borderRadius: 16, display: "inline-block", textAlign: "left", minWidth: 280, marginBottom: "2rem" }}>
               <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total yang harus dibayar</p>
               <p style={{ margin: "0.5rem 0 0", fontSize: "2rem", fontWeight: 900 }}>{formatRupiah(priceBreakdown.finalPrice)}</p>
             </div>

             <div>
              {paymentMethodId === "automatic" ? (
                <button onClick={handleSubmitRequest} disabled={submitting} className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.05rem", borderRadius: 999 }}>
                  {submitting ? "Mengarahkan..." : "Bayar via DOKU Sekarang"}
                </button>
              ) : (
                <button onClick={nextStep} className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.05rem", borderRadius: 999 }}>
                  Lanjut ke Bukti Transfer
                </button>
              )}
             </div>
          </div>
        )}

        {/* STEP 5: UPLOAD BUKTI (MANUAL ONLY) */}
        {currentStep === 5 && paymentMethodId === "manual" && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: "2rem", textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>Upload Bukti Pembayaran</h2>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                Silakan transfer sebesar <strong>{formatRupiah(priceBreakdown.finalPrice)}</strong> ke rekening berikut:
              </p>
            </div>

            <div style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: "clamp(1rem, 4vw, 1.5rem)", marginBottom: "2rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
               {selectedPaymentChannel?.qrisImage ? (
                  <div style={{ flexShrink: 0, backgroundColor: "#fff", padding: "0.5rem", borderRadius: 12 }}>
                    <Image src={selectedPaymentChannel.qrisImage} alt="QRIS Code" width={180} height={180} style={{ objectFit: "contain", borderRadius: 8 }} />
                  </div>
               ) : selectedPaymentChannel?.logo ? (
                  <div style={{ flexShrink: 0, backgroundColor: "#fff", padding: "1rem", borderRadius: 12 }}>
                    <Image src={selectedPaymentChannel.logo} alt="Logo" width={80} height={80} style={{ objectFit: "contain" }} />
                  </div>
               ) : null}
               <div style={{ flex: 1 }}>
                 <p style={{ margin: 0, fontSize: "0.85rem", color: "#059669", fontWeight: 700, textTransform: "uppercase" }}>{selectedPaymentChannel?.label}</p>
                 <p style={{ margin: "0.5rem 0", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "1px" }}>{selectedPaymentChannel?.value}</p>
                 <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>{selectedPaymentChannel?.helper}</p>
               </div>
            </div>

            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>Username Akun</label>
                <input type="text" className="form-input" disabled value={userData?.namaLengkap || user?.displayName || user?.email || ""} style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-muted)" }} />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>Metode Pembayaran</label>
                <input type="text" className="form-input" disabled value={selectedPaymentChannel?.label || ""} style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-muted)" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>No Referensi Transaksi (Opsional)</label>
                <input type="text" className="form-input" placeholder="Masukkan nomor referensi jika ada" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>Bukti Transfer (Image) <span style={{color: "#EF4444"}}>*</span></label>
                <div style={{ border: "2px dashed var(--border)", borderRadius: 16, padding: "2rem", textAlign: "center", position: "relative", backgroundColor: "var(--surface-hover)", transition: "all 0.2s ease" }}>
                  <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleProofChange} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", zIndex: 2 }} />
                  {uploadPreview ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                      <div style={{ position: "relative", width: "100%", maxWidth: 300, height: 200, borderRadius: 12, overflow: "hidden" }}>
                        <Image src={uploadPreview} alt="Bukti Transfer" fill style={{ objectFit: "cover" }} />
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>Klik untuk mengganti gambar</p>
                    </div>
                  ) : (
                    <div style={{ pointerEvents: "none" }}>
                      <PremiumIcon name="upload" size={32} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                      <p style={{ margin: 0, fontWeight: 700 }}>Klik atau seret file ke sini</p>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>PNG, JPG, WEBP maksimal 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
               <button onClick={handleSubmitRequest} disabled={submitting || !proofFile} className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.05rem", borderRadius: 999 }}>
                  {submitting ? "Mengunggah & Mengirim..." : "Kirim Bukti Pembayaran"}
               </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
           <button onClick={prevStep} disabled={currentStep === 1 || submitting} className="btn btn-ghost" style={{ opacity: currentStep === 1 ? 0 : 1 }}>
             Kembali
           </button>
           
           {(currentStep < totalSteps && currentStep !== 4) && (
             <button onClick={nextStep} className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", borderRadius: 999 }}>
               Lanjutkan
             </button>
           )}
        </div>
      </div>

      <section style={{ marginTop: "4rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900 }}>Riwayat Permintaan Anda</h2>
        </div>
        {latestRequests.length === 0 ? (
          <div style={{ backgroundColor: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 22, padding: "3rem", textAlign: "center" }}>
            <PremiumIcon name="inbox" size={34} style={{ opacity: 0.35, marginBottom: "0.8rem" }} />
            <p style={{ margin: 0, fontWeight: 800 }}>Belum ada request pembayaran.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
            {latestRequests.map((item) => (
              <OrderHistoryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
