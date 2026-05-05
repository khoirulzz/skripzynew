# Admin Panel Integration Verification Checklist

## 🔍 Quick Verification Guide

### Admin Panel Features Checklist

#### ✅ Pricing Management (`/admin/pricing`)
- [x] View current plan pricing (Free/Pro/Plus)
- [x] Edit plan prices in database
- [x] Real-time updates from Firestore
- [x] Plans locked to 3 slots (cannot add/remove)
- **Status**: Fully operational
- **Limitations**: Only edit plan prices, not individual tool costs

#### ✅ Credits Management (`/admin/credits`)
- [x] View pending topup requests
- [x] Approve topup → add credits to user
- [x] Reject topup with reason
- [x] Edit user credits directly
- [x] Track topup statistics
- [x] Real-time listener for requests
- **Status**: Fully operational
- **Integration**: Direct updates to `users.credits` field

#### ✅ Promo Management (`/admin/promos`)
- [x] Create promo codes (percent or fixed amount discount)
- [x] Set promo validity & usage limits
- [x] Toggle active/inactive
- [x] Edit existing promos
- [x] Delete promos
- **Status**: Fully operational
- **Usage**: Applied during topup checkout

#### ✅ Users Management (`/admin/users`)
- [x] List all users with credentials
- [x] Edit user name, plan, credits, role
- [x] Soft delete users
- [x] View user email
- **Status**: Fully operational
- **Caution**: Direct edit of credits (audit trail recommended)

#### ✅ Dashboard (`/admin`)
- [x] Total users (real-time)
- [x] Total requests
- [x] Tools usage breakdown
- [x] Request status distribution
- **Status**: Fully operational

---

## 🎯 Tool Credit Integration Status

### Currently Integrated (deductCredits implemented)

```
✅ Asisten AI - Generator Judul (2 credits)
✅ Asisten AI - Latar Belakang (3 credits)
✅ Parafrase (2 credits)
✅ Cek Grammar (2 credits)
✅ Humanizer (3 credits)
✅ AI Detector (3 credits)
✅ Referensi Ringkas / Search (1 credit) ← NEW IMPLEMENTATION
✅ Simulasi Sidang (5 credits)
✅ Chat Dosen AI - Pesan (1 credit)
✅ Chat Dosen AI - Voice Call (3 credits)
```

### NOT Yet Available in Admin UI

**Individual Tool Pricing Adjustment**
- Cannot edit tool credit costs from admin panel
- Must edit directly in:
  - `lib/billing.js` → `DEFAULT_TOOL_PRICING`
  - Or create Firestore entry in `pricing` collection

**Example DEFAULT_TOOL_PRICING Entry:**
```javascript
{
  slug: "asisten-ai-judul",
  title: "Asisten AI - Generator Judul",
  shortTitle: "Asisten AI",
  creditCost: 2,
}
```

---

## 🚀 Testing User Workflow

### Test Scenario 1: Referensi Search (NEW)
1. User: Login to dashboard
2. User: Go to Skripsi editor → Referensi tab
3. User: Search for "machine learning"
4. **Expected**: 
   - ❌ "Kredit tidak cukup" if balance < 1
   - ✅ Show search results if balance ≥ 1
   - ✅ Credit balance decreased by 1
5. Verify in Admin:
   - Check user credits decreased in `/admin/users`

### Test Scenario 2: Payment & Topup
1. User: Go to Dashboard → Langganan
2. User: Click "Topup Kredit" → Select package (e.g., 120 credits = Rp 30.000)
3. User: Choose payment method (Manual only - active)
4. User: Submit topup request → Status "Pending"
5. Admin: Go to `/admin/credits` → Find request
6. Admin: Click "Approve" → Confirm
7. **Expected**: User credits increased, status changed to "Approved"
8. **Verify**: User can now search referensi again

### Test Scenario 3: Plan Upgrade
1. Admin: Go to `/admin/pricing`
2. Admin: Edit Pro Plan → Change price to Rp 59.000
3. User: Open browser (F5 refresh)
4. User: Go to Langganan → Check Pro price = Rp 59.000
5. **Expected**: Changes appear in real-time

### Test Scenario 4: Promo Code
1. Admin: Go to `/admin/promos` → Create new
2. Admin: 
   - Code: "HEMAT50"
   - Type: Percent
   - Discount: 50%
   - Valid Until: Today + 7 days
3. User: Go to Langganan → Topup → Enter code "HEMAT50"
4. **Expected**: Price reduced by 50%

### Test Scenario 5: Direct Credits Edit
1. Admin: Go to `/admin/users`
2. Admin: Find user → Click edit
3. Admin: Change credits from 50 → 100
4. Admin: Save
5. User: Dashboard should show credits = 100 (refresh page)

---

## ⚠️ Known Limitations

### 1. No Individual Tool Pricing UI
**Problem**: Cannot adjust individual tool credit costs from admin panel
**Current Workaround**: 
- Edit `lib/billing.js` manually
- Or insert directly to Firestore `pricing` collection

**Solution Needed**: Create `/admin/tools-pricing` page
```
Features:
- List all tools from DEFAULT_TOOL_PRICING
- CRUD for tool pricing
- Real-time fallback from Firestore
```

### 2. No Audit Trail for Direct Credit Edits
**Problem**: No log when admin edits credits directly
**Impact**: Cannot track if abuse occurs
**Solution**: Add audit logging to `adminCredits.js`

### 3. ReferenceManager Manual Entry Still Free
**Status**: Working as designed
**Behavior**: Manual reference entry does NOT deduct credits
**Rationale**: Users should always be able to add their own references

### 4. No Credit Spend History
**Problem**: Users cannot see where credits were used
**Solution**: Add activity log in dashboard

---

## 🔧 Configuration Files

### Where to Change Defaults

**1. Tool Credit Costs:**
📁 `lib/billing.js` → `DEFAULT_TOOL_PRICING`

**2. Plan Info:**
📁 `lib/billing.js` → `PLAN_METADATA`

**3. Topup Packages:**
📁 `lib/billing.js` → `DEFAULT_TOPUP_PACKAGES`

**4. Payment Methods:**
📁 `lib/billing.js` → `PAYMENT_METHODS`, `MANUAL_PAYMENT_CHANNELS`

---

## 📚 Related Documentation Files

- **ANALISIS_INTEGRASI_ADMIN.md** - Complete integration analysis
- **IMPLEMENTATION_STATUS.md** - Implementation details with code diffs
- **lib/billing.js** - Core billing configuration
- **lib/credits.js** - Credit deduction logic
- **lib/adminCredits.js** - Admin credit APIs
- **lib/adminPricing.js** - Admin pricing APIs
- **lib/adminPromos.js** - Admin promo APIs
- **lib/adminUsers.js** - Admin user APIs

---

## 🎓 Developer Notes

### How Credit System Works

```
Flow Diagram:
User Action → Check Balance → Deduct Credit → Call API → Success?
                                                            ├─ YES → Done
                                                            └─ NO → Refund
```

### Transaction Safety
```javascript
// Using Firestore transactions for race condition protection
runTransaction(db, async (transaction) => {
  const snap = await transaction.get(userRef);
  const current = snap.data().credits ?? 0;
  
  if (current < amount) throw Error("Tidak cukup");
  
  transaction.update(userRef, { 
    credits: current - amount 
  });
});
```

### Billing Catalog System
```javascript
// Fetch from Firestore, fallback to defaults
const { toolMap } = useBillingCatalog();
const cost = toolMap["tool-slug"]?.creditCost ?? DEFAULT_COST;
```

---

## ✋ Before Going Live

### Checklist

- [ ] Test all user workflows (5 scenarios above)
- [ ] Test admin panel all features
- [ ] Verify credit deductions in Firestore
- [ ] Test refund logic (simulate API failure)
- [ ] Test promo code application
- [ ] Test manual payment workflow
- [ ] Verify topup request approval process
- [ ] Check real-time updates (pricing, promos)
- [ ] Load test with multiple simultaneous requests
- [ ] Document payment reconciliation process
- [ ] Set up audit logging
- [ ] Backup Firestore data

---

## 🐛 Troubleshooting

### Issue: Credit not deducting
**Check**:
- User logged in? (`user` exists)
- Balance ≥ required cost?
- Firestore transaction succeeded?
- Browser console for errors

### Issue: Search results not showing
**Check**:
- Credit was deducted?
- API response valid?
- Network tab for API errors

### Issue: Admin can't edit pricing
**Check**:
- User role = "admin"? 
- Firestore rules allow write to `pricing`?
- Real-time listener active?

