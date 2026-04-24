import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  Timestamp,
  increment,
  runTransaction,
} from "firebase/firestore";

function sortRequests(items) {
  return [...items].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;

    const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
    const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
    return bTime - aTime;
  });
}

/**
 * Fetch all pending payment requests
 */
export async function getPendingTopups() {
  try {
    const requestsRef = collection(db, "topups");
    const pendingQuery = query(requestsRef, where("status", "==", "pending"));
    const snapshot = await getDocs(pendingQuery);

    return sortRequests(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
    );
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
    const requestsRef = collection(db, "topups");
    const snapshot = await getDocs(requestsRef);

    return sortRequests(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
    ).slice(0, limit);
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
    const requestId =
      typeof requestOrId === "string" ? requestOrId : requestOrId?.id;

    if (!requestId) {
      throw new Error("ID permintaan pembayaran tidak valid.");
    }

    await runTransaction(db, async (transaction) => {
      const requestRef = doc(db, "topups", requestId);
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists()) {
        throw new Error("Permintaan pembayaran tidak ditemukan.");
      }

      const requestData = { id: requestSnap.id, ...requestSnap.data() };
      if (requestData.status !== "pending") {
        throw new Error("Permintaan ini sudah pernah diproses.");
      }

      const requestUserId = requestData.userId || userId;
      if (!requestUserId) {
        throw new Error("User tujuan tidak ditemukan.");
      }

      const userRef = doc(db, "users", requestUserId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error("Data user tidak ditemukan.");
      }

      const now = Timestamp.now();
      const safeRequestType = requestData.requestType || "topup";

      transaction.update(requestRef, {
        status: "approved",
        approvedAt: now,
        rejectedAt: null,
        rejectedReason: "",
      });

      if (safeRequestType === "plan") {
        transaction.update(userRef, {
          plan: requestData.planId || "free",
          updatedAt: now,
        });
      } else {
        const currentCredits = userSnap.data().credits ?? 0;
        const creditsToAdd = Number(requestData.amount ?? amount ?? 0);

        transaction.update(userRef, {
          credits: currentCredits + Math.max(0, creditsToAdd),
          updatedAt: now,
        });
      }

      if (requestData.promoId) {
        const promoRef = doc(db, "promos", requestData.promoId);
        const promoSnap = await transaction.get(promoRef);

        if (promoSnap.exists()) {
          transaction.update(promoRef, {
            usedCount: increment(1),
            updatedAt: now,
          });
        }
      }
    });

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
    const requestRef = doc(db, "topups", requestId);
    await updateDoc(requestRef, {
      status: "rejected",
      rejectedAt: Timestamp.now(),
      rejectedReason: reason,
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
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      credits: Math.max(0, newCredits),
      updatedAt: Timestamp.now(),
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
    const usersRef = collection(db, "users");
    const userQuery = query(usersRef, where("__name__", "==", userId));
    const snapshot = await getDocs(userQuery);

    if (snapshot.docs.length > 0) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Real-time listener for payment requests
 */
export function subscribeToTopups(callback) {
  const requestsRef = collection(db, "topups");

  return onSnapshot(requestsRef, (snapshot) => {
    const items = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));

    callback(sortRequests(items));
  });
}

/**
 * Get statistics about payment requests
 */
export async function getTopupStats() {
  try {
    const requestsRef = collection(db, "topups");
    const snapshot = await getDocs(requestsRef);

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalAmount = 0;
    let approvedPlans = 0;

    snapshot.forEach((item) => {
      const data = item.data();
      const status = data.status;
      const requestType = data.requestType || "topup";

      if (status === "pending") pending++;
      if (status === "approved") {
        approved++;
        if (requestType === "topup") {
          totalAmount += data.amount || 0;
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
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0,
      approvedPlans: 0,
    };
  }
}
