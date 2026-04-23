import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

/**
 * Real-time listener for all pricing docs
 */
export function subscribeToPricing(callback) {
  const pricingRef = collection(db, "pricing");
  return onSnapshot(pricingRef, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

/**
 * Fetch all pricing
 */
export async function getPricing() {
  try {
    const pricingRef = collection(db, "pricing");
    const snapshot = await getDocs(pricingRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    const pricingRef = collection(db, "pricing");
    const docRef = await addDoc(pricingRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding pricing:", error);
    throw error;
  }
}

/**
 * Update pricing item
 */
export async function updatePricing(id, data) {
  try {
    const pricingRef = doc(db, "pricing", id);
    await updateDoc(pricingRef, { ...data, updatedAt: Timestamp.now() });
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
    const pricingRef = doc(db, "pricing", id);
    await deleteDoc(pricingRef);
    return true;
  } catch (error) {
    console.error("Error deleting pricing:", error);
    throw error;
  }
}
