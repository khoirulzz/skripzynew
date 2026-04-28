# Blueprint Arsitektur Manajemen Referensi (RAG System)

Berikut adalah cetak biru teknis dan detail arsitektur untuk fitur Manajemen Referensi berbasis *Retrieval-Augmented Generation* (RAG) di dalam *workspace* Skripzy.

## 1. Topologi Komponen & Peran

Arsitektur ini menggunakan pendekatan *Hybrid Processing* (Client-Side & Server-Side) untuk meminimalisir beban *bandwidth* dan biaya *server*.

* **Next.js (Client-Side):** Menangani pembacaan PDF, ekstraksi teks, *chunking*, pengelolaan *state* antarmuka, dan rendering *PDF Viewer*.
* **Next.js (Server Actions):** Menjadi perantara komunikasi aman antara antarmuka dan *database* (Firestore).
* **Cloudinary:** Penyimpanan objek untuk *file* PDF asli (sebagai referensi visual).
* **Firestore:** Basis data utama penyimpan teks *chunk*, metadata, dan *embedding* (menggunakan *native Vector Search*).
* **Cloudflare Workers:** *API Gateway* untuk mengeksekusi *request* AI.
* **AI Engine (Gemini):**
    * `text-embedding-002`: Model representasi vektor (Pencarian semantik).
    * `model_AI yg sudah ada di sistem ini (pakai group_2)`: Model generatif utama (Sintesis artikel/jawaban).

---

## 2. Alur Sistem A: Ingesti Dokumen (Upload & Indexing)

Proses ini terjadi saat pengguna menambahkan jurnal baru ke dalam *workspace*. Beban ekstraksi teks dialihkan sepenuhnya ke sisi pengguna (*browser*).

**Langkah demi Langkah:**
1.  **Seleksi Berkas (Frontend):** Pengguna memilih *file* PDF dari antarmuka Skripzy.
2.  **Parsing & Chunking (Client-Side):**
    * Modul `pdf.js` berjalan di *browser* untuk mengurai isi PDF.
    * Teks diekstrak per halaman dan dipecah menjadi unit-unit kecil (*chunk*) berukuran ~500–1000 karakter.
    * Setiap *chunk* secara otomatis diikat dengan **nomor halaman** asalnya.
3.  **Upload Paralel:**
    * *Frontend* mengunggah *file* PDF utuh secara langsung (*direct upload*) ke **Cloudinary** untuk mendapatkan *URL public*.
    * *Frontend* mem- *bypass* *file* berat dan hanya mengirimkan objek JSON (berisi teks *chunk* dan metadata) ke Next.js API.
4.  **Vektorisasi (Workers & Gemini):**
    * Next.js API meneruskan teks *chunk* ke Cloudflare Workers.
    * Workers memanggil API `text-embedding-004` untuk mengubah setiap string teks menjadi *array* vektor bernilai numerik.
5.  **Penyimpanan Indeks (Firestore):**
    * Setiap *chunk*, vektor, URL Cloudinary, dan nomor halaman disimpan sebagai satu dokumen unik di koleksi Firestore.

---

## 3. Alur Sistem B: Retrieval & Generation (Querying)

Proses ini dieksekusi saat pengguna berinteraksi di dalam *workspace*, seperti meminta AI membuatkan landasan teori berdasarkan dua jurnal spesifik.

**Langkah demi Langkah:**
1.  **Pemicu Instruksi (Frontend):** Pengguna mengetik *prompt* dan mengaktifkan kotak centang (*checkbox*) pada referensi jurnal yang dituju.
2.  **Vektorisasi Query:** *Prompt* pengguna dikirim ke Workers untuk diubah menjadi vektor pencarian (menggunakan `text-embedding-004`).
3.  **Pencarian Vektor Berfilter (Firestore):**
    * Sistem melakukan operasi *Vector Search* di Firestore menggunakan metode jarak *Cosine* (Cosine Similarity).
    * **Kondisi Wajib:** Pencarian difilter secara absolut menggunakan klausa `where('documentId', 'in', [Daftar_ID_Jurnal_Dicentang])`.
    * Output: 5 hingga 10 dokumen *chunk* yang memiliki nilai kedekatan vektor tertinggi dengan *prompt*.
4.  **Perakitan Konteks (Prompt Assembly):**
    * Sistem merangkai teks dari *chunk* yang berhasil ditarik ke dalam satu *template prompt* sistem (*System Prompt*).
    * Struktur rakitan mewajibkan penyertaan identitas sumber: `[Referensi X - Judul Jurnal, Halaman Y]: {Teks Chunk}`.
5.  **Sintesis AI (Gemini 3 Flash):**
    * Konteks lengkap dikirim ke `gemini-3-flash` melalui Workers.
    * Model diinstruksikan dengan aturan ketat (*system instructions*) untuk hanya menjawab berdasarkan konteks yang diberikan dan menyisipkan sitasi tepercaya di akhir kalimat (contoh: `... [Referensi 1, Hal. 4]`).
6.  **Pengiriman Respons:** Teks hasil sintesis beserta objek referensi mentah (URL & Halaman) dikirim kembali ke *Frontend*.

---

## 4. Skema Basis Data Vektor (Firestore)

Koleksi didesain mendatar (*flat*) untuk memaksimalkan kecepatan pembacaan pada *Vector Search*.

**Nama Koleksi:** `reference_chunks`

```json
{
  "chunk_id": "string (Auto-generated)",
  "user_id": "string (Firebase Auth UID)",
  "document_id": "string (Relasi ke dokumen induk)",
  "document_title": "string (Judul jurnal)",
  "cloudinary_url": "string (URL statis PDF)",
  "page_number": "number (Halaman spesifik dari chunk)",
  "text_content": "string (Teks mentah hasil ekstraksi)",
  "embedding_vector": "VectorValue (Array 768 dimensi)",
  "created_at": "timestamp"
}
```

---

## 5. Mekanisme Antarmuka Sitasi Aktif (UI/UX)

Untuk menciptakan pengalaman *workspace* yang utuh, jawaban teks dari AI harus terhubung dengan berkas visual aslinya.

1.  **Render Sitasi:** Saat antarmuka menerima respons, setiap teks sitasi (misal: `[Referensi 1, Hal. 4]`) dirender sebagai komponen *React Button/Link* yang dapat diklik.
2.  **Interaksi Klik:**
    * Saat sitasi diklik, sistem mengekstrak `cloudinary_url` dan `page_number` dari objek data referensi yang tersimpan di memori lokal (*client state*).
    * Sistem membuka panel *PDF Viewer* (misal: menggunakan `react-pdf`) di sebelah obrolan.
3.  **Navigasi Otomatis:** *PDF Viewer* memuat dokumen dari Cloudinary dan menjalankan fungsi *scroll-to-page* menuju nomor halaman yang tepat secara otomatis, memungkinkan pengguna memverifikasi kutipan AI seketika.