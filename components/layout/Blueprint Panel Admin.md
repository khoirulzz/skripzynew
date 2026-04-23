Panel Admin
Analyze project structure and key files for admin panel planning

Read [](file:///d%3A/Projek/Skripzy2/package.json)

Read [](file:///d%3A/Projek/Skripzy2/lib/firebase.js)

Read [](file:///d%3A/Projek/Skripzy2/firestore.rules)

Read [](file:///d%3A/Projek/Skripzy2/skripzy_blueprint_final.md#1-1), lines 1 to 200

Read [](file:///d%3A/Projek/Skripzy2/components/providers/AuthProvider.js)

Read [](file:///d%3A/Projek/Skripzy2/lib/credits.js)

Read [](file:///d%3A/Projek/Skripzy2/components/auth/AuthGuard.js)

Search complete: Find data models

Searched codebase for "Firestore collections data models users credits workspaces tool usage", no results

Searched codebase for "user document structure credit points workspace membership tool invocation history", no results

Searched for files matching `**/*firestore*.{js,ts,js,ts,py,java,go,php}`, no matches

Searched for text `Firestore`, 38 results

Searched for regex `users|credits|workspaces|tool.*usage|usage.*log`, 121 results

Searched for files matching `**/model*.{js,ts,py,java,go,php}`, no matches

Searched for files matching `**/schema*.{js,ts,py,java,go,php,yml,yaml,json}`, no matches

Searched for regex `collection.*name|Firestore.*collection|getFirestore|firestore.*init`, 3 results

Searched for files matching `**/*db*.{js,ts,py,java,go,php}`, no matches

Searched for regex `addDoc|setDoc|doc.*users|collection.*"users"`, 12 results

Searched for regex `collection\(|doc\(|getDoc|getDocs|setDoc|updateDoc`, 30 results

Read [](file:///d%3A/Projek/Skripzy2/app/api)

Read [](file:///d%3A/Projek/Skripzy2/lib/callWorker.js#1-1), lines 1 to 100

Read [](file:///d%3A/Projek/Skripzy2/app/dashboard/tools)

Read [](file:///d%3A/Projek/Skripzy2/app/%28auth%29/register/page.js#1-1), lines 1 to 80

Read [](file:///d%3A/Projek/Skripzy2/app/dashboard/langganan/page.js#1-1), lines 1 to 100

Read [](file:///d%3A/Projek/Skripzy2/app/dashboard/tools/parafrase/page.js#1-1), lines 1 to 100

Read [](file:///d%3A/Projek/Skripzy2/app/dashboard/page.js#1-1), lines 1 to 80

Read [](file:///d%3A/Projek/Skripzy2/app/dashboard/skripsi/page.js#1-1), lines 1 to 100

Searched for text `system_stats admin role`, no results

Read [](file:///d%3A/Projek/Skripzy2/components/workspace/WorkspaceModal.js#1-1), lines 1 to 80

Read [](file:///d%3A/Projek/Skripzy2/components/workspace/ReferenceManager.js#1-1), lines 1 to 150

Read [](file:///d%3A/Projek/Skripzy2/next.config.mjs)

Read [](file:///d%3A/Projek/Skripzy2/firebase.json)

Berdasarkan analisis mendalam terhadap proyek ini (sebuah aplikasi web Next.js dengan Firebase sebagai backend), saya telah memahami arsitektur, teknologi, dan alur data yang ada. Berikut adalah ringkasan analisis proyek, diikuti dengan planning dan fase implementasi panel admin yang Anda minta. Panel admin ini akan fokus pada role "admin" dengan fitur-fitur yang disebutkan, sambil memanfaatkan infrastruktur Firebase yang sudah ada (Firestore untuk data, Auth untuk autentikasi).

### Analisis Proyek
**Tech Stack Utama:**
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS untuk styling, Tiptap untuk editor teks.
- **Backend:** Firebase (Auth untuk login/register, Firestore untuk database NoSQL, Storage untuk file jika diperlukan).
- **Fitur Utama Aplikasi:** Platform untuk mahasiswa skripsi dengan tools AI (parafrase, grammar check, AI detector, humanizer, referensi, simulasi sidang, dll.). Penggunaan tools memakan kredit, dengan sistem plan (free, pro, plus).
- **Autentikasi:** Firebase Auth dengan AuthProvider (context React) dan AuthGuard untuk proteksi route. Tidak ada role admin eksplisit saat ini—hanya user biasa.
- **Data Models (di Firestore):**
  - **Users:** Koleksi `users` dengan fields seperti `email`, `plan` (free/pro/plus), `credits` (saldo kredit), `createdAt`, dll. Credits dikurangi saat menggunakan tools.
  - **Credits/Top-up:** Sistem kredit dengan fungsi di credits.js (cek saldo, kurangi kredit). Top-up mungkin dicatat sebagai transaksi (approve/reject belum ada).
  - **Tool Requests:** Penggunaan tools dicatat (misalnya di koleksi `requests` atau `usage`), dengan statistik seperti jumlah request per tools. Tidak ada grafik eksplisit, tapi data bisa di-query dari Firestore.
  - **Pricing:** Harga kredit per tools dan plan/top-up belum terstruktur—mungkin hardcoded atau perlu koleksi baru seperti `pricing`.
  - **Promo:** Belum ada sistem promo/kode diskon.
- **Alur Data:**
  - User login → Akses dashboard/tools → Gunakan tools (kurangi kredit via `credits.js`) → Data disimpan di Firestore.
  - Tidak ada admin panel saat ini; semua fitur user-facing.
- **Kekuatan Proyek:** Modular (komponen terpisah), scalable dengan Firebase. Kekurangan: Tidak ada role admin, data analytics terbatas, tidak ada manajemen transaksi/top-up.
- **Risiko:** Firestore rules perlu diperbarui untuk akses admin. Pastikan security (misalnya, admin hanya bisa edit data tertentu).

### Planning Panel Admin
Panel admin akan dibangun sebagai ekstensi dari dashboard user yang ada, dengan route terpisah (misalnya `/admin/dashboard`). Menggunakan role-based access: Tambahkan field `role: 'admin'` di Firestore untuk user admin. Komponen akan menggunakan UI yang sama (Tailwind) dan Firebase untuk CRUD operations.

**Fitur Utama Panel Admin:**
1. **Dashboard:** Statistik real-time (jumlah user, request global, grafik penggunaan tools via Chart.js atau library serupa).
2. **Manajemen Kredit:** List top-up pending (approve/reject), edit kredit user.
3. **Manajemen User:** CRUD user (view/edit/delete), ubah kredit/plan.
4. **Manajemen Harga:** tambahkan, Edit, hapus harga kredit per tools dan plan/top-up (simpan di Firestore koleksi `pricing`).
5. **Manajemen Promo:** Buat/edit/hapus kode diskon (koleksi `promos` di Firestore).

**Teknologi Tambahan yang Perlu:**
- **Charts:** Library seperti `recharts` atau `chart.js` untuk grafik.
- **Forms:** React Hook Form untuk form edit.
- **Security:** Update Firestore rules untuk admin-only access.
- **UI:** Reuse komponen seperti Sidebar, Header, tapi tambahkan nav admin.

**Estimasi Waktu:** 2-4 minggu tergantung kompleksitas, dengan testing Firebase.

### Fase Implementasi
Saya bagi menjadi 6 fase bertahap untuk meminimalkan risiko dan memungkinkan testing incremental. Setiap fase fokus pada satu modul utama, dengan validasi via build/test.

1. **Phase 1: Setup Dasar Panel Admin (1-2 hari)**
   - **Tujuan:** Buat struktur routing dan autentikasi admin.
   - **Tugas:**
     - Tambahkan field `role: 'admin'` di Firestore untuk user tertentu (manual via Firebase Console atau script).
     - Update AuthProvider untuk cek role admin.
     - Buat route `/admin` dengan layout admin (reuse Sidebar/Header, tambahkan nav menu admin).
     - Update Firestore rules: Admin bisa read/write semua koleksi; user biasa hanya miliknya.
     - Buat komponen dasar: AdminGuard (mirip AuthGuard tapi cek role).
   - **Validasi:** Login sebagai admin, akses route `/admin` berhasil. Build tanpa error.

2. **Phase 2: Dashboard Admin (2-3 hari)**
   - **Tujuan:** Tampilkan statistik dan grafik.
   - **Tugas:**
     - Query Firestore: Jumlah user (`users` collection), jumlah request global (sum dari `requests` atau `usage`), grafik penggunaan tools (group by tool type).
     - Buat komponen DashboardAdmin: Cards untuk statistik, chart untuk grafik (gunakan recharts).
     - Integrasi real-time via Firebase listeners.
   - **Validasi:** Data akurat, grafik render. Test dengan data dummy jika perlu.

3. **Phase 3: Manajemen Kredit (2-3 hari)**
   - **Tujuan:** Kelola top-up dan kredit user.
   - **Tugas:**
     - Buat koleksi Firestore `topups` (fields: userId, amount, status: pending/approved/rejected, timestamp).
     - Komponen CreditManagement: List top-up pending dengan tombol approve/reject (update status).
     - Fungsi edit kredit user langsung (update field `credits` di `users`).
     - Reuse `credits.js` untuk logika.
   - **Validasi:** Approve/reject update status. Test transaksi kredit.

4. **Phase 4: Manajemen User (2-3 hari)**
   - **Tujuan:** CRUD user dan edit atribut.
   - **Tugas:**
     - Komponen UserManagement: Table list users (dari `users` collection).
     - Fungsi: View detail, edit (email, plan, credits), delete user.
     - Form edit dengan validasi (gunakan React Hook Form).
     - Integrasi dengan Firebase Auth untuk delete user.
   - **Validasi:** Edit/delete berhasil, data sync dengan Firestore.

5. **Phase 5: Manajemen Harga (1-2 hari)**
   - **Tujuan:** tambah, hapus dan Edit harga dinamis. nanti berbentuk card sesuai desain harga kredit dan plan
   - **Tugas:**
     - Buat koleksi Firestore `pricing` (fields: toolName, creditCost, planPrices: {free:0, pro:100, plus:200}, topupPrices).
     - Komponen PricingManagement: Form edit harga per tools dan plan/top-up.
     - Update logika di `credits.js` untuk baca harga dari Firestore (bukan hardcoded).
   - **Validasi:** Harga update, penggunaan tools pakai harga baru.

6. **Phase 6: Manajemen Promo (1-2 hari)**
   - **Tujuan:** Buat kode diskon dan 
   - **Tugas:**
     - Koleksi Firestore `promos` (fields: code, discountPercent, validUntil, usageLimit).
     - Komponen PromoManagement: Form buat/edit/hapus promo.
     - Integrasi dengan sistem kredit/top-up (diskon saat top-up).
   - **Validasi:** Kode diskon apply saat top-up. Test edge cases (expired, limit).

**Post-Implementation:** Testing end-to-end, update README, deploy. Jika perlu, tambahkan logging untuk audit admin actions.

Apakah Anda setuju dengan planning ini? Ingin saya mulai implementasi dari Phase 1, atau ada penyesuaian? Misalnya, detail lebih lanjut pada data models atau library spesifik?