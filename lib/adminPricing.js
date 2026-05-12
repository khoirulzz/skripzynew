import { d1Request } from "@/lib/d1Client";

/**
 * Real-time listener for all pricing docs
 * Emulates onSnapshot
 */
export function subscribeToPricing(callback) {
  let isCancelled = false;

  const fetchPricingData = async () => {
    if (isCancelled) return;
    try {
      const { data } = await d1Request("pricing", { method: "GET" });
      const items = (data || []).map(d => {
         let planPrices = d.planPrices;
         if (typeof planPrices === "string") {
             try { planPrices = JSON.parse(planPrices); } catch(e){}
         }
         return {
           ...d,
           planPrices,
           popular: Boolean(d.popular),
           createdAt: d.createdAt ? new Date(d.createdAt) : new Date(0),
           updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(0)
         };
      });
      callback(items);
    } catch (e) {
      console.error("Error polling pricing:", e);
    }
  };

  fetchPricingData();
  const interval = setInterval(fetchPricingData, 10000); // Poll every 10s

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

/**
 * Fetch all pricing
 */
export async function getPricing() {
  try {
    const { data } = await d1Request("pricing", { method: "GET" });
    return (data || []).map(d => {
        let planPrices = d.planPrices;
        if (typeof planPrices === "string") {
            try { planPrices = JSON.parse(planPrices); } catch(e){}
        }
        return {
          ...d,
          planPrices,
          popular: Boolean(d.popular),
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(0),
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(0)
        };
    });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return [];
  }
}

/**
 * Add new pricing item
 * @param {object} data - { toolName, creditCost, planPrices: {free, pro, plus}, category, description }
 */
export async function addPricing(data) {
  try {
    const id = "price_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // We stringify planPrices if it is an object because D1 can't store JSON objects natively without JSON functions or TEXT
    const body = {
      id,
      ...data,
      planPrices: typeof data.planPrices === 'object' ? JSON.stringify(data.planPrices) : data.planPrices,
      popular: data.popular ? 1 : 0
    };

    await d1Request("pricing", {
      method: "POST",
      body
    });
    return id;
  } catch (error) {
    console.error("Error adding pricing:", error);
    throw error;
  }
}

/**
 * Create or replace pricing item with deterministic id
 */
export async function upsertPricing(id, data) {
  try {
    const { data: existing } = await d1Request("pricing", { method: "GET", id });

    const body = {
      id,
      ...data,
      planPrices: typeof data.planPrices === 'object' ? JSON.stringify(data.planPrices) : data.planPrices,
      popular: data.popular ? 1 : 0,
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      // update
      await d1Request("pricing", {
        method: "PATCH",
        id,
        body
      });
    } else {
      // create
      body.createdAt = new Date().toISOString();
      await d1Request("pricing", {
        method: "POST",
        body
      });
    }
    return id;
  } catch (error) {
    console.error("Error upserting pricing:", error);
    throw error;
  }
}

/**
 * Update pricing item
 */
export async function updatePricing(id, data) {
  try {
    const body = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    if (data.planPrices && typeof data.planPrices === 'object') {
      body.planPrices = JSON.stringify(data.planPrices);
    }
    if (typeof data.popular === "boolean") {
      body.popular = data.popular ? 1 : 0;
    }

    await d1Request("pricing", {
      method: "PATCH",
      id,
      body
    });
    return true;
  } catch (error) {
    console.error("Error updating pricing:", error);
    throw error;
  }
}

/**
 * Delete pricing item
 */
export async function deletePricing(id) {
  try {
    await d1Request("pricing", {
      method: "DELETE",
      id
    });
    return true;
  } catch (error) {
    console.error("Error deleting pricing:", error);
    throw error;
  }
}
