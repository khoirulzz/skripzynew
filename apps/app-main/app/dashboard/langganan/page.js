"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/AuthProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";
import DefaultSpinner from "@/components/ui/DefaultSpinner";
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
  createIpaymuPayment,
  updateBillingRequest,
  generateDynamicQRIS,
  checkDuplicateReference,
  analyzeReceiptText,
} from "@/lib/billing";
import { approveTopup } from "@/lib/adminCredits";
import {
  useActivePromos,
  useBillingCatalog,
  useUserBillingRequests,
} from "@/lib/useBillingCatalog";
import { d1Request } from "@/lib/d1Client";

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
const WORKER_SECRET = process.env.NEXT_PUBLIC_WORKER_SECRET || "skripzy1234";

const normalizeText = (val) => String(val || "").trim();

const STATUS_STYLES = {
  progress: { bg: "rgba(14,165,233,0.12)", color: "#0284C7", label: "Dalam Proses" },
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

function ChoiceCard({ title, subtitle, badge, selected, disabled, accent, onClick, children, price }) {
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
            <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>{title}</h3>
            {badge && (
              <span style={{ padding: "0.25rem 0.65rem", borderRadius: 999, backgroundColor: selected ? accent : `${accent}20`, color: selected ? "#fff" : accent, fontSize: "0.6rem", fontWeight: 800, whiteSpace: "nowrap", transition: "all 0.3s ease" }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{subtitle}</p>}
          {price && !isExpanded && (
            <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text-main)" }}>{price}</span>
            </div>
          )}
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
  const [productType, setProductType] = useState("plan");
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState("manual");
  const [isMobile, setIsMobile] = useState(false);
  const [initialPaymentStatus] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("payment") || "";
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
  const [activeManualGroup, setActiveManualGroup] = useState(null); // Default to null so nothing is expanded initially


  const [submitting, setSubmitting] = useState(false);
  const [ocrProgressMsg, setOcrProgressMsg] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(() =>
    initialPaymentStatus === "success"
      ? "Pembayaran berhasil diproses! Saldo atau paket Anda akan segera diperbarui."
      : ""
  );
  const [errorMsg, setErrorMsg] = useState(() => {
    if (initialPaymentStatus === "failed") return "Pembayaran gagal diproses. Silakan coba lagi.";
    if (initialPaymentStatus === "cancelled") return "Pembayaran dibatalkan.";
    return "";
  });

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
    const target = selectedTarget;
    if (!target) return null;

    if (target.type === "plan") {
      const item = planMap[target.id];
      return item ? { type: "plan", item } : null;
    }

    const item = topupMap[target.id];
    return item ? { type: "topup", item } : null;
  }, [planMap, selectedTarget, topupMap]);

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

  const dynamicQRISPayload = useMemo(() => {
    if (selectedPaymentChannel?.id === "qris-main" && priceBreakdown?.finalPrice) {
      const baseQRIS = "00020101021126610014COM.GO-JEK.WWW01189360091438876418720210G8876418720303UMI51440014ID.CO.QRIS.WWW0215ID10243599556960303UMI5204829953033605802ID5928Skripzy, Digital & Education6010PEKALONGAN61055116462070703A0163041982";
      try {
        return generateDynamicQRIS(baseQRIS, priceBreakdown.finalPrice);
      } catch (err) {
        console.error("Error generating dynamic QRIS:", err);
      }
    }
    return null;
  }, [selectedPaymentChannel, priceBreakdown]);

  const groupedChannels = useMemo(() => {
    return {
      bank: MANUAL_PAYMENT_CHANNELS.filter((item) => item.group === "bank"),
      qris: MANUAL_PAYMENT_CHANNELS.filter((item) => item.group === "qris"),
      ewallet: MANUAL_PAYMENT_CHANNELS.filter((item) => item.group === "ewallet"),
    };
  }, []);

  useEffect(() => {
    if (!initialPaymentStatus || typeof window === "undefined") return;

    if (initialPaymentStatus === "success" && typeof refreshUserData === "function") {
      refreshUserData();
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }, [initialPaymentStatus, refreshUserData]);

  // Effect to create billing request with status "waiting_payment" when reaching Step 5
  useEffect(() => {
    if (currentStep === 5 && paymentMethodId === "manual" && !activeRequestId && selectedOrder && user) {
      const initProgressRequest = async () => {
        try {
          const id = await createBillingRequest({
            user,
            userData,
            requestType: selectedOrder.type,
            selectedItem: selectedOrder.item,
            paymentMethodId,
            paymentChannelId,
            promo: selectedPromo,
            priceBreakdown,
            customerNotes,
            referenceNumber,
            proofImageUrl: "",
            status: "waiting_payment",
          });
          setActiveRequestId(id);
        } catch (e) {
          console.error("Error creating progress request:", e);
        }
      };
      initProgressRequest();
    }
  }, [currentStep, paymentMethodId, activeRequestId, selectedOrder, user, userData, paymentChannelId, selectedPromo, priceBreakdown, customerNotes, referenceNumber]);

  // Effect to update billing request in DB as details are changed
  useEffect(() => {
    if (activeRequestId && currentStep === 5 && selectedOrder) {
      const updateProgressRequest = async () => {
        try {
          await updateBillingRequest(activeRequestId, {
            paymentMethodId,
            paymentMethodLabel: selectedPaymentMethod?.label || "",
            paymentChannelId,
            paymentChannelLabel: selectedPaymentChannel?.label || "",
            paymentChannelGroup: selectedPaymentChannel?.group || "",
            customerNotes,
            referenceNumber,
            promoId: selectedPromo?.id || null,
            promoCode: selectedPromo?.code || null,
            promoType: selectedPromo?.type || null,
            basePrice: priceBreakdown.basePrice,
            discountAmount: priceBreakdown.discountAmount,
            finalPrice: priceBreakdown.finalPrice,
          });
        } catch (e) {
          console.error("Error updating progress request:", e);
        }
      };
      updateProgressRequest();
    }
  }, [activeRequestId, currentStep, paymentMethodId, paymentChannelId, selectedPaymentMethod, selectedPaymentChannel, customerNotes, referenceNumber, selectedPromo, priceBreakdown, selectedOrder]);

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
      const promo = await validatePromoCode(finalCode, selectedOrder?.type || "all", basePriceForPeriod);
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
    // 1. Get Signature
    const sigRes = await fetch(`${WORKER_URL}/api/cloudinary-sign`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-skripzy-secret": WORKER_SECRET 
      },
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
    setOcrProgressMsg("Menyiapkan transaksi...");
    try {
      if (paymentMethodId === "automatic") {
        const ipaymuRes = await createIpaymuPayment({
          user, userData,
          requestType: selectedOrder.type,
          selectedItem: selectedOrder.item,
          promo: selectedPromo,
          priceBreakdown,
          billingPeriod: billingPeriodId,
        });

        if (ipaymuRes.paymentUrl) {
          window.location.href = ipaymuRes.paymentUrl;
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
          setOcrProgressMsg("Mengunggah bukti transfer...");
          proofUrl = await uploadToCloudinary(proofFile);
        }

        // --- START OCR SCAN & VALIDATION ---
        setOcrProgressMsg("Memulai verifikasi cerdas AI Vision...");
        
        let ocrResult = null;
        let ocrScore = 0;
        let isDuplicate = false;
        let detectedRef = referenceNumber;
        let isEdited = false;
        
        try {
          setOcrProgressMsg("Menganalisis gambar dengan AI Vision...");
          const targetPrice = priceBreakdown.finalPrice;
          
          const aiRes = await fetch(`${WORKER_URL}/api/ocr-receipt`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-skripzy-secret": WORKER_SECRET 
            },
            body: JSON.stringify({
              proofUrl,
              targetPrice,
              paymentChannelId
            })
          });

          if (!aiRes.ok) throw new Error("Gagal memanggil API AI Vision");
          ocrResult = await aiRes.json();
          
          ocrScore = ocrResult.score || 0;
          if (ocrResult.extractedRef) {
            detectedRef = ocrResult.extractedRef;
          }
          isEdited = !!ocrResult.isEdited;
          
          if (!isEdited) {
            // Anti-Counterfeit duplicate check
            setOcrProgressMsg("Memeriksa keaslian transaksi...");
            if (detectedRef) {
              isDuplicate = await checkDuplicateReference(detectedRef, activeRequestId);
            }
          }
        } catch (ocrErr) {
          console.error("AI scan failed, falling back to manual confirmation:", ocrErr);
          if (!ocrResult) {
            ocrResult = { reasons: ["Gagal memproses AI Vision: " + ocrErr.message] };
          } else {
            ocrResult.reasons = ocrResult.reasons || [];
            ocrResult.reasons.push("Error AI Vision: " + ocrErr.message);
          }
        }
        
        if (isEdited) {
          ocrScore = 0;
          ocrResult.reasons = ocrResult.reasons || [];
          ocrResult.reasons.push("INDIKASI EDITAN FOTO/PEMALSUAN TERDETEKSI OLEH AI");
        }

        if (isDuplicate) {
          ocrScore = 0;
          ocrResult.reasons = ocrResult.reasons || [];
          ocrResult.reasons.push("NOMOR REFERENSI GANDA TERDETEKSI (Indikasi Pemalsuan)");
        }
        
        let finalStatus = "pending";
        let isAutoApproved = false;
        
        const autoApproveThreshold = 75;
        if (ocrScore >= autoApproveThreshold && !isDuplicate) {
          finalStatus = "approved";
          isAutoApproved = true;
        }
        
        let updatedNotes = customerNotes || "";
        const ocrLog = `\n\n[SISTEM OCR VERIFIKASI]\n- Skor Kecocokan: ${ocrScore}/100\n- Referensi Terdeteksi: ${detectedRef || "-"}\n- Auto-Approve: ${isAutoApproved ? "YA" : "TIDAK (Konfirmasi Manual Admin)"}\n- Catatan OCR: ${ocrResult ? ocrResult.reasons.join(", ") : "Gagal membaca struk"}`;
        updatedNotes += ocrLog;
        
        const finalRef = detectedRef || referenceNumber || `TRX-${Date.now()}`;
        const targetRequestId = activeRequestId;
        
        if (targetRequestId) {
          await updateBillingRequest(targetRequestId, {
            status: finalStatus,
            customerNotes: normalizeText(updatedNotes),
            referenceNumber: normalizeText(finalRef),
            proofImageUrl: proofUrl,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Fallback if no activeRequestId
          await createBillingRequest({
            user, userData,
            requestType: selectedOrder.type,
            selectedItem: selectedOrder.item,
            paymentMethodId,
            paymentChannelId,
            promo: selectedPromo,
            priceBreakdown,
            customerNotes: updatedNotes,
            referenceNumber: finalRef,
            proofImageUrl: proofUrl,
            status: finalStatus
          });
        }
        
        if (isAutoApproved) {
          setOcrProgressMsg("Pembayaran terverifikasi! Sedang menambahkan kredit...");
          if (targetRequestId) {
            await approveTopup(
              targetRequestId, 
              user.uid, 
              selectedOrder.type === "plan" ? 0 : getTotalCreditsFromTopup(selectedOrder.item)
            );
          }
          
          const msg = selectedOrder.type === "plan"
            ? "Pembayaran Anda terverifikasi otomatis oleh sistem! Akun Anda telah di-upgrade ke plan baru."
            : `Pembayaran terverifikasi otomatis! Anda berhasil melakukan top-up sebesar ${getTotalCreditsFromTopup(selectedOrder.item).toLocaleString("id-ID")} kredit.`;
          setSuccessMsg(msg);
          setTimeout(() => window.alert("🎉 Pembayaran Berhasil!\n\n" + msg), 100);
        } else {
          const msg = selectedOrder.type === "plan"
            ? "Bukti pembayaran diterima. Pembayaranmu sedang diverifikasi Admin/Sistem."
            : "Bukti pembayaran diterima. Pembayaranmu sedang diverifikasi Admin/Sistem.";
          setSuccessMsg(msg);
          setTimeout(() => window.alert("⏳ Menunggu Verifikasi\n\n" + msg), 100);

          await d1Request("notifications", {
            method: "POST",
            body: {
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: user.uid,
              title: "Menunggu Verifikasi",
              message: `Pembayaran manual Anda sedang menunggu verifikasi admin. Kami akan memprosesnya secepat mungkin.`,
              type: "transaction",
              isRead: 0,
              actionUrl: "/dashboard/langganan"
            }
          }).catch(e => console.error("Gagal mengirim notifikasi topup pending", e));
        }
        
        // Reset form
        setCurrentStep(1);
        setCustomerNotes("");
        setReferenceNumber("");
        setProofFile(null);
        setUploadPreview("");
        setActiveRequestId(null);
      }
    } catch (error) {
      setErrorMsg(error.message || "Gagal membuat permintaan pembayaran.");
    } finally {
      setSubmitting(false);
      setOcrProgressMsg("");
    }
  };

  const handleHistoryItemClick = (item) => {
    if (item.status === "progress" || item.status === "waiting_payment") {
      setActiveRequestId(item.id);
      
      if (item.requestType === "plan") {
        setSelectedTarget({ type: "plan", id: item.planId });
        setProductType("plan");
      } else {
        setSelectedTarget({ type: "topup", id: item.topupSlug });
        setProductType("topup");
      }
      
      setPaymentMethodId(item.paymentMethodId || "manual");
      setPaymentChannelId(item.paymentChannelId || "");
      setCustomerNotes(item.customerNotes || "");
      setReferenceNumber(item.referenceNumber || "");
      
      if (item.promoCode) {
        setSelectedPromo({
          id: item.promoId,
          code: item.promoCode,
          type: item.promoType,
          discountAmount: item.discountAmount,
          discountPercent: item.basePrice > 0 ? Math.round((item.discountAmount / item.basePrice) * 100) : 0,
        });
        setPromoInput(item.promoCode);
      } else {
        setSelectedPromo(null);
        setPromoInput("");
      }
      
      setCurrentStep(5);
      clearMessages();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1200px", margin: "0 auto", padding: isMobile ? "0 0 3rem 0" : "0 1.25rem 3rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "2rem", padding: isMobile ? "0 1rem" : "0" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)", paddingTop: "0.2rem" }}>
          <PremiumIcon name="arrowLeft" size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 900 }}>Billing Studio</h1>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.92rem", color: "var(--text-muted)" }}>
            Kelola paket langganan dan saldo kredit Anda dengan mudah dan aman.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", borderLeft: isMobile ? "none" : "1px solid var(--border)", borderRight: isMobile ? "none" : "1px solid var(--border)", borderRadius: isMobile ? 0 : 24, padding: isMobile ? "1.5rem 1rem" : "clamp(1.25rem, 5vw, 2rem)", boxShadow: isMobile ? "none" : "0 12px 32px rgba(0,0,0,0.03)", marginBottom: "2rem" }}>
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
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", padding: "0.4rem", backgroundColor: "var(--surface-hover)", borderRadius: "100px", border: "1px solid var(--border)" }}>
              <button 
                onClick={() => { setProductType('plan'); setSelectedTarget(null); clearMessages(); setActiveRequestId(null); }}
                style={{ flex: 1, padding: "0.75rem", borderRadius: "100px", border: "none", cursor: "pointer", fontWeight: 700, transition: "all 0.2s", backgroundColor: productType === 'plan' ? "var(--primary)" : "transparent", color: productType === 'plan' ? "white" : "var(--text-muted)", boxShadow: productType === 'plan' ? "var(--shadow-sm)" : "none" }}>
                Upgrade Plan
              </button>
              <button 
                onClick={() => { setProductType('topup'); setSelectedTarget(null); clearMessages(); setActiveRequestId(null); }}
                style={{ flex: 1, padding: "0.75rem", borderRadius: "100px", border: "none", cursor: "pointer", fontWeight: 700, transition: "all 0.2s", backgroundColor: productType === 'topup' ? "var(--primary)" : "transparent", color: productType === 'topup' ? "white" : "var(--text-muted)", boxShadow: productType === 'topup' ? "var(--shadow-sm)" : "none" }}>
                Top Up Kredit
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginTop: "-1.2rem", marginBottom: "1.8rem" }}>
              <button 
                type="button"
                onClick={() => setShowInfoModal(true)}
                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 700, padding: "0.3rem 0.6rem", borderRadius: "100px", backgroundColor: "rgba(79,70,229,0.06)", transition: "all 0.2s" }}
              >
                <PremiumIcon name="help" size={14} /> Apa perbedaan Plan & Top Up Kredit?
              </button>
            </div>

            {productType === "plan" ? (
              <>
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

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                  {plans.map((plan) => {
                    const isSelected = selectedOrder?.type === "plan" && selectedOrder.item.planId === plan.planId;
                    const isCurrent = currentPlan === plan.planId;
                    const isFree = plan.planId === "free";
                    return (
                      <ChoiceCard key={plan.planId} title={plan.name} subtitle={plan.description} badge={plan.popular ? "Paling Dipilih" : isCurrent ? "Aktif" : null} selected={isSelected && !isCurrent && !isFree} disabled={isCurrent || isFree} accent={isCurrent || isFree ? "#9CA3AF" : plan.accent} onClick={() => { if(isCurrent || isFree) return; clearMessages(); setSelectedTarget({ type: "plan", id: plan.planId }); setActiveRequestId(null); }} price={formatRupiah(calculatePeriodPrice(plan.price || 0, billingPeriodId).finalPrice)}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Rp</span>
                          <span style={{ fontSize: "1.75rem", fontWeight: 900 }}>{Number(calculatePeriodPrice(plan.price || 0, billingPeriodId).finalPrice).toLocaleString("id-ID")}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>/{BILLING_PERIODS.find(p => p.id === billingPeriodId)?.label}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                          {plan.creditsPerMonth && <div style={{ display: "flex", gap: "0.5rem" }}><PremiumIcon name="coins" size={15} style={{ color: "#F59E0B" }} /> <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{plan.creditsPerMonth} Kredit / bulan</span></div>}
                          {plan.features.map((feature) => (
                            <div key={feature} style={{ display: "flex", gap: "0.5rem" }}><PremiumIcon name="checkCircle" size={15} style={{ color: plan.accent }} /> <span style={{ fontSize: "0.78rem" }}>{feature}</span></div>
                          ))}
                        </div>
                      </ChoiceCard>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: "1.5rem" }}>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900 }}>Top Up Kredit Dinamis</h2>
                </div>
                
                {topups.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                    {topups.map((item) => {
                      const isSelected = selectedOrder?.type === "topup" && selectedOrder.item.slug === item.slug;
                      return (
                        <ChoiceCard key={item.slug} title={item.name} subtitle={item.description} badge={item.badgeText} selected={isSelected} disabled={false} accent={item.accent} onClick={() => { clearMessages(); setSelectedTarget({ type: "topup", id: item.slug }); setActiveRequestId(null); }} price={formatRupiah(item.price)}>
                          <div style={{ padding: "0.9rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
                            <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Kredit</p>
                            <p style={{ margin: "0.3rem 0 0", fontSize: "1.45rem", fontWeight: 900 }}>{getTotalCreditsFromTopup(item).toLocaleString("id-ID")}</p>
                          </div>
                          <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Harga paket</span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 900 }}>{formatRupiah(item.price)}</span>
                          </div>
                        </ChoiceCard>
                      );
                    })}
                  </div>
                )}
              </>
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
                const isAuto = item.id === "automatic";
                return (
                  <ChoiceCard key={item.id} title={item.label} subtitle={item.description} badge={isAuto ? "MAINTENANCE" : item.badgeText} selected={isSelected && !isAuto} disabled={isAuto} accent={isAuto ? "#9CA3AF" : item.accent} onClick={() => { if(isAuto) return; setPaymentMethodId(item.id); if(item.id !== 'manual') setActiveManualGroup(null); clearMessages(); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.8rem 0.9rem", borderRadius: 14, backgroundColor: item.id === "automatic" ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.08)", color: item.id === "automatic" ? (isAuto ? "#9CA3AF" : "#2563EB") : "#047857", fontSize: "0.8rem", fontWeight: 700 }}>
                      <PremiumIcon name={item.id === "automatic" ? "sparkles" : "checkCircle"} size={16} />
                      {item.id === "automatic" ? "Checkout otomatis via iPaymu" : "Verifikasi manual oleh admin"}
                    </div>
                  </ChoiceCard>
                );
              })}
            </div>

            {paymentMethodId === "manual" && (
              <div className="animate-fade-in">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.8rem", marginBottom: "1.5rem" }}>
                  {[ 
                    { key: "bank", title: "Bank Transfer", icon: "creditCard" }, 
                    { key: "qris", title: "QRIS", icon: "sparkles" }, 
                    { key: "ewallet", title: "E-Wallet", icon: "wallet" } 
                  ].map((group) => {
                    const isActive = activeManualGroup === group.key;
                    return (
                      <div 
                        key={group.key}
                        onClick={() => setActiveManualGroup(isActive ? null : group.key)}
                        style={{
                          padding: "1rem",
                          borderRadius: 20,
                          backgroundColor: isActive ? "var(--primary)" : "var(--surface)",
                          color: isActive ? "white" : "var(--text-main)",
                          border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.6rem",
                          transition: "all 0.3s ease",
                          boxShadow: isActive ? "0 8px 16px rgba(79,70,229,0.2)" : "var(--shadow-sm)"
                        }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease" }}>
                          <PremiumIcon name={group.icon} size={22} style={{ color: isActive ? "white" : "var(--text-muted)" }} />
                        </div>
                        <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>{group.title}</span>
                      </div>
                    );
                  })}
                </div>

                {activeManualGroup && (
                  <div className="animate-fade-in" style={{ borderTop: "1px dashed var(--border)", paddingTop: "1.5rem" }}>
                    <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>
                      Pilih Channel {activeManualGroup === 'bank' ? 'Bank' : activeManualGroup === 'qris' ? 'QRIS' : 'E-Wallet'}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "0.8rem" }}>
                      {groupedChannels[activeManualGroup].map((channel) => (
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
                )}
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
                 ? "Anda akan diarahkan ke payment gateway iPaymu untuk menyelesaikan pembayaran dengan aman."
                 : `Lanjutkan untuk melihat detail rekening dan mengunggah bukti transfer manual Anda ke ${selectedPaymentChannel?.label}.`}
             </p>
             
             <div style={{ background: "var(--surface-hover)", padding: "1.5rem", borderRadius: 16, display: "inline-block", textAlign: "left", minWidth: 280, marginBottom: "2rem" }}>
               <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total yang harus dibayar</p>
               <p style={{ margin: "0.5rem 0 0", fontSize: "2rem", fontWeight: 900 }}>{formatRupiah(priceBreakdown.finalPrice)}</p>
             </div>

             <div>
              {paymentMethodId === "automatic" ? (
                <button onClick={handleSubmitRequest} disabled={submitting} className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.05rem", borderRadius: 999 }}>
                  {submitting ? "Mengarahkan..." : "Bayar via iPaymu Sekarang"}
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
               {selectedPaymentChannel?.id === "qris-main" && dynamicQRISPayload ? (
                   <div style={{ flexShrink: 0, backgroundColor: "#fff", padding: "0.5rem", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", border: "2px dashed var(--primary)" }}>
                     <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(dynamicQRISPayload)}`} 
                       alt="QRIS Dinamis" 
                       style={{ width: 180, height: 180, borderRadius: 8 }} 
                     />
                     <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--primary)", backgroundColor: "rgba(79,70,229,0.1)", padding: "0.2rem 0.5rem", borderRadius: "100px" }}>
                       QRIS DINAMIS • Rp {Number(priceBreakdown.finalPrice).toLocaleString("id-ID")}
                     </span>
                   </div>
                ) : selectedPaymentChannel?.qrisImage ? (
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700 }}>Bukti Transfer (Image) <span style={{color: "#EF4444"}}>*</span></label>
                  <button type="button" onClick={() => alert("Pastikan screenshot/foto bukti transfer JELAS dan memuat informasi berikut:\n\n1. Nama Pengirim / Pemilik Rekening\n2. Rekening Tujuan / Bank Tujuan\n3. Nomor Referensi / ID Transaksi\n4. Nominal Transfer (Harus sesuai tagihan)\n5. Tanggal & Waktu Transaksi\n\nHal ini diperlukan untuk memastikan sistem atau admin dapat memverifikasi pembayaran Anda secara cepat dan akurat.")} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", padding: 0 }} title="Info Upload Bukti">
                    <PremiumIcon name="info" size={15} />
                  </button>
                </div>
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

            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1rem" }}>
               {ocrProgressMsg && (
                 <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--primary)", fontSize: "0.88rem", fontWeight: 700, backgroundColor: "var(--surface-hover)", padding: "0.5rem 1rem", borderRadius: "100px", border: "1px solid var(--border)" }}>
                   <DefaultSpinner size="small" color="#4F46E5" />
                   <span>{ocrProgressMsg}</span>
                 </div>
               )}
               <button onClick={() => {
                 if (!proofFile) {
                   setErrorMsg("Harap unggah bukti foto transfer terlebih dahulu.");
                   window.scrollTo({ top: 0, behavior: "smooth" });
                   return;
                 }
                 handleSubmitRequest();
               }} disabled={submitting} className="btn btn-primary" style={{ padding: "1rem 2rem", fontSize: "1.05rem", borderRadius: 999 }}>
                  {submitting ? "Memproses..." : "Kirim Bukti Pembayaran"}
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

      <section style={{ marginTop: "4rem", padding: isMobile ? "0 1rem" : "0" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900 }}>Riwayat Permintaan Anda</h2>
        </div>
        {latestRequests.length === 0 ? (
          <div style={{ backgroundColor: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 22, padding: "3rem", textAlign: "center" }}>
            <PremiumIcon name="inbox" size={34} style={{ opacity: 0.35, marginBottom: "0.8rem" }} />
            <p style={{ margin: 0, fontWeight: 800 }}>Belum ada request pembayaran.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--surface-hover)", borderBottom: "1px solid var(--border)", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Produk</th>
                  <th style={{ padding: "1rem" }}>Metode / Waktu</th>
                  <th style={{ padding: "1rem", textAlign: "right" }}>Nilai</th>
                </tr>
              </thead>
              <tbody>
                {latestRequests.map((item) => {
                  const isPlan = item.requestType === "plan";
                  return (
                    <tr 
                      key={item.id} 
                      onClick={(item.status === "progress" || item.status === "waiting_payment") ? () => handleHistoryItemClick(item) : undefined}
                      style={{ 
                        borderBottom: "1px solid var(--border)", 
                        fontSize: "0.9rem",
                        cursor: (item.status === "progress" || item.status === "waiting_payment") ? "pointer" : "default",
                        backgroundColor: (item.status === "progress" || item.status === "waiting_payment") ? "rgba(14,165,233,0.03)" : "transparent",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (item.status === "progress" || item.status === "waiting_payment") {
                          e.currentTarget.style.backgroundColor = "rgba(14,165,233,0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (item.status === "progress" || item.status === "waiting_payment") {
                          e.currentTarget.style.backgroundColor = (item.status === "progress" || item.status === "waiting_payment") ? "rgba(14,165,233,0.03)" : "transparent";
                        }
                      }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ padding: "0.2rem 0.5rem", borderRadius: 999, backgroundColor: isPlan ? "rgba(79,70,229,0.1)" : "rgba(16,185,129,0.1)", color: isPlan ? "var(--primary)" : "#059669", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>
                            {isPlan ? "Plan" : "Kredit"}
                          </span>
                          <span style={{ fontWeight: 800 }}>{getBillingRequestSummary(item)}</span>
                        </div>
                        {item.promoCode && (
                          <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "#059669" }}>
                            Promo: <strong>{item.promoCode}</strong>
                          </div>
                        )}
                        {item.rejectedReason && (
                          <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "#DC2626" }}>
                            Catatan: {item.rejectedReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-muted)" }}>
                        <div>{item.paymentChannelLabel || item.paymentMethodLabel}</div>
                        <div style={{ fontSize: "0.75rem", marginTop: "0.2rem" }}>{formatDate(item.timestamp)}</div>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: 800 }}>
                        {formatRupiah(item.finalPrice || item.basePrice || 0)}
                        {!isPlan && item.amount > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem", fontWeight: 600 }}>
                            +{Number(item.amount).toLocaleString("id-ID")} Kredit
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showInfoModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "24px", maxWidth: "560px", width: "100%", padding: "2rem", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", position: "relative", animation: "scaleUp 0.3s ease-out" }}>
            <button 
              onClick={() => setShowInfoModal(false)} 
              style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "var(--surface-hover)", border: "none", color: "var(--text-muted)", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            >
              <PremiumIcon name="x" size={16} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "rgba(79,70,229,0.1)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PremiumIcon name="help" size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Perbedaan Plan & Kredit</h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>Pahami kebutuhan akun Anda sebelum bertransaksi</p>
              </div>
            </div>
            
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div style={{ padding: "1.2rem", borderRadius: "18px", border: "1px solid rgba(79,70,229,0.15)", backgroundColor: "rgba(79,70,229,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                  <PremiumIcon name="zap" size={16} style={{ color: "var(--primary)" }} />
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)" }}>Upgrade Plan (Langganan Berkala)</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                  Sistem langganan berkala (bulanan/tahunan). Cocok untuk pemakaian rutin jangka panjang. 
                  Memberikan <strong>kuota kredit bulanan tetap</strong> dan membuka akses ke batas karakter input AI yang lebih besar serta prioritas server.
                </p>
              </div>

              <div style={{ padding: "1.2rem", borderRadius: "18px", border: "1px solid rgba(16,185,129,0.15)", backgroundColor: "rgba(16,185,129,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                  <PremiumIcon name="coins" size={16} style={{ color: "#10B981" }} />
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)" }}>Top Up Kredit (Sekali Beli)</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                  Pembelian kuota kredit tambahan sekali beli. Cocok jika kuota kredit bulanan dari plan Anda habis sebelum masa berakhir, 
                  atau jika Anda hanya ingin memakai fitur premium secara kasual tanpa berlangganan berkala. <strong>Kredit ini tidak akan hangus</strong> dan bersifat akumulatif.
                </p>
              </div>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowInfoModal(false)} className="btn btn-primary" style={{ padding: "0.7rem 1.5rem", borderRadius: "999px" }}>
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
