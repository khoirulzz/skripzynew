import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, Timestamp, addDoc } from "firebase/firestore";

/**
 * Fetch all pending top-ups
 */
export async function getPendingTopups() {
  try {
    const topupsRef = collection(db, "topups");
    const q = query(topupsRef, where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching pending topups:", error);
    return [];
  }
}

/**
 * Fetch all top-ups (including approved/rejected)
 */
export async function getAllTopups(limit = 50) {
  try {
    const topupsRef = collection(db, "topups");
    const snapshot = await getDocs(topupsRef);
    
    const topups = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by timestamp descending
    return topups.sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0)).slice(0, limit);
  } catch (error) {
    console.error("Error fetching all topups:", error);
    return [];
  }
}

/**
 * Approve a top-up request
 */
export async function approveTopup(topupId, userId, amount) {
  try {
    const topupRef = doc(db, "topups", topupId);
    const userRef = doc(db, "users", userId);

    // Update topup status
    await updateDoc(topupRef, {
      status: "approved",
      approvedAt: Timestamp.now(),
    });

    // Add credits to user
    const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", userId)));
    if (userDoc.docs.length > 0) {
      const currentCredits = userDoc.docs[0].data().credits ?? 0;
      await updateDoc(userRef, {
        credits: currentCredits + amount,
      });
    }

    return true;
  } catch (error) {
    console.error("Error approving topup:", error);
    throw error;
  }
}

/**
 * Reject a top-up request
 */
export async function rejectTopup(topupId, reason = "") {
  try {
    const topupRef = doc(db, "topups", topupId);
    await updateDoc(topupRef, {
      status: "rejected",
      rejectedAt: Timestamp.now(),
      rejectedReason: reason,
    });
    return true;
  } catch (error) {
    console.error("Error rejecting topup:", error);
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
    const userRef = doc(db, "users", userId);
    const snapshot = await getDocs(query(collection(db, "users"), where("__name__", "==", userId)));
    
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
 * Real-time listener for pending top-ups
 */
export function subscribeToTopups(callback) {
  const topupsRef = collection(db, "topups");
  return onSnapshot(topupsRef, (snapshot) => {
    const topups = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort by timestamp descending, pending first
    topups.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0);
    });
    
    callback(topups);
  });
}

/**
 * Get statistics about top-ups
 */
export async function getTopupStats() {
  try {
    const topupsRef = collection(db, "topups");
    const snapshot = await getDocs(topupsRef);

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalAmount = 0;

    snapshot.forEach((doc) => {
      const { status, amount } = doc.data();
      if (status === "pending") pending++;
      else if (status === "approved") {
        approved++;
        totalAmount += amount || 0;
      } else if (status === "rejected") rejected++;
    });

    return {
      pending,
      approved,
      rejected,
      totalAmount,
    };
  } catch (error) {
    console.error("Error fetching topup stats:", error);
    return { pending: 0, approved: 0, rejected: 0, totalAmount: 0 };
  }
}
