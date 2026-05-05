"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  pending: {
    bg: "rgba(245,158,11,0.12)",
    color: "#D97706",
    label: "Menunggu Verifikasi",
  },
  approved: {
    bg: "rgba(16,185,129,0.12)",
    color: "#059669",
    label: "Disetujui",
  },
  rejected: {
    bg: "rgba(239,68,68,0.12)",
    color: "#DC2626",
    label: "Ditolak",
  },
  waiting_payment: {
    bg: "rgba(59,130,246,0.12)",
    color: "#2563EB",
    label: "Menunggu Pembayaran",
  },
};

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const tone = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.35rem 0.75rem",
        borderRadius: 999,
        backgroundColor: tone.bg,
        color: tone.color,
        fontSize: "0.74rem",
        fontWeight: 800,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: tone.color,
        }}
      />
      {tone.label}
    </span>
  );
}

function ChoiceCard({
  title,
  subtitle,
  badge,
  selected,
  disabled,
  accent,
  onClick,
  children,
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Auto-expand if selected, or allow toggle
  const isExpanded = selected || expanded;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: selected
          ? `linear-gradient(180deg, ${accent}12, transparent 90%), var(--surface)`
          : "var(--surface)",
        border: `1.5px solid ${selected ? accent : "var(--border)"}`,
        borderRadius: 20,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: selected ? `0 12px 24px ${accent}20` : "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {selected && (
        <div style={{
          position: "absolute",
          top: 0, left: "50%", transform: "translateX(-50%)",
          width: "80%", height: "40%",
          background: `radial-gradient(ellipse at top, ${accent}30, transparent 70%)`,
          filter: "blur(20px)",
          pointerEvents: "none",
        }} />
      )}
      <div style={{ padding: "1.2rem", display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
            {badge && (
              <span
                style={{
                  padding: "0.25rem 0.65rem",
                  borderRadius: 999,
                  backgroundColor: selected ? accent : `${accent}20`,
                  color: selected ? "#fff" : accent,
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  transition: "all 0.3s ease",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{subtitle}</p>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            background: isExpanded ? `${accent}15` : "var(--surface-hover)",
            border: "none",
            color: isExpanded ? accent : "var(--text-muted)",
            cursor: "pointer",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0
          }}
          aria-label="Toggle details"
        >
           <PremiumIcon name="chevronDown" size={18} />
        </button>
      </div>
      
      <div 
        style={{ 
          maxHeight: isExpanded ? "800px" : "0", 
          opacity: isExpanded ? 1 : 0, 
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          padding: isExpanded ? "0 1.2rem 1.2rem 1.2rem" : "0 1.2rem",
          position: "relative",
          zIndex: 1
        }}
      >
        <div style={{ 
          paddingTop: "0.8rem", 
          borderTop: isExpanded ? "1px dashed var(--border)" : "none",
          transition: "border-color 0.3s ease" 
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function OrderHistoryCard({ item }) {
  const isPlan = item.requestType === "plan";

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "1.2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span
              style={{
                padding: "0.25rem 0.65rem",
                borderRadius: 999,
                backgroundColor: isPlan ? "rgba(79,70,229,0.12)" : "rgba(16,185,129,0.12)",
                color: isPlan ? "var(--primary)" : "#059669",
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {isPlan ? "Plan" : "Kredit"}
            </span>
            <StatusBadge status={item.status} />
          </div>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
            {getBillingRequestSummary(item)}
          </h3>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {item.paymentChannelLabel || item.paymentMethodLabel} • {formatDate(item.timestamp)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Nilai
          </p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "1.15rem", fontWeight: 900 }}>
            {formatRupiah(item.finalPrice || item.basePrice || 0)}
          </p>
        </div>
      </div>

      {!isPlan && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.85rem",
          }}
        >
          <div style={{ padding: "0.85rem", borderRadius: 16, backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Kredit Masuk
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "1.05rem", fontWeight: 800 }}>
              +{Number(item.amount || 0).toLocaleString("id-ID")}
            </p>
          </div>
          {item.promoCode && (
            <div style={{ padding: "0.85rem", borderRadius: 16, backgroundColor: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>
                Promo
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "1.05rem", fontWeight: 800, color: "#047857" }}>{item.promoCode}</p>
            </div>
          )}
        </div>
      )}

      {item.rejectedReason && (
        <div
          style={{
            padding: "1rem",
            borderRadius: 16,
            backgroundColor: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "#B91C1C",
            fontSize: "0.85rem",
          }}
        >
          <strong>Catatan admin:</strong> {item.rejectedReason}
        </div>
      )}
    </div>
  );
}

export default function LanggananPage() {
  const { user, userData } = useAuth();
  const { plans, topups, planMap, topupMap } = useBillingCatalog();
  const activePromos = useActivePromos();
  const userRequests = useUserBillingRequests(user?.uid);

  const currentPlan = userData?.plan || "free";
  const currentCredits = userData?.credits ?? 0;

  const [selectedTarget, setSelectedTarget] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState("manual");
  const [paymentChannelId, setPaymentChannelId] = useState(MANUAL_PAYMENT_CHANNELS[0]?.id || "");
  const [promoInput, setPromoInput] = useState("");
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [billingPeriodId, setBillingPeriodId] = useState("monthly");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const paymentStatus = searchParams.get("payment");
      if (paymentStatus === "success") {
        setSuccessMsg("Pembayaran berhasil diproses! Saldo atau paket Anda akan segera diperbarui.");
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

  const handleSubmitRequest = async () => {
    if (!user || !selectedOrder) return;

    clearMessages();

    if (selectedOrder.type === "plan") {
      if (selectedOrder.item.planId === currentPlan) {
        setErrorMsg("Plan ini sudah aktif di akun Anda.");
        return;
      }

      if (Number(selectedOrder.item.price) <= 0) {
        setErrorMsg("Plan gratis tidak memerlukan checkout manual.");
        return;
      }
    }

    if (paymentMethodId === "manual" && !selectedPaymentChannel) {
      setErrorMsg("Pilih channel pembayaran manual terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethodId === "automatic") {
        const dokuRes = await createDokuPayment({
          user,
          userData,
          requestType: selectedOrder.type,
          selectedItem: selectedOrder.item,
          promo: selectedPromo,
          priceBreakdown,
          billingPeriod: billingPeriodId,
        });

        if (dokuRes.paymentUrl) {
          window.location.href = dokuRes.paymentUrl;
          return; // Jangan set submitting ke false agar loading tetap tampil saat redirect
        }
      } else {
        await createBillingRequest({
          user,
          userData,
          requestType: selectedOrder.type,
          selectedItem: selectedOrder.item,
          paymentMethodId,
          paymentChannelId,
          promo: selectedPromo,
          priceBreakdown,
          customerNotes,
        });

        setSuccessMsg(
          selectedOrder.type === "plan"
            ? "Permintaan upgrade plan berhasil dikirim. Admin akan memverifikasi pembayaran manual Anda."
            : "Permintaan top-up kredit berhasil dikirim. Kredit akan masuk setelah admin menyetujui pembayaran."
        );
        setCustomerNotes("");
      }
    } catch (error) {
      setErrorMsg(error.message || "Gagal membuat permintaan pembayaran.");
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1160px", margin: "0 auto", paddingBottom: "3rem" }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          border: "1px solid rgba(79,70,229,0.14)",
          padding: "2rem 1.5rem",
          background:
            "radial-gradient(circle at top left, rgba(79,70,229,0.14), transparent 35%), radial-gradient(circle at top right, rgba(16,185,129,0.12), transparent 30%), var(--surface)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{ color: "var(--text-muted)", paddingTop: "0.2rem" }}>
            <PremiumIcon name="arrowLeft" size={20} />
          </Link>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <p style={{ margin: 0, color: "var(--primary)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800 }}>
              Billing Studio
            </p>
            <h1 style={{ fontSize: "1.75rem", margin: "0.35rem 0 0", fontWeight: 900 }}>
              Langganan & Top Up yang langsung terhubung ke admin
            </h1>
            <p style={{ margin: "0.55rem 0 0", fontSize: "0.92rem", color: "var(--text-muted)", maxWidth: "720px" }}>
              Harga plan, kartu kredit, promo, dan status pembayaran manual kini membaca data yang sama dengan halaman admin, jadi perubahan apa pun akan ikut tampil di sisi user secara realtime.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1.4rem" }}>
          <div style={{ padding: "1rem", borderRadius: 18, backgroundColor: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.14)" }}>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Plan Aktif
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.35rem", fontWeight: 900, textTransform: "capitalize" }}>
              {currentPlan}
            </p>
          </div>
          <div style={{ padding: "1rem", borderRadius: 18, backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.14)" }}>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Kredit Tersisa
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.35rem", fontWeight: 900 }}>
              {Number(currentCredits).toLocaleString("id-ID")}
            </p>
          </div>
          <div style={{ padding: "1rem", borderRadius: 18, backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.14)" }}>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
              Pending Request
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.35rem", fontWeight: 900 }}>
              {pendingRequests.length}
            </p>
          </div>
        </div>
      </div>

      {(successMsg || errorMsg) && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.15rem",
            borderRadius: 18,
            border: `1px solid ${successMsg ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
            backgroundColor: successMsg ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: successMsg ? "#047857" : "#B91C1C",
            display: "flex",
            gap: "0.7rem",
            alignItems: "flex-start",
          }}
        >
          <PremiumIcon name={successMsg ? "checkCircle" : "alertCircle"} size={18} style={{ marginTop: "2px" }} />
          <span style={{ fontWeight: 700 }}>{successMsg || errorMsg}</span>
        </div>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.22rem", fontWeight: 900 }}>Pilih Plan Langganan</h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              Pilih periode langganan yang sesuai dengan kebutuhan Anda. Hemat lebih banyak dengan paket tahunan.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", background: "var(--surface)", padding: "0.35rem", borderRadius: "999px", border: "1px solid var(--border)" }}>
            {BILLING_PERIODS.map((period) => (
              <button
                key={period.id}
                onClick={() => setBillingPeriodId(period.id)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "999px",
                  fontSize: "0.82rem",
                  fontWeight: billingPeriodId === period.id ? 800 : 600,
                  background: billingPeriodId === period.id ? "var(--primary)" : "transparent",
                  color: billingPeriodId === period.id ? "#fff" : "var(--text-muted)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                {period.label}
                {period.discount > 0 && (
                  <span style={{
                    marginLeft: "0.4rem",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "999px",
                    background: billingPeriodId === period.id ? "rgba(255,255,255,0.2)" : "rgba(16,185,129,0.15)",
                    color: billingPeriodId === period.id ? "#fff" : "#059669",
                    fontSize: "0.65rem",
                    fontWeight: 800
                  }}>
                    -{period.discount}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
          {plans.map((plan) => {
            const isSelected =
              selectedOrder?.type === "plan" && selectedOrder.item.planId === plan.planId;
            const isCurrent = currentPlan === plan.planId;

            return (
              <ChoiceCard
                key={plan.planId}
                title={plan.name}
                subtitle={plan.description}
                badge={plan.popular ? "Paling Dipilih" : isCurrent ? "Aktif" : null}
                selected={isSelected}
                disabled={false}
                accent={plan.accent}
                onClick={() => {
                  clearMessages();
                  setSelectedTarget({ type: "plan", id: plan.planId });
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Rp</span>
                  <span style={{ fontSize: "2rem", fontWeight: 900 }}>
                    {Number(calculatePeriodPrice(plan.price || 0, billingPeriodId).finalPrice).toLocaleString("id-ID")}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>/{BILLING_PERIODS.find(p => p.id === billingPeriodId)?.label}</span>

                  {billingPeriodId !== "monthly" && calculatePeriodPrice(plan.price || 0, billingPeriodId).discountAmount > 0 && (
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", textDecoration: "line-through", marginLeft: "0.3rem" }}>
                      Rp {Number(calculatePeriodPrice(plan.price || 0, billingPeriodId).totalPrice).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {plan.creditsPerMonth && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.2rem" }}>
                      <PremiumIcon name="coins" size={15} style={{ color: "#F59E0B", marginTop: "2px", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.82rem", lineHeight: 1.45, fontWeight: 800 }}>
                        {plan.creditsPerMonth} Kredit / bulan
                      </span>
                    </div>
                  )}
                  {plan.features.map((feature) => (
                    <div key={feature} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <PremiumIcon name="checkCircle" size={15} style={{ color: plan.accent, marginTop: "2px", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.82rem", lineHeight: 1.45 }}>{feature}</span>
                    </div>
                  ))}
                </div>
                {isCurrent && (
                  <div style={{ marginTop: "0.95rem", padding: "0.75rem", borderRadius: 14, backgroundColor: "rgba(79,70,229,0.08)", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 700 }}>
                    Plan ini sedang aktif di akun Anda.
                  </div>
                )}
              </ChoiceCard>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.22rem", fontWeight: 900 }}>Top Up Kredit Dinamis</h2>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Kartu kredit ini fleksibel. Jika admin menambah, mengubah, atau menghapus paket, tampilannya akan ikut berubah di sini.
          </p>
        </div>

        {topups.length === 0 ? (
          <div style={{ backgroundColor: "var(--surface)", border: "2px dashed var(--border)", borderRadius: 20, padding: "3rem", textAlign: "center" }}>
            <PremiumIcon name="coins" size={34} style={{ opacity: 0.35, marginBottom: "0.7rem" }} />
            <p style={{ margin: 0, fontWeight: 800 }}>Belum ada paket kredit aktif dari admin.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1rem" }}>
            {topups.map((item) => {
              const isSelected =
                selectedOrder?.type === "topup" && selectedOrder.item.slug === item.slug;

              return (
                <ChoiceCard
                  key={item.slug}
                  title={item.name}
                  subtitle={item.description}
                  badge={item.badgeText}
                  selected={isSelected}
                  disabled={false}
                  accent={item.accent}
                  onClick={() => {
                    clearMessages();
                    setSelectedTarget({ type: "topup", id: item.slug });
                  }}
                >
                  <div style={{ padding: "0.9rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                      Total Kredit
                    </p>
                    <p style={{ margin: "0.3rem 0 0", fontSize: "1.65rem", fontWeight: 900 }}>
                      {getTotalCreditsFromTopup(item).toLocaleString("id-ID")}
                    </p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {item.amount.toLocaleString("id-ID")} utama{item.bonusCredits > 0 ? ` + ${item.bonusCredits.toLocaleString("id-ID")} bonus` : ""}
                    </p>
                  </div>
                  <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Harga paket</span>
                    <span style={{ fontSize: "1rem", fontWeight: 900 }}>{formatRupiah(item.price)}</span>
                  </div>
                </ChoiceCard>
              );
            })}
          </div>
        )}
      </section>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "flex-start",
          marginBottom: "2.5rem",
        }}
      >
        <div
          style={{
            flex: "1 1 500px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "1.5rem",
            boxShadow: "0 12px 32px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: "1.1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900 }}>Pilih Metode Pembayaran</h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.86rem", color: "var(--text-muted)" }}>
              Pembayaran otomatis disiapkan sebagai jalur berikutnya, sementara pembayaran manual sudah langsung masuk ke admin untuk diverifikasi.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.9rem", marginBottom: "1rem" }}>
            {PAYMENT_METHODS.map((item) => {
              const isSelected = paymentMethodId === item.id;
              return (
                <ChoiceCard
                  key={item.id}
                  title={item.label}
                  subtitle={item.description}
                  badge={item.badgeText}
                  selected={isSelected}
                  disabled={false}
                  accent={item.accent}
                  onClick={() => {
                    setPaymentMethodId(item.id);
                    clearMessages();
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.8rem 0.9rem",
                      borderRadius: 14,
                      backgroundColor: item.id === "automatic" ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.08)",
                      color: item.id === "automatic" ? "#2563EB" : "#047857",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    <PremiumIcon name={item.id === "automatic" ? "sparkles" : "checkCircle"} size={16} />
                    {item.id === "automatic" ? "Checkout otomatis via DOKU" : "Verifikasi manual oleh admin"}
                  </div>
                </ChoiceCard>
              );
            })}
          </div>

          {paymentMethodId === "manual" && (
            <>
              {[
                { key: "bank", title: "Bank Transfer" },
                { key: "qris", title: "QRIS" },
                { key: "ewallet", title: "E-Wallet" },
              ].map((group) => (
                <div key={group.key} style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.7rem", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>
                    {group.title}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.8rem" }}>
                    {groupedChannels[group.key].map((channel) => (
                      <ChoiceCard
                        key={channel.id}
                        title={channel.label}
                        subtitle={channel.helper}
                        badge={paymentChannelId === channel.id ? "Dipilih" : null}
                        selected={paymentChannelId === channel.id}
                        disabled={false}
                        accent={channel.accent}
                        onClick={() => setPaymentChannelId(channel.id)}
                      >
                        <div
                          style={{
                            padding: "0.75rem 0.9rem",
                            borderRadius: 14,
                            backgroundColor: "var(--surface-hover)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                              Detail
                            </p>
                            <p style={{ margin: "0.25rem 0 0", fontSize: "0.86rem", fontWeight: 800 }}>
                              {channel.value}
                            </p>
                          </div>
                          <PremiumIcon name={channel.icon} size={18} style={{ color: channel.accent }} />
                        </div>
                      </ChoiceCard>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          <div style={{ marginTop: "1.2rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", marginBottom: "0.7rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>Promo dari Admin</h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Promo yang aktif di admin langsung bisa dipakai dari halaman ini.
                </p>
              </div>
            </div>

            {activePromos.length > 0 && (
              <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                {activePromos.slice(0, 6).map((promo) => (
                  <button
                    key={promo.id}
                    type="button"
                    onClick={() => handleApplyPromo(promo.code)}
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: 999,
                      border: "1px solid rgba(79,70,229,0.18)",
                      backgroundColor: "rgba(79,70,229,0.08)",
                      color: "var(--primary)",
                      fontWeight: 800,
                      fontSize: "0.76rem",
                      cursor: "pointer",
                    }}
                  >
                    {promo.code}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
              <input
                type="text"
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value.toUpperCase());
                  setPromoError("");
                  if (selectedPromo && event.target.value.toUpperCase() !== selectedPromo.code) {
                    setSelectedPromo(null);
                  }
                }}
                placeholder="Masukkan kode promo"
                className="form-input"
                style={{ flex: "1 1 220px" }}
              />
              <button type="button" onClick={() => handleApplyPromo()} className="btn btn-outline" disabled={promoLoading}>
                <PremiumIcon name="ticket" size={15} />
                {promoLoading ? "Cek..." : "Pakai Promo"}
              </button>
              {selectedPromo && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSelectedPromo(null);
                    setPromoInput("");
                    setPromoError("");
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {selectedPromo && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.9rem 1rem",
                  borderRadius: 14,
                  backgroundColor: "rgba(16,185,129,0.08)",
                  color: "#047857",
                  fontSize: "0.84rem",
                }}
              >
                Promo <strong>{selectedPromo.code}</strong> aktif. Potongan saat ini:{" "}
                <strong>{formatRupiah(priceBreakdown.discountAmount)}</strong>.
              </div>
            )}

            {promoError && (
              <p style={{ margin: "0.65rem 0 0", fontSize: "0.82rem", color: "#B91C1C", fontWeight: 700 }}>
                {promoError}
              </p>
            )}
          </div>

          {/* DOKU info panel for automatic mode */}
          {paymentMethodId === "automatic" && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem 1.1rem",
                borderRadius: 18,
                background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.08))",
                border: "1px solid rgba(59,130,246,0.2)",
                display: "flex",
                gap: "0.85rem",
                alignItems: "flex-start",
              }}
            >
              <PremiumIcon name="sparkles" size={18} style={{ color: "#3B82F6", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: "#1D4ED8" }}>
                  Checkout Otomatis via DOKU
                </p>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  Anda akan diarahkan ke halaman pembayaran DOKU yang aman. Tersedia QRIS, Virtual Account, GoPay, OVO, Dana, dan Kartu Kredit. Kredit atau plan akan otomatis masuk setelah pembayaran berhasil.
                </p>
              </div>
            </div>
          )}

          {/* Customer notes - only for manual */}
          {paymentMethodId === "manual" && (
            <div style={{ marginTop: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.45rem" }}>
                Catatan Pembayaran
              </label>
              <textarea
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                className="form-textarea"
                rows={4}
                placeholder="Contoh: transfer dari rekening a.n. Budi, jam 14.30 WIB."
              />
            </div>
          )}
        </div>

        <div
          style={{
            flex: "1 1 350px",
            position: "sticky",
            top: "5.5rem",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "1.5rem",
            boxShadow: "0 12px 32px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>
              Ringkasan Checkout
            </p>
            <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.15rem", fontWeight: 900 }}>Pesanan Anda</h2>
          </div>

          {!selectedOrder ? (
            <div style={{ padding: "2rem 1rem", borderRadius: 18, backgroundColor: "var(--surface-hover)", textAlign: "center", color: "var(--text-muted)" }}>
              Pilih plan atau paket kredit terlebih dahulu.
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "1rem",
                  borderRadius: 18,
                  background:
                    selectedOrder.type === "plan"
                      ? "linear-gradient(135deg, rgba(79,70,229,0.12), transparent)"
                      : "linear-gradient(135deg, rgba(16,185,129,0.12), transparent)",
                  border: "1px solid var(--border)",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                      Produk Dipilih
                    </p>
                    <h3 style={{ margin: "0.32rem 0 0", fontSize: "1rem", fontWeight: 900 }}>
                      {selectedOrder.type === "plan"
                        ? selectedOrder.item.name
                        : selectedOrder.item.name}
                    </h3>
                    <p style={{ margin: "0.28rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {selectedOrder.type === "plan"
                        ? selectedOrder.item.shortDescription
                        : `${selectedOrder.item.amount.toLocaleString("id-ID")} kredit utama${selectedOrder.item.bonusCredits > 0 ? ` + ${selectedOrder.item.bonusCredits.toLocaleString("id-ID")} bonus` : ""}`}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "0.28rem 0.65rem",
                      borderRadius: 999,
                      backgroundColor:
                        selectedOrder.type === "plan"
                          ? "rgba(79,70,229,0.12)"
                          : "rgba(16,185,129,0.12)",
                      color:
                        selectedOrder.type === "plan"
                          ? "var(--primary)"
                          : "#059669",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {selectedOrder.type === "plan" ? "Plan" : "Top Up"}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gap: "0.8rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                  <span className="text-muted">Harga Dasar</span>
                  <strong>{formatRupiah(priceBreakdown.basePrice)}</strong>
                </div>
                {priceBreakdown.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                    <span className="text-muted">Diskon Promo</span>
                    <strong style={{ color: "#059669" }}>-{formatRupiah(priceBreakdown.discountAmount)}</strong>
                  </div>
                )}
                {selectedOrder.type === "plan" && billingPeriodId !== "monthly" && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                    <span className="text-muted">Periode</span>
                    <strong style={{ color: "#059669" }}>{BILLING_PERIODS.find(p => p.id === billingPeriodId)?.label}</strong>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                  <span className="text-muted">Metode</span>
                  <strong>{selectedPaymentMethod?.label || "-"}</strong>
                </div>
                {paymentMethodId === "manual" && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                    <span className="text-muted">Channel</span>
                    <strong>{selectedPaymentChannel?.label || "-"}</strong>
                  </div>
                )}
                {selectedOrder.type === "topup" && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                    <span className="text-muted">Kredit Diterima</span>
                    <strong>+{getTotalCreditsFromTopup(selectedOrder.item).toLocaleString("id-ID")}</strong>
                  </div>
                )}
                {selectedOrder.type === "plan" && selectedOrder.item.creditsPerMonth && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                    <span className="text-muted">Kredit/bulan</span>
                    <strong style={{ color: "#F59E0B" }}>+{selectedOrder.item.creditsPerMonth.toLocaleString("id-ID")}</strong>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  alignItems: "center",
                  padding: "1rem",
                  borderRadius: 18,
                  backgroundColor: "var(--surface-hover)",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    Total Tagihan
                  </p>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "1.55rem", fontWeight: 900 }}>
                    {formatRupiah(priceBreakdown.finalPrice)}
                  </p>
                </div>
                <PremiumIcon name="sparkles" size={22} style={{ color: "var(--primary)" }} />
              </div>

              {paymentMethodId === "automatic" ? (
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, rgba(82, 93, 110, 0.1), rgba(99,102,241,0.08))",
                    border: "1px solid rgba(59,130,246,0.2)",
                    color: "#1D4ED8",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    display: "flex",
                    gap: "0.6rem",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <PremiumIcon name="sparkles" size={16} />
                  Anda akan diarahkan ke halaman pembayaran DOKU yang aman.
                </div>
              ) : (
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: 18,
                    backgroundColor: "rgba(16,185,129,0.08)",
                    color: "#047857",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                  }}
                >
                  <strong>{selectedPaymentChannel?.label}</strong>
                  <div style={{ marginTop: "0.35rem" }}>
                    {selectedPaymentChannel?.helper}
                    <br />
                    <span style={{ fontWeight: 800 }}>{selectedPaymentChannel?.value}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  borderRadius: 16,
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  background:
                    paymentMethodId === "automatic"
                      ? "linear-gradient(135deg, #60A5FA, #2563EB)"
                      : "linear-gradient(135deg, #10B981, #059669)",
                }}
              >
                <PremiumIcon name={submitting ? "loader" : paymentMethodId === "automatic" ? "sparkles" : "checkCircle"} size={16} />
                {submitting
                  ? paymentMethodId === "automatic" ? "Mengarahkan ke DOKU..." : "Mengirim Permintaan..."
                  : paymentMethodId === "automatic" ? "Bayar Sekarang via DOKU" : "Kirim Permintaan Manual"}
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900 }}>Riwayat Permintaan Anda</h2>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.86rem", color: "var(--text-muted)" }}>
              Status approve atau reject dari admin akan langsung kembali tampil di sini.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: 700 }}>
            <PremiumIcon name="clock" size={15} />
            {userRequests.length} total request
          </div>
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
