import { d1Request } from "@/lib/d1Client";

function sortRequests(items) {
  return [...items].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;

    const aTime = a.timestamp ? new Date(a.timestamp) : new Date(0);
    const bTime = b.timestamp ? new Date(b.timestamp) : new Date(0);
    return bTime - aTime;
  });
}

/**
 * Fetch all pending payment requests
 */
export async function getPendingTopups() {
  try {
    const { data } = await d1Request("topups", { method: "GET" });
    const pending = (data || []).filter(item => item.status === "pending");
    return sortRequests(pending);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    return [];
  }
}

/**
 * Fetch all payment requests
 */
export async function getAllTopups(limit = 50) {
  try {
    const { data } = await d1Request("topups", { method: "GET" });
    return sortRequests(data || []).slice(0, limit);
  } catch (error) {
    console.error("Error fetching all requests:", error);
    return [];
  }
}

/**
 * Approve a payment request
 */
export async function approveTopup(requestOrId, userId, amount) {
  try {
    const requestId = typeof requestOrId === "string" ? requestOrId : requestOrId?.id;
    if (!requestId) throw new Error("ID permintaan pembayaran tidak valid.");

    const { data: requestData } = await d1Request("topups", { method: "GET", id: requestId });
    if (!requestData) throw new Error("Permintaan pembayaran tidak ditemukan.");
    if (requestData.status !== "pending") throw new Error("Permintaan ini sudah pernah diproses.");

    const requestUserId = requestData.userId || userId;
    if (!requestUserId) throw new Error("User tujuan tidak ditemukan.");

    const { data: userData } = await d1Request("users", { method: "GET", id: requestUserId });
    if (!userData) throw new Error("Data user tidak ditemukan.");

    const now = new Date().toISOString();
    const safeRequestType = requestData.requestType || "topup";

    // Update Topup Request
    await d1Request("topups", {
      method: "PATCH",
      id: requestId,
      body: {
        status: "approved",
        approvedAt: now,
        rejectedAt: null,
        rejectedReason: ""
      }
    });

    // Update User
    if (safeRequestType === "plan") {
      await d1Request("users", {
        method: "PATCH",
        id: requestUserId,
        body: {
          plan: requestData.planId || "free",
          updated_at: now
        }
      });
    } else {
      const currentCredits = Number(userData.credits ?? 0);
      const creditsToAdd = Number(requestData.amount ?? amount ?? 0);
      await d1Request("users", {
        method: "PATCH",
        id: requestUserId,
        body: {
          credits: currentCredits + Math.max(0, creditsToAdd),
          updated_at: now
        }
      });
    }

    // Update Promo (if any)
    if (requestData.promoId) {
      const { data: promoData } = await d1Request("promos", { method: "GET", id: requestData.promoId });
      if (promoData) {
        await d1Request("promos", {
          method: "PATCH",
          id: requestData.promoId,
          body: {
            usedCount: (promoData.usedCount || 0) + 1,
            updatedAt: now
          }
        });
      }
    }

    return true;
  } catch (error) {
    console.error("Error approving payment request:", error);
    throw error;
  }
}

/**
 * Reject a payment request
 */
export async function rejectTopup(requestId, reason = "") {
  try {
    await d1Request("topups", {
      method: "PATCH",
      id: requestId,
      body: {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectedReason: reason,
      }
    });
    return true;
  } catch (error) {
    console.error("Error rejecting payment request:", error);
    throw error;
  }
}

/**
 * Edit user credits directly
 */
export async function editUserCredits(userId, newCredits) {
  try {
    await d1Request("users", {
      method: "PATCH",
      id: userId,
      body: {
        credits: Math.max(0, newCredits),
        updated_at: new Date().toISOString()
      }
    });
    return true;
  } catch (error) {
    console.error("Error editing user credits:", error);
    throw error;
  }
}

/**
 * Get user info with credits
 */
export async function getUserWithCredits(userId) {
  try {
    const { data } = await d1Request("users", { method: "GET", id: userId });
    return data || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Polling listener for payment requests
 */
export function subscribeToTopups(callback) {
  let isCancelled = false;
  const fetchData = async () => {
    if (isCancelled) return;
    try {
      const { data } = await d1Request("topups", { method: "GET" });
      callback(sortRequests(data || []));
    } catch (e) {}
  };

  fetchData();
  const interval = setInterval(fetchData, 5000);
  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

/**
 * Get statistics about payment requests
 */
export async function getTopupStats() {
  try {
    const { data } = await d1Request("topups", { method: "GET" });
    const requests = data || [];

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalAmount = 0;
    let approvedPlans = 0;

    requests.forEach((item) => {
      const status = item.status;
      const requestType = item.requestType || "topup";

      if (status === "pending") pending++;
      if (status === "approved") {
        approved++;
        if (requestType === "topup") {
          totalAmount += item.amount || 0;
        }
        if (requestType === "plan") {
          approvedPlans++;
        }
      }
      if (status === "rejected") rejected++;
    });

    return {
      pending,
      approved,
      rejected,
      totalAmount,
      approvedPlans,
    };
  } catch (error) {
    console.error("Error fetching payment request stats:", error);
    return { pending: 0, approved: 0, rejected: 0, totalAmount: 0, approvedPlans: 0 };
  }
}
