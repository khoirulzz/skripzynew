# Implementation Status: Referensi Manager Credit Integration

## ✅ IMPLEMENTED

### Changes Made to `components/workspace/ReferenceManager.js`

**1. Added Imports**
```javascript
import { deductCredits, refundCredits } from "@/lib/credits";
import { useBillingCatalog } from "@/lib/useBillingCatalog";
```

**2. Added Hooks & Config**
```javascript
const { user, userData } = useAuth(); // Extracted userData
const { toolMap } = useBillingCatalog();
const REFERENCE_SEARCH_COST = toolMap["referensi-ringkas"]?.creditCost ?? 1;
const creditBalance = userData?.credits ?? 0;
```

**3. Modified `handleSearch()` Function**
- Added user authentication check
- Added credit balance validation before search
- Implemented `deductCredits()` call before API call
- Implemented refund logic if search fails
- Enhanced error messages with credit info

**Before:**
```javascript
const handleSearch = async (event) => {
  event.preventDefault();
  if (!searchTerm.trim()) return;
  setSearching(true);
  setError("");

  try {
    const result = await searchPapersWithFallback(searchTerm, { limit: 8, yearRange });
    setSearchResults(result.papers || []);
  } catch (searchError) {
    console.error(searchError);
    setError(getErrorMessage(searchError));
  } finally {
    setSearching(false);
  }
};
```

**After:**
```javascript
const handleSearch = async (event) => {
  event.preventDefault();
  if (!searchTerm.trim()) return;
  
  // Check credit balance before search
  if (!user) {
    setError("Silakan login untuk mencari referensi.");
    return;
  }
  if (creditBalance < REFERENCE_SEARCH_COST) {
    setError(`Kredit tidak cukup. Dibutuhkan ${REFERENCE_SEARCH_COST} kredit, tersisa ${creditBalance}.`);
    return;
  }

  setSearching(true);
  setError("");

  try {
    // Deduct credits for search
    await deductCredits(user.uid, REFERENCE_SEARCH_COST);

    const result = await searchPapersWithFallback(searchTerm, { limit: 8, yearRange });
    setSearchResults(result.papers || []);
  } catch (searchError) {
    // Refund credits if search fails
    if (user) {
      await refundCredits(user.uid, REFERENCE_SEARCH_COST).catch(() => {});
    }
    console.error(searchError);
    setError(getErrorMessage(searchError));
  } finally {
    setSearching(false);
  }
};
```

---

## 📊 Updated Integration Status

| Feature | Integrated | Method |
|---------|-----------|--------|
| Asisten AI (Judul) | ✅ | useBillingCatalog + deductCredits |
| Asisten AI (Latar Belakang) | ✅ | useBillingCatalog + deductCredits |
| Parafrase | ✅ | useBillingCatalog + deductCredits |
| Cek Grammar | ✅ | useBillingCatalog + deductCredits |
| Humanizer | ✅ | useBillingCatalog + deductCredits |
| AI Detector | ✅ | useBillingCatalog + deductCredits |
| **Referensi Search** | ✅ NEW | useBillingCatalog + deductCredits |
| Simulasi Sidang | ✅ | useBillingCatalog + deductCredits |
| Chat Dosen AI (Msg) | ✅ | useBillingCatalog + deductCredits |
| Chat Dosen AI (Call) | ✅ | useBillingCatalog + deductCredits |

---

## 🎯 Next Priority Items

### Priority 1 - READY TO IMPLEMENT
1. **Admin UI for Tool Pricing Management**
   - Create new page: `/admin/tools-pricing`
   - CRUD operations for tool credit costs
   - Fallback to DEFAULT_TOOL_PRICING from lib/billing.js

### Priority 2 - STANDARDIZATION
2. **Update ChapterAiAssistant Components**
   - Replace hardcoded costs with useBillingCatalog
   - Ensure consistency across all tools

3. **Implement Audit Logging**
   - Track all credit deductions
   - Track admin actions
   - For compliance & debugging

### Priority 3 - DISCOVERY
4. **Implement Missing Tools**
   - Verify Notebook tool implementation
   - Standalone Referensi page (optional)
   - Parafrase tools (verify duplicate?)

---

## 🧪 Testing Checklist

### Referensi Search Feature
- [ ] User with 0 credits cannot search
- [ ] Error message shows required vs available credits
- [ ] Credit is deducted after successful search
- [ ] Credit is refunded if API fails
- [ ] Search results display correctly
- [ ] Multiple searches deduct appropriately
- [ ] Manual reference entry (free) still works without credit check

### Admin Panel
- [ ] Can view all users and their credit balance
- [ ] Can edit user credits directly
- [ ] Can approve/reject topup requests
- [ ] Can manage plan pricing
- [ ] Can manage promo codes
- [ ] Dashboard stats update in real-time

---

## 📝 Notes

### Important: Referensi Manual Entry
- Manual reference entry (not via search) does NOT use credits
- This is by design - users can always add their own references
- Only API searches through referensi-ringkas consume credits

### Fallback Behavior
- If `toolMap["referensi-ringkas"]` not found: defaults to 1 credit
- Graceful degradation if Firestore pricing data unavailable

### Firestore Transaction Safety
- All credit deductions use Firestore transactions
- Prevents race conditions if user makes simultaneous requests
- Rollback happens automatically if transaction fails

