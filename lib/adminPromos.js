import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  query,
  where,
  getDoc,
  increment,
} from "firebase/firestore";

/**
 * Real-time listener for all promos
 */
export function subscribeToPromos(callback) {
  const promosRef = collection(db, "promos");
  return onSnapshot(promosRef, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort: active first, then by createdAt desc
    items.sort((a, b) => {
      const aActive = isPromoActive(a);
      const bActive = isPromoActive(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
    });
    callback(items);
  });
}

/**
 * Check if a promo is currently active
 */
export function isPromoActive(promo) {
  if (!promo.isActive) return false;
  const now = new Date();
  if (promo.validUntil) {
    const expiry = promo.validUntil.toDate ? promo.validUntil.toDate() : new Date(promo.validUntil);
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
    const promosRef = collection(db, "promos");
    const snapshot = await getDocs(promosRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching promos:", error);
    return [];
  }
}

/**
 * Create new promo
 * @param {object} data - { code, discountPercent, discountAmount, validUntil, usageLimit, isActive, description, type }
 */
export async function createPromo(data) {
  try {
    // Check for duplicate code
    const promosRef = collection(db, "promos");
    const existing = await getDocs(query(promosRef, where("code", "==", data.code.toUpperCase())));
    if (!existing.empty) throw new Error("Kode promo sudah ada!");

    const docRef = await addDoc(promosRef, {
      ...data,
      code: data.code.toUpperCase(),
      usedCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
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
    const promoRef = doc(db, "promos", id);
    await updateDoc(promoRef, {
      ...data,
      code: data.code?.toUpperCase(),
      updatedAt: Timestamp.now(),
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
    const promoRef = doc(db, "promos", id);
    await updateDoc(promoRef, { isActive, updatedAt: Timestamp.now() });
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
    const promoRef = doc(db, "promos", id);
    await deleteDoc(promoRef);
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
    const promosRef = collection(db, "promos");
    const q = query(promosRef, where("code", "==", code.toUpperCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error("Kode promo tidak ditemukan.");
    const promo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    if (!isPromoActive(promo)) throw new Error("Kode promo sudah tidak aktif atau kadaluarsa.");
    return promo;
  } catch (error) {
    throw error;
  }
}
