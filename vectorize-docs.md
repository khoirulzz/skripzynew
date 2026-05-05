**Cloudflare Vectorize** adalah database vektor terdistribusi secara global yang dirancang untuk membangun aplikasi berbasis AI di atas Cloudflare Workers. 

### Apa itu Vectorize?

Vectorize memungkinkan kamu untuk:
- **Menyimpan embeddings** dari model ML apa pun (Workers AI, OpenAI, dll.) untuk pencarian semantik dan klasifikasi
- **Membangun RAG (Retrieval Augmented Generation)** — menambahkan konteks ke query LLM dengan mencari vektor yang relevan
- **Filter berdasarkan metadata** untuk mempersempit hasil pencarian

Hasil pencarian vektor bisa merujuk ke data konkret di R2 (gambar), KV (dokumen), atau D1 (profil pengguna) — semuanya dalam ekosistem Cloudflare.

---

### Batas (Limits) Vectorize V2

| Fitur | Workers Free | Workers Paid |
|---|---|---|
| **Index per akun** | 100 | 50.000 |
| **Vektor per index** | 10.000.000 | 10.000.000 |
| **Dimensi per vektor** | 1.536 (32-bit float) | 1.536 (32-bit float) |
| **Metadata per vektor** | 10 KiB | 10 KiB |
| **Hasil kueri (topK)** — dengan values/metadata | 50 | 50 |
| **Hasil kueri (topK)** — tanpa values/metadata | 100 | 100 |
| **Batch upsert** | 1.000 (Workers) / 5.000 (HTTP API) | 1.000 (Workers) / 5.000 (HTTP API) |
| **Namespace per index** | 1.000 | 50.000 |
| **Metadata index per index** | 10 | 10 |
| **Ukuran upload vektor maks** | 100 MB | 100 MB |

### Harga

| Metrik | Workers Free | Workers Paid |
|---|---|---|
| **Queried vector dimensions** | 30 juta / bulan | 50 juta pertama gratis + $0,01 per juta |
| **Stored vector dimensions** | 5 juta | 10 juta pertama gratis + $0,05 per 100 juta |

**Contoh:** Menyimpan 10.000 vektor (768 dimensi) dan query 1.000x/hari ≈ **$0,31/bulan**.