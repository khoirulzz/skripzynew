🎓 Blueprint Fitur: Client-Side Skripsi Extraction & AI Summarization (Ephemeral)

🧠 Tujuan

Mengambil bagian penting dari dokumen skripsi secara client-side tanpa AI, lalu mengirim hasilnya dalam 1 request ke AI untuk diringkas menjadi knowledge base yang digunakan dalam simulasi sidang.

Sistem ini bersifat:

- ⚡ hemat request (cocok untuk limit 10 RPM)
- 🧼 stateless / ephemeral (tidak disimpan permanen)
- 🧠 cukup kontekstual untuk diskusi AI

---

🔄 Flow Utama

Upload File
   ↓
Extract Text (pdf.js / mammoth)
   ↓
Clean Text
   ↓
Split per BAB
   ↓
Split per paragraf
   ↓
Selective Extraction (rule-based)
   ↓
Build Context
   ↓
Kirim ke AI (1 request)
   ↓
Summary digunakan untuk sesi sidang

---

🔧 1. Extract Text

PDF

Gunakan "pdf.js"

Word

Gunakan "mammoth"

Output:

rawText (string panjang)

---

🧹 2. Cleaning Text

Tujuan

Menghilangkan noise:

- nomor halaman
- newline berlebihan
- spasi berantakan

Fungsi

function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s{2,}/g, " ")
    .replace(/Halaman\s*\d+/gi, "")
}

---

🧩 3. Split Per BAB

Deteksi BAB

Gunakan regex:

const babRegex = /BAB\s+[IVXLC]+\s+[A-Z\s]+/gi

Split

function splitByBab(text) {
  return text.split(/(?=BAB\s+[IVXLC]+)/i)
}

Output Struktur

{
  "abstrak": "...",
  "bab1": "...",
  "bab2": "...",
  "bab3": "...",
  "bab4": "...",
  "bab5": "..."
}

---

✂️ 4. Split Paragraf

function splitParagraphs(text) {
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 80)
}

---

🎯 5. Selective Extraction (Core Logic)

🟢 Full Extraction

Ambil seluruh isi:

- Abstrak
- Bab I (Pendahuluan)
- Bab V (Kesimpulan)

---

🟡 Partial Extraction (Bab II, III, IV)

Strategi kombinasi:

---

1. Ambil Awal & Akhir

const head = paragraphs.slice(0, 2)
const tail = paragraphs.slice(-2)

---

2. Keyword Filtering

const keywords = [
  "tujuan",
  "masalah",
  "metode",
  "penelitian",
  "hasil",
  "analisis",
  "eksperimen",
  "pengujian",
  "kesimpulan"
]

const important = paragraphs.filter(p =>
  keywords.some(k => p.toLowerCase().includes(k))
)

---

3. Scoring (Opsional)

function score(p) {
  let s = 0
  if (p.length > 120) s++
  if (p.includes("metode")) s += 2
  if (p.includes("hasil")) s += 2
  if (p.includes("penelitian")) s += 1
  return s
}

---

4. Ambil Top Paragraf

const top = paragraphs
  .map(p => ({ p, score: score(p) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .map(x => x.p)

---

5. Gabungkan

const bab_selected = [...head, ...top, ...tail]

---

📦 6. Build Final Context

Gabungkan semua bagian:

function buildContext(data) {
  return `
[ABSTRAK]
${data.abstrak}

[BAB I]
${data.bab1}

[BAB II - RINGKAS]
${data.bab2.join("\n")}

[BAB III - RINGKAS]
${data.bab3.join("\n")}

[BAB IV - RINGKAS]
${data.bab4.join("\n")}

[BAB V]
${data.bab5}
`
}

---

⚖️ 7. Batasan Ukuran

Target:

- 3.000 – 8.000 kata
- Hindari melebihi context model

Jika terlalu besar:

- potong Bab I & V (ambil 70–80%)

---

🤖 8. Request ke AI (Single Call)

Prompt

Berikut adalah potongan skripsi:

[context]

Tugas:
1. Ringkas isi skripsi per bab
2. Identifikasi:
   - tujuan penelitian
   - metode
   - hasil utama
   - kontribusi
   - kelemahan
3. Buat ringkasan yang bisa digunakan untuk diskusi sidang

---

📦 Output AI

{
  "bab_summary": {
    "bab1": "...",
    "bab2": "...",
    "bab3": "...",
    "bab4": "...",
    "bab5": "..."
  },
  "insight": {
    "tujuan": "...",
    "metode": "...",
    "hasil": "...",
    "kontribusi": "...",
    "kelemahan": ["...", "..."]
  }
}

---

🧠 9. Penyimpanan (Ephemeral)

Karena tidak ada persistence:

 — sessionStorage

sessionStorage.setItem("sidang_context", JSON.stringify(data))

Opsi 2 — Zustand (in-memory global state)

---

⚡ Keunggulan Desain

- 🔥 1 request AI saja
- ⚡ cepat (client yang kerja)
- 💸 hemat kuota (cocok 10 RPM)
- 🧠 tetap kontekstual
- 🧼 tidak butuh backend kompleks

---

🚨 Edge Cases

1. BAB tidak terdeteksi

Fallback:

- split berdasarkan kata "Bab"

2. Abstrak tidak ditemukan

Fallback:

- ambil 1–2 halaman pertama

3. PDF scan (non-text)

Solusi:

- tampilkan error / warning

---

🎯 Kesimpulan

Pendekatan ini adalah:

«Rule-based extraction di client + AI sebagai summarizer»

Cocok untuk:

- limit request rendah
- sistem ringan
- fitur simulasi sidang real-time

---

🚀 Future Improvement (Opsional)

- Tambah NLP ringan (TF-IDF di client)
- Highlight kalimat penting
- Adaptive extraction (berdasarkan panjang dokumen)

---

End of Blueprint