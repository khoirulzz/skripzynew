/**
 * Script untuk membuat sample data di Firestore untuk testing admin dashboard
 * Run: npm run seed-data (setelah ditambahkan ke package.json scripts)
 * 
 * Atau jalankan di console browser admin panel:
 * import { seedTestData } from "@/lib/seedData";
 * await seedTestData();
 */

import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export async function seedTestData() {
  try {
    console.log("🌱 Starting to seed test data...");

    // Define tools
    const tools = [
      "parafrase",
      "humanizer",
      "cek-grammar",
      "ai-detector",
      "referensi",
      "asisten-ai",
      "simulasi-sidang",
    ];

    // Add 50 sample requests
    const requestsRef = collection(db, "requests");
    for (let i = 0; i < 50; i++) {
      const toolName = tools[Math.floor(Math.random() * tools.length)];
      const status = Math.random() > 0.15 ? "success" : "failed";

      await addDoc(requestsRef, {
        userId: `user-${Math.floor(Math.random() * 10) + 1}`,
        toolName: toolName,
        status: status,
        creditsUsed: Math.floor(Math.random() * 50) + 1,
        timestamp: Timestamp.fromDate(
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        ),
      });
    }

    console.log("✅ Successfully seeded 50 sample requests!");
    return true;
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

/**
 * Helper: Clean all test data
 */
export async function clearTestData() {
  try {
    console.log("🗑️  Clearing test data...");
    const requestsRef = collection(db, "requests");
    const snapshot = await getDocs(requestsRef);

    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }

    console.log("✅ Cleared all requests!");
    return true;
  } catch (error) {
    console.error("❌ Error clearing data:", error);
    throw error;
  }
}
