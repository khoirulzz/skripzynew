import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, collectionGroup, onSnapshot } from "firebase/firestore";

/**
 * Fetch total user count
 */
export async function getTotalUsers() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.size;
  } catch (error) {
    console.error("Error fetching total users:", error);
    return 0;
  }
}

/**
 * Fetch total request count (all time)
 */
export async function getTotalRequests() {
  try {
    const requestsRef = collection(db, "requests");
    const snapshot = await getDocs(requestsRef);
    return snapshot.size;
  } catch (error) {
    console.error("Error fetching total requests:", error);
    return 0;
  }
}

/**
 * Fetch requests grouped by tool type
 * @returns { toolName: string, count: number }[]
 */
export async function getRequestsByTool() {
  try {
    const requestsRef = collection(db, "requests");
    const snapshot = await getDocs(requestsRef);
    
    const toolCounts = {};
    snapshot.forEach((doc) => {
      const { toolName } = doc.data();
      if (toolName) {
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      }
    });

    return Object.entries(toolCounts).map(([toolName, count]) => ({
      name: toolName,
      value: count,
    }));
  } catch (error) {
    console.error("Error fetching requests by tool:", error);
    return [];
  }
}

/**
 * Fetch requests grouped by status (success/failed)
 */
export async function getRequestsByStatus() {
  try {
    const requestsRef = collection(db, "requests");
    const snapshot = await getDocs(requestsRef);
    
    let successCount = 0;
    let failedCount = 0;

    snapshot.forEach((doc) => {
      const { status } = doc.data();
      if (status === "success") {
        successCount++;
      } else if (status === "failed") {
        failedCount++;
      }
    });

    return [
      { name: "Berhasil", value: successCount },
      { name: "Gagal", value: failedCount },
    ];
  } catch (error) {
    console.error("Error fetching requests by status:", error);
    return [];
  }
}

/**
 * Fetch user count by plan type
 * @returns { planName: string, count: number }[]
 */
export async function getUsersByPlan() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    
    const planCounts = { Free: 0, Pro: 0, Plus: 0 };
    snapshot.forEach((doc) => {
      const { plan } = doc.data();
      if (plan && planCounts.hasOwnProperty(plan)) {
        planCounts[plan]++;
      }
    });

    return Object.entries(planCounts).map(([plan, count]) => ({
      name: plan,
      value: count,
    }));
  } catch (error) {
    console.error("Error fetching users by plan:", error);
    return [];
  }
}

/**
 * Setup real-time listener for dashboard stats
 */
export function subscribeToUserCount(callback) {
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Setup real-time listener for request count
 */
export function subscribeToRequestCount(callback) {
  const requestsRef = collection(db, "requests");
  return onSnapshot(requestsRef, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Setup real-time listener for requests by tool
 */
export function subscribeToRequestsByTool(callback) {
  const requestsRef = collection(db, "requests");
  return onSnapshot(requestsRef, (snapshot) => {
    const toolCounts = {};
    snapshot.forEach((doc) => {
      const { toolName } = doc.data();
      if (toolName) {
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      }
    });

    const data = Object.entries(toolCounts).map(([toolName, count]) => ({
      name: toolName,
      value: count,
    }));
    callback(data);
  });
}
