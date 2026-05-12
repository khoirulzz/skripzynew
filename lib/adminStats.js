import { d1Request } from "@/lib/d1Client";

/**
 * Fetch total user count
 */
export async function getTotalUsers() {
  try {
    const { data } = await d1Request("users", { method: "GET" });
    return data ? data.length : 0;
  } catch (error) {
    console.error("Error fetching total users:", error);
    return 0;
  }
}

/**
 * Fetch total request count (all time)
 * Note: Requests tracking has been deprecated/migrated. Returning 0 or mock for now.
 */
export async function getTotalRequests() {
  return 0; // Legacy collection not present in D1
}

/**
 * Fetch requests grouped by tool type
 */
export async function getRequestsByTool() {
  return []; // Legacy collection not present in D1
}

/**
 * Fetch requests grouped by status (success/failed)
 */
export async function getRequestsByStatus() {
  return [
    { name: "Berhasil", value: 0 },
    { name: "Gagal", value: 0 },
  ]; // Legacy collection not present in D1
}

/**
 * Fetch user count by plan type
 * @returns { planName: string, count: number }[]
 */
export async function getUsersByPlan() {
  try {
    const { data } = await d1Request("users", { method: "GET" });
    const planCounts = { free: 0, pro: 0, plus: 0 };
    
    (data || []).forEach((user) => {
      const plan = user.plan ? user.plan.toLowerCase() : "free";
      if (planCounts.hasOwnProperty(plan)) {
        planCounts[plan]++;
      } else {
        planCounts[plan] = 1;
      }
    });

    return Object.entries(planCounts).map(([plan, count]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
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
  let isCancelled = false;
  const fetchData = async () => {
    if (isCancelled) return;
    try {
      const { data } = await d1Request("users", { method: "GET" });
      callback(data ? data.length : 0);
    } catch (e) {
      // ignore
    }
  };
  fetchData();
  const interval = setInterval(fetchData, 15000);
  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

/**
 * Setup real-time listener for request count
 */
export function subscribeToRequestCount(callback) {
  callback(0);
  return () => {};
}

/**
 * Setup real-time listener for requests by tool
 */
export function subscribeToRequestsByTool(callback) {
  callback([]);
  return () => {};
}
