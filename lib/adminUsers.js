import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

/**
 * Fetch all users (paginated or full)
 */
export async function getAllUsers() {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

/**
 * Real-time listener for all users
 */
export function subscribeToUsers(callback) {
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot) => {
    const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by createdAt descending
    users.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime;
    });
    callback(users);
  });
}

/**
 * Get single user detail
 */
export async function getUserDetail(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
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
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { plan: newPlan, updatedAt: Timestamp.now() });
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
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { credits: Math.max(0, newCredits), updatedAt: Timestamp.now() });
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
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { ...data, updatedAt: Timestamp.now() });
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete user document from Firestore
 * Note: Firebase Auth deletion requires Admin SDK (server-side)
 */
export async function deleteUserDoc(userId) {
  try {
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}
