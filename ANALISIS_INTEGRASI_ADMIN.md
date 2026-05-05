# Analisis Integrasi Admin Panel dengan User Features

## 📊 Status Integrasi Keseluruhan

### ✅ FITUR YANG SUDAH TERINTEGRASI PENUH

#### 1. **Payment & Topup Credits** (`/admin/credits`)
- ✅ Approve/Reject topup requests
- ✅ Edit user credits langsung
- ✅ Track payment statistics (pending, approved, rejected)
- ✅ Real-time listeners untuk payment requests
- **Integration**: `lib/adminCredits.js` → `deductCredits()` & credit system
- **User Impact**: Direktly mempengaruhi user `credits` field di Firestore

#### 2. **Plan Management & Pricing** (`/admin/pricing`)
- ✅ Edit harga 3 plans (Free, Pro, Plus) - **LOCKED** (tidak bisa ditambah/kurang)
- ✅ Harga bulanan dapat disesuaikan
- ✅ Real-time listener untuk perubahan pricing
- **Plans Default**: 
  - Free: Rp 0
  - Pro: Rp 49.000
  - Plus: Rp 99.000
- **Integration**: `lib/adminPricing.js` → Firestore `pricing` collection
- **User Impact**: Mempengaruhi harga plan saat user checkout

#### 3. **Promo Management** (`/admin/promos`)
- ✅ Create/Edit/Delete promo codes
- ✅ 2 tipe diskon: Percent & Fixed Amount
- ✅ Usage limits dan validity date
- ✅ Toggle promo active/inactive
- **Integration**: `lib/adminPromos.js` → Firestore `promos` collection
- **User Impact**: Promo digunakan saat topup via form, mengurangi harga

#### 4. **User Management** (`/admin/users`)
- ✅ View all users
- ✅ Edit user info: nama, plan, credits, role (user/admin)
- ✅ Delete user (soft delete)
- **Integration**: `lib/adminUsers.js` → Firestore `users` collection
- **User Impact**: Direct modification ke user data

#### 5. **Admin Dashboard** (`/admin`)
- ✅ Total users count (real-time)
- ✅ Total requests count (real-time)
- ✅ Tools usage breakdown
- ✅ Request status distribution
- **Integration**: `lib/adminStats.js` → aggregates dari `requests` collection

---

## 🔴 FITUR YANG BELUM/TIDAK TERINTEGRASI PENUH

### 1. **Referensi Manager** ⚠️
**Status**: TIDAK terintegrasi dengan credit system

**File**: `components/workspace/ReferenceManager.js`

**Masalah**:
- ❌ Search referensi (searchPapersWithFallback) tidak men-deduct credits
- ❌ Import referensi tidak men-deduct credits
- ❌ Tidak ada pengecekan credit balance
- ❌ Tidak ada refund logic jika gagal

**Di Pricing**: 
```javascript
{
  slug: "referensi-ringkas",
  title: "Referensi Cerdas - Ringkasan",
  creditCost: 1,
}
```

**Yang Diperlukan**:
- Implementasi `deductCredits()` saat search referensi
- Implementasi `deductCredits()` saat import referensi
- Pengecekan credit balance sebelum action
- Error handling & refund jika gagal

### 2. **Tools di Workspace** ⚠️
**Status**: Sudah terintegrasi, tapi ada beberapa variations

#### ChapterAiAssistant.js
- ✅ Menggunakan `deductCredits()` dengan hardcoded cost
- ✅ Ada refund logic
- ⚠️ Cost tidak menggunakan `useBillingCatalog()`

#### JurnalChapterAiAssistant.js
- ✅ Menggunakan `deductCredits()` dengan hardcoded cost
- ✅ Ada refund logic
- ⚠️ Cost tidak menggunakan `useBillingCatalog()`

---

## 📋 CREDIT COST BREAKDOWN (DEFAULT)

| Tool/Fitur | Slug | Cost | Status |
|---|---|---|---|
| Asisten AI - Judul | `asisten-ai-judul` | 2 | ✅ Integrated |
| Asisten AI - Latar Belakang | `asisten-ai-latar-belakang` | 3 | ✅ Integrated |
| Parafrase | `parafrase` | 2 | ✅ Integrated |
| Cek Grammar | `cek-grammar` | 2 | ✅ Integrated |
| Humanizer | `humanizer` | 3 | ✅ Integrated |
| AI Detector | `ai-detector` | 3 | ✅ Integrated |
| Referensi Cerdas | `referensi-ringkas` | 1 | ❌ NOT Integrated |
| Simulasi Sidang | `simulasi-sidang` | 5 | ✅ Integrated |
| Chat Dosen AI - Pesan | `chat-message` | 1 | ✅ Integrated |
| Chat Dosen AI - Voice Call | `chat-call-start` | 3 | ✅ Integrated |

---

## 🏗️ IMPLEMENTASI COST PATTERNS

### Pattern 1: Menggunakan useBillingCatalog (RECOMMENDED)
```javascript
const { toolMap } = useBillingCatalog();
const creditCost = toolMap["asisten-ai-judul"]?.creditCost ?? COST_JUDUL;
```
**Tools yang menggunakan**: Asisten AI, Parafrase, Cek Grammar, Humanizer, AI Detector, Simulasi Sidang, Chat Dosen AI

### Pattern 2: Hardcoded Cost (NOT RECOMMENDED)
```javascript
const DEFAULT_COST = 3; // hardcoded
const creditCost = toolMap["humanizer"]?.creditCost ?? CREDIT_COST; // fallback ok tapi direct usage tidak
```
**Tools yang menggunakan**: ChapterAiAssistant, JurnalChapterAiAssistant

### Pattern 3: NOT IMPLEMENTED
```javascript
// Tidak ada deductCredits() call sama sekali
// ReferenceManager, Notebook tools
```

---

## ✨ SETUP PRICING VIA ADMIN PANEL

### How to Add/Modify Tool Pricing

**Step 1**: Go to Admin → Pricing
**Step 2**: Anda akan melihat list pricing untuk plans (Free, Pro, Plus)
**Step 3**: Hanya bisa edit harga bulanan, slot plan terkunci pada 3 (Free/Pro/Plus)

**Note**: Current admin UI HANYA untuk edit PLAN pricing, bukan individual tool pricing.
Untuk mengedit individual tool pricing (credit cost per tool), diperlukan:
- Direct Firestore edit di `pricing` collection
- Atau buat admin UI baru untuk tool pricing management
- Atau modifikasi pricing yang ada di `DEFAULT_TOOL_PRICING` di `lib/billing.js`

---

## 🎯 REKOMENDASI ACTION ITEMS

### Priority 1 (CRITICAL)
1. **Implement Referensi Manager Credit Integration**
   - Add `deductCredits()` call saat search
   - Add `deductCredits()` call saat import
   - Add credit balance check sebelum action
   - Add refund logic jika API gagal

### Priority 2 (IMPORTANT)
2. **Create Admin UI untuk Tool Pricing Management**
   - Buat halaman `/admin/tools-pricing` untuk manage credit cost per tool
   - Ability to add/edit/delete tool pricing
   - Fallback ke DEFAULT_TOOL_PRICING jika tidak ada di Firestore

### Priority 3 (NICE TO HAVE)
3. **Standardize Cost Implementation**
   - Update ChapterAiAssistant & JurnalChapterAiAssistant untuk gunakan `useBillingCatalog()`
   - Ensure semua tools gunakan pattern yang sama

4. **Add Audit Logging**
   - Track semua credit deductions dengan timestamp
   - Track admin actions (edit credits, approve topup, etc)
   - Untuk compliance & debugging

---

## 🔍 TOOLS BELUM ADA IMPLEMENTASI

### 1. **Notebook Tools**
- Path: `app/dashboard/tools/notebook/`
- Status: Folder ada, tapi PAGE.JS tidak ada
- Action: Tentukan apakah fitur ini masih akan diimplementasi atau remove

### 2. **Parafrase Tools**
- Path: `app/dashboard/tools/parafrase/`
- Status: Folder ada, tapi PAGE.JS tidak ada
- Note: Ada di `app/dashboard/tools/parafrase/page.js` sudah terintegrasi
- Action: Verify jika ada duplikat atau intentional

### 3. **Referensi Tools**
- Path: `app/dashboard/tools/referensi/`
- Status: Folder ada, tapi PAGE.JS tidak ada
- Note: Ada via ReferenceManager component, tapi bukan standalone page
- Action: Consider jika ingin buat standalone page untuk referensi search

---

## 📈 BILLING FLOW SUMMARY

```
User Request Tool
    ↓
Check Credit Balance (lib/credits.js)
    ↓
Deduct Credit (runTransaction)
    ↓
Call API/Gemini
    ↓
Success? 
    ├─ YES → Keep deduction, return result
    └─ NO → Refund Credit, throw error
```

**All deductions** menggunakan Firestore transaction untuk avoid race condition.

---

## 🔗 RELATED FILES

- `lib/billing.js` - DEFAULT_TOOL_PRICING, plans metadata
- `lib/useBillingCatalog.js` - Hook untuk fetch tool pricing from Firestore
- `lib/credits.js` - deductCredits, refundCredits logic
- `lib/adminCredits.js` - Admin credit management
- `lib/adminPricing.js` - Admin pricing CRUD
- `lib/adminPromos.js` - Admin promo management
- `lib/adminUsers.js` - Admin user management
- `lib/adminStats.js` - Dashboard statistics

