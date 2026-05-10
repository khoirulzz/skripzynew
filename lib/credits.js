/**
 * SKRIPZY - Credit Management Helpers
 * Semua operasi deduct/refund kredit dilakukan via Firestore transaction
 * agar tidak terjadi race condition saat kredit dikurangi bersamaan.
 */

import { d1Request } from "@/lib/d1Client";

/**
 * Kurangi kredit user. Throw Error jika kredit tidak cukup.
 * @param {string} userId  - Firebase UID
 * @param {number} amount  - Jumlah kredit yang dikurangi
 */
export async function deductCredits(userId, amount) {
  // TODO: Implement atomic update in D1 Worker later.
  // For now, fetch and patch.
  const userResp = await d1Request("users", { id: userId });
  const userData = userResp.data;
  if (!userData) throw new Error("Akun tidak ditemukan.");

  const current = userData.credits ?? 0;
  if (current < amount) throw new Error(`Kredit tidak cukup. Dibutuhkan ${amount}, tersisa ${current}.`);

  await d1Request("users", {
    method: "PATCH",
    id: userId,
    body: { credits: current - amount }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("skripzy:credits_updated"));
  }
}

/**
 * Kembalikan kredit jika terjadi error setelah deduct.
 * @param {string} userId
 * @param {number} amount
 */
export async function refundCredits(userId, amount) {
  const userResp = await d1Request("users", { id: userId });
  const userData = userResp.data;
  if (!userData) return;
  const current = userData.credits ?? 0;
  
  await d1Request("users", {
    method: "PATCH",
    id: userId,
    body: { credits: current + amount }
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("skripzy:credits_updated"));
  }
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
