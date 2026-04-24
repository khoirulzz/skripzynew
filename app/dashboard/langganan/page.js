"use client";

import { useMemo, useState } from "react";
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        background: selected
          ? `linear-gradient(180deg, ${accent}18, transparent 70%), var(--surface)`
          : "var(--surface)",
        border: `1.5px solid ${selected ? accent : "var(--border)"}`,
        borderRadius: 18,
        padding: "1rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease",
        boxShadow: selected ? `0 16px 32px ${accent}18` : "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{title}</h3>
          {subtitle && (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{subtitle}</p>
          )}
        </div>
        {badge && (
          <span
            style={{
              alignSelf: "flex-start",
              padding: "0.28rem 0.7rem",
              borderRadius: 999,
              backgroundColor: accent,
              color: "#fff",
              fontSize: "0.68rem",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ marginTop: "0.95rem" }}>{children}</div>
    </button>
  );
}

function OrderHistoryCard({ item }) {
  const isPlan = item.requestType === "plan";

  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span
              style={{
                padding: "0.25rem 0.55rem",
                borderRadius: 999,
                backgroundColor: isPlan ? "rgba(79,70,229,0.12)" : "rgba(16,185,129,0.12)",
                color: isPlan ? "var(--primary)" : "#059669",
                fontSize: "0.68rem",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              {isPlan ? "Plan" : "Kredit"}
            </span>
            <StatusBadge status={item.status} />
          </div>
          <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800 }}>
            {getBillingRequestSummary(item)}
          </h3>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {item.paymentChannelLabel || item.paymentMethodLabel} • {formatDate(item.timestamp)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
            Nilai
          </p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "1rem", fontWeight: 900 }}>
            {formatRupiah(item.finalPrice || item.basePrice || 0)}
          </p>
        </div>
      </div>

      {!isPlan && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div style={{ padding: "0.8rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Kredit Masuk
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "1rem", fontWeight: 800 }}>
              +{Number(item.amount || 0).toLocaleString("id-ID")}
            </p>
          </div>
          {item.promoCode && (
            <div style={{ padding: "0.8rem", borderRadius: 14, backgroundColor: "var(--surface-hover)" }}>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Promo
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "1rem", fontWeight: 800 }}>{item.promoCode}</p>
            </div>
          )}
        </div>
      )}

      {item.rejectedReason && (
        <div
          style={{
            padding: "0.9rem 1rem",
            borderRadius: 14,
            backgroundColor: "rgba(239,68,68,0.08)",
            color: "#B91C1C",
            fontSize: "0.82rem",
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
  const priceBreakdown = useMemo(
    () => calculatePromoBreakdown(selectedOrder?.item?.price || 0, selectedPromo),
    [selectedOrder, selectedPromo]
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

    if (!selectedPaymentMethod?.enabled) {
      setErrorMsg("Pembayaran otomatis masih coming soon. Silakan gunakan pembayaran manual dulu.");
      return;
    }

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

    if (!selectedPaymentChannel) {
      setErrorMsg("Pilih channel pembayaran manual terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
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
    } catch (error) {
      setErrorMsg(error.message || "Gagal membuat permintaan pembayaran.");
    } finally {
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
          padding: "1.5rem",
          background:
            "radial-gradient(circle at top left, rgba(79,70,229,0.14), transparent 35%), radial-gradient(circle at top right, rgba(16,185,129,0.12), transparent 30%), var(--surface)",
          boxShadow: "0 24px 60px rgba(15,23,42,0.08)",
          marginBottom: "1.5rem",
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
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.22rem", fontWeight: 900 }}>Pilih Plan Langganan</h2>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Tiga plan selalu tetap, dan harganya otomatis mengikuti konfigurasi terbaru dari admin.
          </p>
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
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.8rem" }}>
                  <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Rp</span>
                  <span style={{ fontSize: "2rem", fontWeight: 900 }}>{Number(plan.price).toLocaleString("id-ID")}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>/bulan</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
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
          display: "grid",
          gridTemplateColumns: "1.15fr 0.95fr",
          gap: "1rem",
          alignItems: "start",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: "1.2rem",
            boxShadow: "var(--shadow-sm)",
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
                      backgroundColor: item.enabled ? "rgba(16,185,129,0.08)" : "rgba(59,130,246,0.08)",
                      color: item.enabled ? "#047857" : "#1D4ED8",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    <PremiumIcon name={item.id === "automatic" ? "sparkles" : "checkCircle"} size={16} />
                    {item.enabled ? "Siap dipakai sekarang" : "Disiapkan untuk versi berikutnya"}
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
        </div>

        <div
          style={{
            position: "sticky",
            top: "5.5rem",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: "1.2rem",
            boxShadow: "var(--shadow-sm)",
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                  <span className="text-muted">Diskon Promo</span>
                  <strong style={{ color: selectedPromo ? "#059669" : "var(--text-muted)" }}>
                    -{formatRupiah(priceBreakdown.discountAmount)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                  <span className="text-muted">Metode</span>
                  <strong>{selectedPaymentMethod?.label || "-"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                  <span className="text-muted">Channel</span>
                  <strong>{selectedPaymentChannel?.label || "-"}</strong>
                </div>
                {selectedOrder.type === "topup" && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", fontSize: "0.86rem" }}>
                    <span className="text-muted">Kredit Diterima</span>
                    <strong>+{getTotalCreditsFromTopup(selectedOrder.item).toLocaleString("id-ID")}</strong>
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
                    backgroundColor: "rgba(59,130,246,0.08)",
                    color: "#1D4ED8",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                  }}
                >
                  Pembayaran otomatis masih coming soon. Silakan pilih pembayaran manual untuk saat ini.
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
                <PremiumIcon name={paymentMethodId === "automatic" ? "sparkles" : "checkCircle"} size={16} />
                {submitting ? "Mengirim Permintaan..." : paymentMethodId === "automatic" ? "Pembayaran Otomatis (Coming Soon)" : "Kirim Permintaan Manual"}
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
