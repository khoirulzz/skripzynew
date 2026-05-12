import { d1Request } from "@/lib/d1Client";

/**
 * Polling listener for all promos
 * Emulates Firestore's onSnapshot for backward compatibility with UI components
 */
export function subscribeToPromos(callback) {
  let isCancelled = false;

  const fetchPromosData = async () => {
    if (isCancelled) return;
    try {
      const { data } = await d1Request("promos", { method: "GET" });
      const items = (data || []).map(d => ({
         ...d,
         isActive: Boolean(d.isActive),
         createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
         validUntil: d.validUntil ? new Date(d.validUntil) : null
      }));
      
      // Sort: active first, then by createdAt desc
      items.sort((a, b) => {
        const aActive = isPromoActive(a);
        const bActive = isPromoActive(b);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      callback(items);
    } catch (e) {
      console.error("Error polling promos:", e);
    }
  };

  fetchPromosData();
  const interval = setInterval(fetchPromosData, 5000); // Poll every 5s for admin UI

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

/**
 * Check if a promo is currently active
 */
export function isPromoActive(promo) {
  if (!promo.isActive) return false;
  const now = new Date();
  if (promo.validUntil) {
    const expiry = new Date(promo.validUntil);
    if (expiry < now) return false;
  }
  if (promo.usageLimit && (promo.usedCount || 0) >= promo.usageLimit) return false;
  return true;
}

/**
 * Get all promos
 */
export async function getPromos() {
  try {
    const { data } = await d1Request("promos", { method: "GET" });
    return (data || []).map(d => ({
        ...d,
        isActive: Boolean(d.isActive),
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        validUntil: d.validUntil ? new Date(d.validUntil) : null
    }));
  } catch (error) {
    console.error("Error fetching promos:", error);
    return [];
  }
}

/**
 * Create new promo
 */
export async function createPromo(data) {
  try {
    const { data: existing } = await d1Request("promos", { method: "GET" });
    if (existing && existing.find(p => p.code === data.code.toUpperCase())) {
        throw new Error("Kode promo sudah ada!");
    }

    const id = "promo_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const body = {
      id,
      ...data,
      code: data.code.toUpperCase(),
      usedCount: 0,
      isActive: data.isActive ? 1 : 0
    };

    if (body.validUntil && body.validUntil instanceof Date) {
        body.validUntil = body.validUntil.toISOString();
    }

    await d1Request("promos", {
        method: "POST",
        body
    });
    return id;
  } catch (error) {
    console.error("Error creating promo:", error);
    throw error;
  }
}

/**
 * Update promo
 */
export async function updatePromo(id, data) {
  try {
    const body = {
        ...data,
        updatedAt: new Date().toISOString()
    };
    if (body.code) body.code = body.code.toUpperCase();
    if (typeof body.isActive === "boolean") body.isActive = body.isActive ? 1 : 0;
    
    await d1Request("promos", {
        method: "PATCH",
        id,
        body
    });
    return true;
  } catch (error) {
    console.error("Error updating promo:", error);
    throw error;
  }
}

/**
 * Toggle promo active status
 */
export async function togglePromoActive(id, isActive) {
  try {
    await d1Request("promos", {
        method: "PATCH",
        id,
        body: { isActive: isActive ? 1 : 0, updatedAt: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error("Error toggling promo:", error);
    throw error;
  }
}

/**
 * Delete promo
 */
export async function deletePromo(id) {
  try {
    await d1Request("promos", {
        method: "DELETE",
        id
    });
    return true;
  } catch (error) {
    console.error("Error deleting promo:", error);
    throw error;
  }
}

/**
 * Validate promo code for user use (client-side check)
 */
export async function validatePromoCode(code) {
  try {
    const { data } = await d1Request("promos", { method: "GET" });
    const promos = data || [];
    const promoMatch = promos.find(p => p.code === code.toUpperCase());
    
    if (!promoMatch) {
        throw new Error("Kode promo tidak ditemukan.");
    }
    
    const promo = {
        ...promoMatch,
        isActive: Boolean(promoMatch.isActive),
        validUntil: promoMatch.validUntil ? new Date(promoMatch.validUntil) : null
    };

    if (!isPromoActive(promo)) {
        throw new Error("Kode promo sudah tidak aktif atau kadaluarsa.");
    }
    return promo;
  } catch (error) {
    throw error;
  }
}
