/**
 * SKRIPZY - Credit Management Helpers
 * Semua operasi deduct/refund kredit dilakukan via Firestore transaction
 * agar tidak terjadi race condition saat kredit dikurangi bersamaan.
 */

import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Kurangi kredit user. Throw Error jika kredit tidak cukup.
 * @param {string} userId  - Firebase UID
 * @param {number} amount  - Jumlah kredit yang dikurangi
 */
export async function deductCredits(userId, amount) {
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error("Akun tidak ditemukan.");

    const current = snap.data().credits ?? 0;
    if (current < amount) throw new Error(`Kredit tidak cukup. Dibutuhkan ${amount}, tersisa ${current}.`);

    transaction.update(userRef, { credits: current - amount });
  });
}

/**
 * Kembalikan kredit jika terjadi error setelah deduct.
 * @param {string} userId
 * @param {number} amount
 */
export async function refundCredits(userId, amount) {
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;
    const current = snap.data().credits ?? 0;
    transaction.update(userRef, { credits: current + amount });
  });
}

/**
 * Cek apakah user memiliki kredit yang cukup tanpa melakukan deduct.
 * @param {number} currentCredits - Dari userData.credits
 * @param {number} required
 * @returns {boolean}
 */
export function hasEnoughCredits(currentCredits, required) {
  return (currentCredits ?? 0) >= required;
}

/**
 * Ambil batas karakter berdasarkan plan user.
 * @param {string} plan - 'free' | 'pro' | 'plus'
 * @returns {number}
 */
export function getCharLimit(plan) {
  switch (plan) {
    case "plus": return 8000;
    case "pro":  return 5000;
    default:     return 2000;
  }
}
