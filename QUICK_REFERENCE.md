# 🎯 QUICK REFERENCE: Admin Panel & Credit Integration

## Current Status
- ✅ 10/10 Tools Integrated dengan Credit System
- ✅ Admin Payment System: 100% Operational
- ✅ Referensi Search: BARU Integrated (1 credit per search)
- ⚠️ Tool Pricing Admin UI: Masih Diperlukan

---

## 📍 Admin Panel Routes

```
/admin                 → Dashboard (stats overview)
/admin/pricing         → Edit plan prices (Free/Pro/Plus)
/admin/credits         → Approve/reject topup requests + edit credits
/admin/promos          → Create/manage promo codes
/admin/users           → View & edit all users
```

---

## 💳 Payment & Credit Flow

### 1. User Initiate Topup
```
User → Dashboard → Langganan → Pilih Package → Pilih Method → Submit
Status: PENDING
```

### 2. Admin Approve
```
Admin → /admin/credits → Find Request → Click Approve
Action: 
  - Status → APPROVED
  - User.credits += amount
  - If promo used → Promo.usedCount++
```

### 3. User Dapat Kredit
```
User: Lihat balance naik di Dashboard
User: Dapat pakai tools tanpa hambatan kredit
```

---

## 🔧 Tool Implementation Pattern

### All 10 Tools Use This Pattern:

```javascript
// 1. Import & Setup
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";

// 2. Get Config
const { toolMap } = useBillingCatalog();
const creditCost = toolMap["tool-slug"]?.creditCost ?? DEFAULT_COST;
const creditBalance = userData?.credits ?? 0;

// 3. Check & Deduct
if (creditBalance < creditCost) {
  setError("Kredit tidak cukup");
  return;
}

try {
  await deductCredits(user.uid, creditCost);
  // Call API...
} catch (err) {
  await refundCredits(user.uid, creditCost);
  setError(err.message);
}
```

### Tools Using This Pattern:
✅ Asisten AI (2 pages)
✅ Parafrase
✅ Cek Grammar
✅ Humanizer
✅ AI Detector
✅ Referensi Search ← NEW
✅ Simulasi Sidang
✅ Chat Dosen AI

---

## 📊 Credit Costs (Default)

| Tool | Cost | Price Range |
|------|------|-------------|
| Referensi Search | 1 | Can search 30-50x with Boost package |
| Chat Message | 1 | - |
| Parafrase | 2 | - |
| Cek Grammar | 2 | - |
| Asisten AI | 2-3 | Depending on task |
| Humanizer | 3 | - |
| AI Detector | 3 | - |
| Chat Voice | 3 | - |
| Simulasi Sidang | 5 | - |

---

## 💰 Topup Packages (Default)

| Package | Credits | Price | Bonus | Best For |
|---------|---------|-------|-------|----------|
| Starter | 50 | Rp 15k | - | Quick test |
| Boost | 120 | Rp 30k | +20 | Daily use ⭐ |
| Intense | 300 | Rp 60k | +60 | Heavy usage |

---

## 📋 Admin Actions Checklist

### ✅ Can Do Now

**Pricing**
- [ ] View current plan prices
- [ ] Edit plan prices (Free/Pro/Plus)
- [ ] See real-time updates

**Credits**
- [ ] View pending topup requests
- [ ] Approve topup → add credits
- [ ] Reject topup → with reason
- [ ] Edit user credits directly
- [ ] View topup statistics

**Promos**
- [ ] Create new promo code
- [ ] Set discount (% or fixed)
- [ ] Set expiry date & usage limit
- [ ] Toggle active/inactive
- [ ] Track promo usage

**Users**
- [ ] View all users
- [ ] Edit name, plan, credits, role
- [ ] Soft delete user
- [ ] View email & registration date

### ⚠️ Cannot Do (Need Implementation)

**Tool Pricing**
- [ ] Edit individual tool credit costs
- [ ] Add new tool types
- [ ] Track tool usage costs

**Audit Logging**
- [ ] See history of credit changes
- [ ] Track admin actions
- [ ] Compliance reports

**User Activity**
- [ ] See what tools user used
- [ ] Track credit spending history
- [ ] Usage analytics

---

## 🔄 Real-Time Updates

Components use Firestore listeners for live updates:

```
/admin/pricing      → subscribeToPricing
/admin/credits      → subscribeToTopups
/admin/promos       → subscribeToPromos
/admin/users        → subscribeToUsers
/admin              → subscribeToUserCount, subscribeToRequestCount
```

**Behavior**: Change made in Firebase → All admin screens update automatically

---

## 🆕 Referensi Search Integration (NEW)

### What Changed
```
Before: Search referensi → FREE (no credit cost)
After:  Search referensi → 1 CREDIT per search
```

### Implementation Location
```
File: components/workspace/ReferenceManager.js
Function: handleSearch()

Changes:
1. Added credit balance check
2. Deduct 1 credit before search
3. Refund if API fails
4. Show error if balance < 1
```

### User Experience
```
1. User search referensi
   └─ If balance < 1 → Error: "Kredit tidak cukup (dibutuhkan 1, tersisa X)"
   └─ If balance ≥ 1 → Search proceeds, -1 credit, show results

2. If search fails
   └─ Refund 1 credit automatically
   └─ Show API error message

3. Manual entry
   └─ Still FREE (by design)
   └─ Users can always add their own references
```

---

## 🧪 Quick Tests

### Test 1: Referensi Search
```javascript
// Setup: User with 0 credits
User.search("machine learning")
Expected: Error "Kredit tidak cukup"

// Setup: User with 5 credits
User.search("machine learning")  // -1, now 4
User.search("AI papers")        // -1, now 3
Expected: Each search deducts 1 credit
```

### Test 2: Payment Approval
```javascript
// Setup: Pending topup request for 120 credits
Admin.approve(request)
Expected: 
  - Request.status = "approved"
  - User.credits += 120
  - Dashboard updated in real-time
```

### Test 3: Promo Application
```javascript
// Setup: Promo "HEMAT50" = 50% discount
Package: 120 credits = Rp 30k
With promo: 120 credits = Rp 15k
Expected: Price halved when code applied
```

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Credit not deducting | User not logged in | Check `user` exists |
| Credit not deducting | Balance insufficient | Check `creditBalance >= cost` |
| Refund not working | API error before deduct | Refund won't happen (no deduct) |
| Pricing not updating | Listener not active | Refresh page, check Firestore |
| Admin can't approve | User not admin | Check `user.role = "admin"` |
| Promo not applying | Code inactive | Check `isPromoActive()` |

---

## 📞 Support Contacts

### For Issues:
- **Admin Panel**: Check Firestore rules & user role
- **Credit Deduction**: Check lib/credits.js & transaction logs
- **API Search**: Check referenceApis error handling
- **Firestore**: Check database rules & data structure

### Files to Check:
```
lib/billing.js              → Configuration
lib/credits.js              → Credit logic
lib/adminCredits.js         → Admin payment APIs
lib/useBillingCatalog.js   → Pricing from Firestore
components/workspace/
  ReferenceManager.js       → Referensi search implementation
```

---

## 📈 Metrics to Monitor

- Daily topup requests
- Credit deduction volume
- Promo code usage
- Tool usage breakdown
- User churn rate
- Payment success rate

---

## ✨ Summary

| Feature | Status | Priority |
|---------|--------|----------|
| Admin Payment | ✅ Complete | - |
| Admin Credits | ✅ Complete | - |
| Admin Pricing | ✅ Complete | - |
| Admin Promos | ✅ Complete | - |
| Admin Users | ✅ Complete | - |
| Tool Credit Integration | ✅ 10/10 | - |
| Tool Pricing UI | ❌ Missing | 🔥 HIGH |
| Audit Logging | ❌ Missing | ⚡ MEDIUM |
| Usage History | ❌ Missing | 📌 LOW |

---

Last Updated: 2026-04-30
Ready for: Testing & Go-Live Preparation

