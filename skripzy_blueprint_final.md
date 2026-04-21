# 🚀 SKRIPZY – AI Research Operating System

Platform all-in-one berbasis AI untuk membantu mahasiswa dari tahap ide penelitian hingga skripsi selesai dan dikonversi menjadi jurnal.

Ini adalah upgrade dari aplikasi skripzy yang sekarang sudah ada, jadi nanti database menggunakan data firestore yang sekarang sudah ada, dan juga menggunakan database yang sama dengan aplikasi skripzy yang sekarang sudah ada, jadi nanti tidak perlu membuat database baru

# 🔷 1. CORE CONCEPT

## 🎯 Tujuan
Menyediakan workspace penelitian terstruktur yang terintegrasi dengan AI.

## 🔑 Prinsip Utama
- Workspace-based (seperti Notion)
- AI context-aware (bukan sekadar chatbot)
- Hybrid monetization (Subscription + Credit)



# 🔷 2. GLOBAL STRUCTURE

## 🧭 Header
- Logo + Nama (Skripzy)
- Credit Indicator (⚡)
- Tombol Top-up (+)
- Dashboard
- Profil
- Help (?)
- Logout

---

# 🔷 3. DASHBOARD

## A. Workspace Hub
- Skripsi
- Jurnal
- Convert Skripsi → Jurnal 

## B. Last Activity
Menampilkan riwayat penggunaan fitur:
- Generate teks
- Parafrase
- Upload referensi

## C. Quick Tools
Fitur mandiri:
- Asisten AI
- Parafrase
- Cek Grammar
- Humanizer
- AI Detector
- Referensi Cerdas
- Simulasi Sidang

Catatan:
- Semua menggunakan credit
- Bisa dikirim ke workspace

## D. Floating Feature
- Chat Dosen AI (global)

---

# 🔷 4. WORKSPACE SYSTEM

## Jenis Workspace
- Skripsi
- Jurnal
- Convert

## Isi Workspace
- List penelitian
- Progress bar
- Status (draft / revisi / selesai)

---

# 🔷 5. INSIDE WORKSPACE

## 1. Smart Canvas
Editor cerdas berbasis block dengan AI:
- Slash command (/generate, /rumusan)
- Inline AI editing
- Highlight → improve

## 2. Struktur Bab
- Bab 1–5
- Generate per bab / subbab
- Revisi per paragraf
- Cek konsistensi

## 3. Metodologi Engine

### Kuantitatif
- Form builder
- Sebar kuesioner
- Export XLS
- Analisis: validitas, reliabilitas, regresi
- Interpretasi otomatis

### Kualitatif
- Input wawancara
- Transkrip
- Coding tema
- Analisis naratif

## 4. Reference Intelligence
- Upload jurnal
- Ringkasan otomatis
- Highlight teori
- Q&A berbasis dokumen
- Sitasi otomatis
- fitur ekspor bibtex ke mendeley dengan jurnal-jurnal tercentang/diseleksi

## 5. Chat Dosen AI
- Dosen AI di dalam workspace yang mengerti konteks penelitian

## 6. Convert Skripsi → Jurnal
- Upload template jurnal
- Planning untuk mengerjakan tiap bagian
- Buat pembahasan tiap bagian


# 🔷 6. USER FLOW

1. Buat workspace
2. Tentukan topik
3. Generate Bab 1
4. Upload referensi
5. Lanjut Bab 2–5
6. Analisis data
7. Revisi

---

# 🔷 7. MONETIZATION SYSTEM

## 🔑 Prinsip
- Subscription = akses fitur
- Credit = penggunaan AI


# 🔷 8. SUBSCRIPTION PLAN

## Free
- 20 credit awal
- Fitur terbatas

## Pro
- Unlock semua fitur
- 500 credit / bulan
- Kecepatan lebih tinggi

## Plus
- Unlock semua fitur
- 2000 credit / bulan
- AI lebih advanced
- Prioritas server

## Durasi
- 1 bulan
- 3 bulan
- 6 bulan
- 12 bulan

---

# 🔷 9. CREDIT SYSTEM

## Penggunaan
- Generate teks
- Chat AI
- Analisis data
- Convert jurnal
- dan semua fitur AI yang ada

---

# 🔷 10. CREDIT EXPIRY

## Subscription Credit
- Berlaku 30 hari
- Reset tiap bulan

## Top-up Credit
- Berlaku 6 bulan

## Priority Usage
- Credit yang akan expired digunakan terlebih dahulu


# 🔷 11. TOP-UP SYSTEM

## Paket
- Menyusul

## Aturan
- Lebih mahal per credit dibanding subscription
- Membuka level pro ketika top up dalam jumlah tertentu


# 🔷 12. FEATURE ACCESS

## Free
- Fitur basic

## Pro / Plus
- Semua fitur terbuka

## Overkill Features (Non free Only)
- Convert jurnal
- Analisis data
- Chat dosen AI contextual
- Upload referensi
- Simulasi Sidang
- Humanizer
- AI Detector



# 🔷 13. UX DESIGN

Contoh:
## Indicator
⚡ 1200 Credit (500 expiring soon)

## Cost Preview
"Generate Bab 1 (25 credit)"

## Locked Feature
"Upgrade untuk bisa menikmati fitur ini"

---

# 🔷 14. ARCHITECTURE

## Stack
- Firebase (Hosting, Auth, Firestore)
- Cloudflare Workers (API Gateway)
- Gemini (AI Engine)

## Flow
Frontend → Worker → Gemini → Firestore

# 🔚 PENUTUP

Skripzy adalah:
AI Research Workspace yang menggabungkan:
- Editor
- AI Assistant
- Reference Manager
- Analisis data
- Sistem monetisasi fleksibel

