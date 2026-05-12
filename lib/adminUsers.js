import { d1Request } from "@/lib/d1Client";

/**
 * Fetch all users (paginated or full)
 */
export async function getAllUsers() {
  try {
    const { data } = await d1Request("users", { method: "GET" });
    return data || [];
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

/**
 * Polling listener for all users (emulating onSnapshot)
 */
export function subscribeToUsers(callback) {
  let isCancelled = false;

  const fetchUsersData = async () => {
    if (isCancelled) return;
    try {
      const { data } = await d1Request("users", { method: "GET" });
      const users = (data || []).map(d => ({
         ...d,
         createdAt: d.created_at ? new Date(d.created_at) : new Date(d.createdAt || 0)
      }));
      
      // Sort by createdAt descending
      users.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      
      callback(users);
    } catch (e) {
      console.error("Error polling users:", e);
    }
  };

  fetchUsersData();
  const interval = setInterval(fetchUsersData, 5000); // Poll every 5s

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}

/**
 * Get single user detail
 */
export async function getUserDetail(userId) {
  try {
    const { data } = await d1Request("users", { method: "GET", id: userId });
    return data || null;
  } catch (error) {
    console.error("Error fetching user detail:", error);
    return null;
  }
}

/**
 * Update user plan
 */
export async function updateUserPlan(userId, newPlan) {
  try {
    await d1Request("users", {
        method: "PATCH",
        id: userId,
        body: { plan: newPlan, updated_at: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error("Error updating user plan:", error);
    throw error;
  }
}

/**
 * Update user credits directly
 */
export async function updateUserCredits(userId, newCredits) {
  try {
    await d1Request("users", {
        method: "PATCH",
        id: userId,
        body: { credits: Math.max(0, newCredits), updated_at: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error("Error updating user credits:", error);
    throw error;
  }
}

/**
 * Update user data (plan, credits, displayName)
 */
export async function updateUser(userId, data) {
  try {
    await d1Request("users", {
        method: "PATCH",
        id: userId,
        body: { ...data, updated_at: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete user document from D1
 */
export async function deleteUserDoc(userId) {
  try {
    await d1Request("users", {
        method: "DELETE",
        id: userId
    });
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}
