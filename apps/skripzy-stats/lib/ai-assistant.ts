import { deductCredits, generateStatsInterpretationWithAI } from './api';

export async function interpretWithAI(outputData: any) {
  try {
    // 1. Potong kredit terlebih dahulu (3 kredit)
    await deductCredits(3);

    // 2. Siapkan prompt dari output data
    const systemInstruction = `Kamu adalah ahli statistik dari Universitas Indonesia.
Tugasmu adalah menginterpretasikan tabel hasil analisis statistik dengan bahasa Indonesia yang sangat ramah, profesional, dan mudah dipahami oleh mahasiswa yang sedang menyusun skripsi.
Hindari jargon teknis yang terlalu rumit, jelaskan secara praktis apa arti dari angka-angka tersebut bagi penelitian mereka.
Gunakan markdown untuk menebalkan teks yang penting. Buat paragraf yang singkat. Jangan berikan salam pembuka atau penutup yang terlalu panjang, langsung ke intinya.`;

    const prompt = `Berikut adalah hasil analisis statistik:
Judul: ${outputData.title}
Data:
${JSON.stringify(outputData.content, null, 2)}

Tolong berikan interpretasi untuk hasil di atas. Beritahu apakah hasilnya signifikan atau tidak (jika ada), dan apa kesimpulannya secara sederhana.`;

    // 3. Panggil AI
    const result = await generateStatsInterpretationWithAI(prompt, systemInstruction);
    
    // Result format dari endpoint AI: { text: "...", ... }
    return result.text || "Tidak ada respons dari AI.";
  } catch (error: any) {
    throw new Error(error.message || "Terjadi kesalahan saat memanggil AI.");
  }
}
