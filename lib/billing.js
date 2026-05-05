import {
  addDoc,
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const PLAN_ORDER = ["free", "pro", "plus"];

export const PLAN_METADATA = {
  free: {
    planId: "free",
    name: "Free Plan",
    label: "Mulai Gratis",
    description: "Cocok untuk mencoba fitur dasar dan alur kerja awal Skripzy.",
    shortDescription: "Untuk eksplorasi awal",
    defaultPrice: 0,
    popular: false,
    accent: "#64748B",
    glow: "rgba(100,116,139,0.16)",
    features: [
      "2.000 karakter maksimum per request AI",
      "Akses Parafrase dan Cek Grammar",
      "Asisten AI dasar untuk eksplorasi topik",
      "Workspace editor dengan kapasitas terbatas",
    ],
  },
  pro: {
    planId: "pro",
    name: "Pro Plan",
    label: "Paling Seimbang",
    description: "Paket favorit untuk pengerjaan skripsi aktif dengan akses fitur premium utama.",
    shortDescription: "Pilihan paling populer",
    defaultPrice: 49000,
    creditsPerMonth: 500,
    popular: true,
    accent: "#4F46E5",
    glow: "rgba(79,70,229,0.18)",
    features: [
      "5.000 karakter maksimum per request AI",
      "Akses Humanizer, AI Detector, dan Simulasi Sidang",
      "Referensi cerdas dan prioritas performa AI",
      "Workflow riset lebih cepat untuk skripsi aktif",
    ],
  },
  plus: {
    planId: "plus",
    name: "Plus Plan",
    label: "Untuk Riset Intensif",
    description: "Dirancang untuk riset berat, revisi intensif, dan workload akademik berkelanjutan.",
    shortDescription: "Kapasitas tertinggi",
    defaultPrice: 99000,
    creditsPerMonth: 1000,
    popular: false,
    accent: "#EA580C",
    glow: "rgba(234,88,12,0.18)",
    features: [
      "8.000 karakter maksimum per request AI",
      "Ruang kerja lebih lega untuk dataset dan draft panjang",
      "Prioritas penuh untuk aktivitas AI intensif",
      "Siap untuk alur kerja skripsi ke publikasi",
    ],
  },
};

export const DEFAULT_TOPUP_PACKAGES = [
  {
    id: "default-topup-50",
    slug: "credit-starter-50",
    name: "Starter Pack",
    description: "Tambahan cepat untuk revisi ringan dan cek singkat.",
    amount: 50,
    bonusCredits: 0,
    price: 15000,
    badgeText: null,
    popular: false,
    accent: "#0EA5E9",
  },
  {
    id: "default-topup-120",
    slug: "credit-boost-120",
    name: "Boost Pack",
    description: "Pas untuk ritme kerja harian dengan bonus kredit ekstra.",
    amount: 120,
    bonusCredits: 20,
    price: 30000,
    badgeText: "Best Value",
    popular: true,
    accent: "#10B981",
  },
  {
    id: "default-topup-300",
    slug: "credit-intense-300",
    name: "Intense Pack",
    description: "Untuk sprint revisi, banyak eksperimen, dan kebutuhan AI berulang.",
    amount: 300,
    bonusCredits: 60,
    price: 60000,
    badgeText: "Bonus Besar",
    popular: false,
    accent: "#F59E0B",
  },
];

export const DEFAULT_TOOL_PRICING = [
  {
    slug: "asisten-ai-judul",
    title: "Asisten AI - Generator Judul",
    shortTitle: "Asisten AI",
    creditCost: 2,
  },
  {
    slug: "asisten-ai-latar-belakang",
    title: "Asisten AI - Latar Belakang",
    shortTitle: "Asisten AI",
    creditCost: 3,
  },
  {
    slug: "parafrase",
    title: "Parafrase",
    shortTitle: "Parafrase",
    creditCost: 2,
  },
  {
    slug: "cek-grammar",
    title: "Cek Grammar",
    shortTitle: "Cek Grammar",
    creditCost: 2,
  },
  {
    slug: "humanizer",
    title: "Humanizer",
    shortTitle: "Humanizer",
    creditCost: 3,
  },
  {
    slug: "ai-detector",
    title: "AI Detector",
    shortTitle: "AI Detector",
    creditCost: 3,
  },
  {
    slug: "referensi-ringkas",
    title: "Referensi Cerdas - Ringkasan",
    shortTitle: "Referensi Cerdas",
    creditCost: 1,
  },
  {
    slug: "simulasi-sidang",
    title: "Simulasi Sidang",
    shortTitle: "Simulasi Sidang",
    creditCost: 5,
  },
  {
    slug: "chat-message",
    title: "Chat Dosen AI - Pesan",
    shortTitle: "Chat Dosen AI",
    creditCost: 1,
  },
  {
    slug: "chat-call-start",
    title: "Chat Dosen AI - Voice Call",
    shortTitle: "Voice Call",
    creditCost: 3,
  },
  {
    slug: "notebook-referensi",
    title: "Notebook - Indexing & Query",
    shortTitle: "Notebook",
    creditCost: 5,
  },
  {
    slug: "chapter-generation",
    title: "AI Chapter Generator - Skripsi",
    shortTitle: "Chapter Generator",
    creditCost: 2,
  },
  {
    slug: "journal-chapter-generation",
    title: "AI Chapter Generator - Jurnal",
    shortTitle: "Journal Generator",
    creditCost: 2,
  },
];

export const PAYMENT_METHODS = [
  {
    id: "automatic",
    label: "Pembayaran Otomatis",
    description: "Checkout instan via DOKU gateway (QRIS, VA, E-Wallet).",
    enabled: true,
    badgeText: "Recommended",
    accent: "#3B82F6",
  },
  {
    id: "manual",
    label: "Pembayaran Manual",
    description: "Transfer manual dengan verifikasi admin.",
    enabled: true,
    badgeText: "Aktif",
    accent: "#10B981",
  },
];

export const MANUAL_PAYMENT_CHANNELS = [
  {
    id: "bank-bca",
    group: "bank",
    label: "BCA Transfer",
    helper: "A.n. PT Skripzy Teknologi",
    value: "1234567890",
    accent: "#2563EB",
    icon: "creditCard",
  },
  {
    id: "bank-mandiri",
    group: "bank",
    label: "Mandiri Transfer",
    helper: "A.n. PT Skripzy Teknologi",
    value: "9876543210",
    accent: "#F59E0B",
    icon: "creditCard",
  },
  {
    id: "qris-main",
    group: "qris",
    label: "QRIS All Payment",
    helper: "Scan dari mobile banking atau e-wallet favorit Anda",
    value: "QRIS-SKRIPZY-2026",
    accent: "#8B5CF6",
    icon: "sparkles",
  },
  {
    id: "ewallet-dana",
    group: "ewallet",
    label: "DANA",
    helper: "Nomor penerima resmi Skripzy",
    value: "0812-0000-1234",
    accent: "#0EA5E9",
    icon: "wallet",
  },
  {
    id: "ewallet-gopay",
    group: "ewallet",
    label: "GoPay",
    helper: "Nomor penerima resmi Skripzy",
    value: "0812-0000-5678",
    accent: "#16A34A",
    icon: "wallet",
  },
  {
    id: "ewallet-ovo",
    group: "ewallet",
    label: "OVO",
    helper: "Nomor penerima resmi Skripzy",
    value: "0812-0000-9999",
    accent: "#7C3AED",
    icon: "wallet",
  },
];

const TOOL_SLUG_ALIASES = [
  { slug: "asisten-ai-judul", matches: ["judul", "generator judul", "judul penelitian"] },
  { slug: "asisten-ai-latar-belakang", matches: ["latar belakang", "background"] },
  { slug: "parafrase", matches: ["parafrase", "paraphrase"] },
  { slug: "cek-grammar", matches: ["grammar", "cek grammar"] },
  { slug: "humanizer", matches: ["humanizer", "humanize"] },
  { slug: "ai-detector", matches: ["ai detector", "detector ai"] },
  { slug: "referensi-ringkas", matches: ["referensi", "ringkas", "summary jurnal"] },
  { slug: "simulasi-sidang", matches: ["sidang", "simulasi sidang"] },
  { slug: "chat-message", matches: ["chat dosen ai", "chat message", "pesan chat"] },
  { slug: "chat-call-start", matches: ["voice call", "call start", "panggilan"] },
];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function sortByTimestampDesc(items) {
  return [...items].sort((a, b) => {
    const aTime = a.timestamp?.toDate?.() || a.createdAt?.toDate?.() || new Date(a.timestamp || a.createdAt || 0);
    const bTime = b.timestamp?.toDate?.() || b.createdAt?.toDate?.() || new Date(b.timestamp || b.createdAt || 0);
    return bTime - aTime;
  });
}

function inferPlanId(item) {
  const raw = [
    item?.planId,
    item?.slug,
    item?.toolName,
    item?.name,
    item?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (raw.includes("plus")) return "plus";
  if (raw.includes("pro")) return "pro";
  if (raw.includes("free")) return "free";
  return null;
}

function inferToolSlug(item) {
  const directSlug = normalizeText(item?.slug);
  if (directSlug) return directSlug;

  const haystack = [
    item?.toolName,
    item?.name,
    item?.description,
    item?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const match = TOOL_SLUG_ALIASES.find((entry) =>
    entry.matches.some((keyword) => haystack.includes(keyword))
  );

  return match?.slug || null;
}

function normalizePlan(planId, item) {
  const metadata = PLAN_METADATA[planId];
  const remotePrice = toNumber(item?.price ?? item?.planPrices?.[planId], metadata.defaultPrice);

  return {
    ...metadata,
    category: "plan",
    pricingId: item?.id || `plan-${planId}`,
    price: remotePrice,
    description: normalizeText(item?.description) || metadata.description,
    features:
      Array.isArray(item?.features) && item.features.length > 0
        ? item.features
        : metadata.features,
    popular: item?.popular ?? metadata.popular,
  };
}

function normalizeTopup(item, index = 0) {
  const amount = toNumber(
    item?.amount ?? item?.credits ?? item?.creditAmount ?? item?.creditCost,
    0
  );
  const bonusCredits = toNumber(item?.bonusCredits ?? item?.bonus ?? item?.extraCredits, 0);
  const price = toNumber(item?.price ?? item?.planPrices?.pro, 0);
  const name =
    normalizeText(item?.toolName || item?.name) || `${amount.toLocaleString("id-ID")} Kredit`;

  return {
    id: item?.id,
    pricingId: item?.id,
    category: "topup",
    slug:
      normalizeText(item?.slug) ||
      `topup-${amount}-${bonusCredits}-${String(index).padStart(2, "0")}`,
    name,
    description:
      normalizeText(item?.description) ||
      (bonusCredits > 0
        ? `Dapat ${amount.toLocaleString("id-ID")} kredit + bonus ${bonusCredits.toLocaleString("id-ID")} kredit.`
        : `Tambahan ${amount.toLocaleString("id-ID")} kredit untuk workflow AI Anda.`),
    amount,
    bonusCredits,
    totalCredits: amount + bonusCredits,
    price,
    badgeText:
      normalizeText(item?.badgeText || item?.badge) ||
      (bonusCredits > 0 ? `+${bonusCredits.toLocaleString("id-ID")}` : null),
    popular: Boolean(item?.popular),
    accent:
      normalizeText(item?.accent) ||
      DEFAULT_TOPUP_PACKAGES[index % DEFAULT_TOPUP_PACKAGES.length].accent,
  };
}

export function buildBillingCatalog(pricingItems = []) {
  const pricing = Array.isArray(pricingItems) ? pricingItems : [];
  const planItems = pricing.filter((item) => item?.category === "plan");
  const topupItems = pricing.filter((item) => item?.category === "topup");
  const toolItems = pricing.filter((item) => item?.category === "tool");

  const plans = PLAN_ORDER.map((planId) => {
    const remotePlan = planItems.find((item) => inferPlanId(item) === planId);
    return normalizePlan(planId, remotePlan);
  });

  const topups =
    topupItems.length > 0
      ? topupItems
          .map((item, index) => normalizeTopup(item, index))
          .sort((a, b) => {
            if (a.popular && !b.popular) return -1;
            if (!a.popular && b.popular) return 1;
            return a.totalCredits - b.totalCredits;
          })
      : pricing.length === 0
        ? DEFAULT_TOPUP_PACKAGES.map((item) => ({
            ...item,
            pricingId: item.id,
            totalCredits: getTotalCreditsFromTopup(item),
            category: "topup",
          }))
        : [];

  const toolMap = Object.fromEntries(
    DEFAULT_TOOL_PRICING.map((item) => [item.slug, { ...item, category: "tool" }])
  );

  toolItems.forEach((item) => {
    const slug = inferToolSlug(item);
    if (!slug) return;

    const fallback = toolMap[slug] || {
      slug,
      title: normalizeText(item?.toolName) || slug,
      shortTitle: normalizeText(item?.toolName) || slug,
      creditCost: 0,
      category: "tool",
    };

    toolMap[slug] = {
      ...fallback,
      pricingId: item?.id,
      title: normalizeText(item?.toolName) || fallback.title,
      shortTitle: fallback.shortTitle || normalizeText(item?.toolName) || fallback.title,
      description: normalizeText(item?.description) || fallback.description,
      creditCost: toNumber(item?.creditCost, fallback.creditCost),
    };
  });

  return {
    plans,
    topups,
    tools: Object.values(toolMap).sort((a, b) =>
      a.title.localeCompare(b.title, "id")
    ),
    planMap: Object.fromEntries(plans.map((item) => [item.planId, item])),
    topupMap: Object.fromEntries(topups.map((item) => [item.slug, item])),
    toolMap,
  };
}

export function formatRupiah(amount) {
  return `Rp ${toNumber(amount).toLocaleString("id-ID")}`;
}

export function getPlanDisplayName(planId) {
  return PLAN_METADATA[planId]?.name || `${planId} Plan`;
}

export function getTotalCreditsFromTopup(item) {
  return toNumber(item?.amount) + toNumber(item?.bonusCredits);
}

export function calculatePromoBreakdown(basePrice, promo) {
  const safeBasePrice = Math.max(0, toNumber(basePrice));

  if (!promo) {
    return {
      basePrice: safeBasePrice,
      discountAmount: 0,
      finalPrice: safeBasePrice,
    };
  }

  const isFixed = promo?.type === "fixed";
  const discountAmount = isFixed
    ? toNumber(promo?.discountAmount)
    : Math.round(safeBasePrice * (toNumber(promo?.discountPercent) / 100));

  const boundedDiscount = Math.max(0, Math.min(safeBasePrice, discountAmount));

  return {
    basePrice: safeBasePrice,
    discountAmount: boundedDiscount,
    finalPrice: Math.max(0, safeBasePrice - boundedDiscount),
  };
}

export function getPaymentMethodById(methodId) {
  return PAYMENT_METHODS.find((item) => item.id === methodId) || null;
}

export function getPaymentChannelById(channelId) {
  return MANUAL_PAYMENT_CHANNELS.find((item) => item.id === channelId) || null;
}

export const BILLING_PERIODS = [
  { id: "monthly", label: "Bulanan", multiplier: 1, discount: 0 },
  { id: "quarterly", label: "3 Bulan", multiplier: 3, discount: 5 },
  { id: "semiannual", label: "6 Bulan", multiplier: 6, discount: 10 },
  { id: "annual", label: "Tahunan", multiplier: 12, discount: 20 },
];

export function calculatePeriodPrice(basePrice, periodId) {
  const period = BILLING_PERIODS.find(p => p.id === periodId) || BILLING_PERIODS[0];
  const totalPrice = toNumber(basePrice) * period.multiplier;
  const discountAmount = Math.round(totalPrice * (period.discount / 100));
  
  return {
    totalPrice: totalPrice,
    discountAmount: discountAmount,
    finalPrice: totalPrice - discountAmount,
    periodLabel: period.label,
    multiplier: period.multiplier,
  };
}

export async function createDokuPayment({
  user,
  userData,
  requestType,
  selectedItem,
  promo,
  priceBreakdown,
  billingPeriod = "monthly",
}) {
  if (!user?.uid) {
    throw new Error("Anda harus login untuk membuat permintaan pembayaran.");
  }

  if (!selectedItem) {
    throw new Error("Pilih produk terlebih dahulu.");
  }

  // Get the auth token to pass to our secure worker endpoint
  const idToken = await user.getIdToken();
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || "https://apikey.skripzy-app.workers.dev";
  const endpoint = `${workerUrl}/api/doku/create-payment`;

  const finalCredits = requestType === "topup" ? getTotalCreditsFromTopup(selectedItem) : (selectedItem.creditsPerMonth || 0);
  const basePrice = toNumber(priceBreakdown?.basePrice, selectedItem.price);
  const discountAmount = toNumber(priceBreakdown?.discountAmount, 0);
  const finalPrice = toNumber(priceBreakdown?.finalPrice, selectedItem.price);

  const payload = {
    amount: finalPrice,
    basePrice: basePrice,
    discountAmount: discountAmount,
    customerName: userData?.namaLengkap || userData?.displayName || user.displayName || user.email || "User Skripzy",
    customerEmail: userData?.email || user.email || "",
    requestType,
    productName: requestType === "plan" ? getPlanDisplayName(selectedItem.planId) : selectedItem.name,
    promoId: promo?.id || null,
    promoCode: promo?.code || null,
    promoType: promo?.type || null,
    planId: requestType === "plan" ? selectedItem.planId : null,
    planName: requestType === "plan" ? getPlanDisplayName(selectedItem.planId) : null,
    billingPeriod: requestType === "plan" ? billingPeriod : "monthly",
    topupSlug: requestType === "topup" ? selectedItem.slug : null,
    creditsBase: requestType === "topup" ? toNumber(selectedItem.amount) : 0,
    bonusCredits: requestType === "topup" ? toNumber(selectedItem.bonusCredits) : 0,
    creditsTotal: finalCredits,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gagal menghubungi server pembayaran.");
    }

    if (!data.payment_url) {
      throw new Error("Tidak mendapatkan link pembayaran dari server.");
    }

    return {
      paymentUrl: data.payment_url,
      invoiceNumber: data.invoice_number,
      docId: data.doc_id,
    };
  } catch (error) {
    console.error("Error creating DOKU payment:", error);
    throw error;
  }
}


export async function createBillingRequest({
  user,
  userData,
  requestType,
  selectedItem,
  paymentMethodId,
  paymentChannelId,
  promo,
  priceBreakdown,
  customerNotes = "",
}) {
  if (!user?.uid) {
    throw new Error("Anda harus login untuk membuat permintaan pembayaran.");
  }

  if (!selectedItem) {
    throw new Error("Pilih produk terlebih dahulu.");
  }

  const paymentMethod = getPaymentMethodById(paymentMethodId);
  if (!paymentMethod?.enabled) {
    throw new Error("Metode pembayaran ini belum tersedia.");
  }

  const paymentChannel = getPaymentChannelById(paymentChannelId);
  if (!paymentChannel) {
    throw new Error("Pilih channel pembayaran manual terlebih dahulu.");
  }

  const finalCredits =
    requestType === "topup" ? getTotalCreditsFromTopup(selectedItem) : 0;
  const basePrice = toNumber(priceBreakdown?.basePrice, selectedItem.price);
  const discountAmount = toNumber(priceBreakdown?.discountAmount, 0);
  const finalPrice = toNumber(priceBreakdown?.finalPrice, selectedItem.price);

  const payload = {
    userId: user.uid,
    userName:
      userData?.namaLengkap ||
      userData?.displayName ||
      user.displayName ||
      user.email ||
      "User Skripzy",
    userEmail: userData?.email || user.email || "",
    status: "pending",
    requestType,
    productName:
      requestType === "plan"
        ? getPlanDisplayName(selectedItem.planId)
        : selectedItem.name,
    pricingId: selectedItem.pricingId || null,
    paymentMethodId,
    paymentMethodLabel: paymentMethod.label,
    paymentChannelId: paymentChannel.id,
    paymentChannelLabel: paymentChannel.label,
    paymentChannelGroup: paymentChannel.group,
    promoId: promo?.id || null,
    promoCode: promo?.code || null,
    promoType: promo?.type || null,
    basePrice,
    discountAmount,
    finalPrice,
    customerNotes: normalizeText(customerNotes),
    timestamp: Timestamp.now(),
    approvedAt: null,
    rejectedAt: null,
    rejectedReason: "",
  };

  if (requestType === "plan") {
    payload.planId = selectedItem.planId;
    payload.planName = getPlanDisplayName(selectedItem.planId);
    payload.amount = 0;
  } else {
    payload.topupSlug = selectedItem.slug;
    payload.creditsBase = toNumber(selectedItem.amount);
    payload.bonusCredits = toNumber(selectedItem.bonusCredits);
    payload.amount = finalCredits;
  }

  const requestRef = collection(db, "topups");
  const docRef = await addDoc(requestRef, payload);
  return docRef.id;
}

export function subscribeToUserBillingRequests(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const requestsRef = collection(db, "topups");
  const requestsQuery = query(requestsRef, where("userId", "==", userId));

  return onSnapshot(requestsQuery, (snapshot) => {
    const requests = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));

    callback(sortByTimestampDesc(requests));
  });
}

export function getBillingRequestSummary(item) {
  if (!item) return "-";

  if (item.requestType === "plan") {
    return item.planName || getPlanDisplayName(item.planId);
  }

  const creditsText = `${toNumber(item.amount).toLocaleString("id-ID")} kredit`;
  return item.productName ? `${item.productName} • ${creditsText}` : creditsText;
}
