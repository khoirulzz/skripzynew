# 🔄 Migration Guide - LoadingSpinner → DefaultSpinner

## Side-by-Side Comparison

### Old LoadingSpinner ❌ → New DefaultSpinner ✅

| Aspect | Old (LoadingSpinner) | New (DefaultSpinner) |
|--------|---------------------|----------------------|
| **Import** | `@/components/ui/LoadingSpinner` | `@/components/ui/DefaultSpinner` |
| **Size Prop** | `size={48}` (pixel) | `size="large"` (preset) |
| **Custom Size** | Not easily possible | `sizePixel={custom}` |
| **Color** | Limited (via className) | `color="#hex"` |
| **Animation** | Basic dots | Smooth dual-layer |
| **Visual** | Plain | Premium with drop shadow |
| **Performance** | OK | Optimized |

---

## Migration Examples

### Example 1: Page Loading
#### Before ❌
```javascript
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function Page() {
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <LoadingSpinner size={32} className="text-primary" />
      </div>
    );
  }
}
```

#### After ✅
```javascript
import DefaultSpinner from "@/components/ui/DefaultSpinner";

export default function Page() {
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <DefaultSpinner size="large" />
      </div>
    );
  }
}
```

---

### Example 2: Button Loading
#### Before ❌
```javascript
<button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <LoadingSpinner size={18} className="text-white" />
      Memproses...
    </>
  ) : (
    "Submit"
  )}
</button>
```

#### After ✅
```javascript
<button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <DefaultSpinner size="small" color="white" />
      Memproses...
    </>
  ) : (
    "Submit"
  )}
</button>
```

---

### Example 3: Full Page (Auth Guard)
#### Before ❌
```javascript
if (loading) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ gap: '1rem' }}>
      <LoadingSpinner size={48} className="text-primary" />
      <p className="text-muted" style={{ fontWeight: 500 }}>Memuat sesi...</p>
    </div>
  );
}
```

#### After ✅
```javascript
if (loading) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ gap: '1rem' }}>
      <DefaultSpinner size="large" />
      <p className="text-muted" style={{ fontWeight: 500 }}>Memuat sesi...</p>
    </div>
  );
}
```

---

### Example 4: Input Field with Spinner
#### Before ❌
```javascript
{isSearching && (
  <div style={{...}}>
    <LoadingSpinner size={20} className="text-primary" />
  </div>
)}
```

#### After ✅
```javascript
{isSearching && (
  <div style={{...}}>
    <DefaultSpinner size="small" sizePixel={20} />
  </div>
)}
```

---

### Example 5: Modal with Status
#### Before ❌
```javascript
<div style={{ marginTop: "0.5rem", padding: "0.5rem", ... }}>
  <LoadingSpinner size={12} className="text-primary" />
  {status}
</div>
```

#### After ✅
```javascript
<div style={{ marginTop: "0.5rem", padding: "0.5rem", ... }}>
  <DefaultSpinner size="tiny" sizePixel={12} />
  {status}
</div>
```

---

## Size Mapping Table

Use this table untuk convert dari pixel size ke preset:

| Pixel Size | Recommended Preset | Fallback |
|-----------|-------------------|----------|
| 12-16px | `tiny` | `sizePixel={14}` |
| 18-20px | `tiny` | `sizePixel={20}` |
| 24-28px | `small` | `sizePixel={26}` |
| 30-36px | `small` | `sizePixel={32}` |
| 40-52px | `medium` | `sizePixel={48}` |
| 54-72px | `large` | `sizePixel={64}` |
| 80-120px | `xlarge` | `sizePixel={100}` |

---

## Find & Replace Patterns

### Pattern 1: Basic Import
```
FIND:    import LoadingSpinner from '@/components/ui/LoadingSpinner';
REPLACE: import DefaultSpinner from '@/components/ui/DefaultSpinner';
```

### Pattern 2: Component Usage
```
FIND:    <LoadingSpinner size={48}
REPLACE: <DefaultSpinner size="large"
```

```
FIND:    <LoadingSpinner size={32}
REPLACE: <DefaultSpinner size="small"
```

```
FIND:    <LoadingSpinner size={60}
REPLACE: <DefaultSpinner size="large"
```

---

## Step-by-Step Migration

### Step 1: Update Import (All Files)
```diff
- import LoadingSpinner from '@/components/ui/LoadingSpinner';
+ import DefaultSpinner from '@/components/ui/DefaultSpinner';
```

### Step 2: Map Pixel Sizes to Presets
```javascript
// Reference untuk conversion:
12-20px  → size="tiny"
24-36px  → size="small"
40-52px  → size="medium"
54-80px  → size="large"
100px+   → size="xlarge"
```

### Step 3: Replace Component Usage
```diff
- <LoadingSpinner size={NUMBER} className="text-primary" />
+ <DefaultSpinner size="PRESET" />
```

### Step 4: Update Colors if Needed
```diff
- className="text-white"
+ color="white"
```

### Step 5: Test
- [ ] Visual appearance correct
- [ ] Animation smooth
- [ ] Responsive on mobile
- [ ] Dark/light mode works

---

## Known Differences to Watch For

### 1. ClassName vs Color
**Old:** Used Tailwind classes for styling
```javascript
<LoadingSpinner className="text-white" />
```

**New:** Uses hex color directly
```javascript
<DefaultSpinner color="white" />
```

### 2. Size Units
**Old:** Pixel numbers (`size={48}`)
```javascript
<LoadingSpinner size={48} />
```

**New:** Named presets (`size="large"`)
```javascript
<DefaultSpinner size="large" />
```

### 3. Animation Quality
**New DefaultSpinner** memiliki:
- ✅ Smoother animation
- ✅ Drop shadow effect
- ✅ Better performance
- ✅ More professional look

---

## Backward Compatibility

❌ **LoadingSpinner akan di-deprecate** setelah semua files dimigrasi.

Untuk sementara, kedua component dapat berjalan bersamaan, tapi preferensinya ke DefaultSpinner.

---

## Troubleshooting Migration Issues

### Issue: Spinner too small/large
**Solution:** Adjust size preset atau gunakan `sizePixel={value}`

### Issue: Color not showing
**Solution:** Pastikan hex color valid (e.g., `#ffffff` bukan `"white"`)

### Issue: Animation not smooth
**Solution:** Bukan masalah component, check browser performance

### Issue: Old spinner masih muncul
**Solution:** Pastikan import sudah diubah ke DefaultSpinner

---

## Files Already Migrated ✅

- [x] `components/auth/AuthGuard.js`
- [x] `apps/app-main/app/page.js`
- [x] `apps/app-main/app/form/PublicFormPageClient.js`
- [x] `components/workspace/AnimatedLoadingScreen.js`

---

## Files Pending Migration 🔲

- [ ] `apps/app-main/app/dashboard/tools/simulasi-sidang/page.js`
- [ ] `apps/app-main/app/dashboard/tools/referensi/page.js`
- [ ] `apps/app-main/app/dashboard/tools/notebook/detail/NotebookDetail.js`
- [ ] `apps/app-main/app/dashboard/jurnal/page.js`
- [ ] `apps/app-main/app/dashboard/skripsi/page.js`

---

## Testing Checklist

- [ ] Spinner appears di semua loading states
- [ ] Animation smooth at 60fps
- [ ] Works di mobile view
- [ ] Dark mode compatible
- [ ] Colors accurate
- [ ] No console errors
- [ ] Performance not impacted

---

## References

- **New Component:** `components/ui/DefaultSpinner.js`
- **Demo Page:** `/demo-spinner`
- **Full Guide:** `DEFAULT_SPINNER_GUIDE.md`
- **Quick Reference:** `SPINNER_QUICK_REFERENCE.md`

---

**Status:** Ready for full migration 🚀
