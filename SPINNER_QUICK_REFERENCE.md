# 🎯 DefaultSpinner - Quick Reference Card

## Import
```javascript
import DefaultSpinner from '@/components/ui/DefaultSpinner';
```

---

## Size Presets

| Size | Pixels | Best For |
|------|--------|----------|
| `tiny` | 20px | Badges, inline |
| `small` | 32px | Buttons, inputs |
| `medium` | 48px | Modals, content ⭐ DEFAULT |
| `large` | 64px | Full page |
| `xlarge` | 100px | Splash screen |
| `sizePixel={X}` | Custom | Custom sizes |

---

## Most Common Uses

### 1️⃣ Page Loading
```javascript
<DefaultSpinner size="large" />
```

### 2️⃣ Button Loading
```javascript
<button>
  <DefaultSpinner size="small" color="white" />
  Loading...
</button>
```

### 3️⃣ Input Search
```javascript
{isSearching && (
  <DefaultSpinner size="small" />
)}
```

### 4️⃣ Modal Loading
```javascript
<DefaultSpinner size="medium" />
```

### 5️⃣ Inline Badge
```javascript
<div style={{ display: 'flex', gap: '0.5rem' }}>
  <DefaultSpinner size="tiny" />
  <span>Processing...</span>
</div>
```

---

## Props

```javascript
<DefaultSpinner
  size="large"              // tiny|small|medium|large|xlarge
  sizePixel={64}            // Custom pixel override
  color="#037ef3"           // Hex color
  className="mt-4"          // CSS classes
  style={{ opacity: 0.8 }}  // Inline styles
/>
```

---

## Color Shortcuts

```javascript
// Default Blue
<DefaultSpinner />

// Custom Colors
<DefaultSpinner color="#10b981" />   // Green
<DefaultSpinner color="#f59e0b" />   // Yellow
<DefaultSpinner color="#ef4444" />   // Red
<DefaultSpinner color="white" />     // White
```

---

## Page Context Examples

```javascript
// 📄 Full Page Loading
<div style={{ textAlign: 'center', padding: '3rem' }}>
  <DefaultSpinner size="large" />
</div>

// 🔘 Button with Loading
<button disabled={isLoading}>
  {isLoading ? (
    <> <DefaultSpinner size="small" color="white" /> Loading...</>
  ) : 'Submit'}
</button>

// 🔍 Search Input
<div style={{ position: 'relative' }}>
  <input disabled={isSearching} />
  {isSearching && (
    <div style={{ position: 'absolute', right: '1rem' }}>
      <DefaultSpinner size="small" />
    </div>
  )}
</div>

// 📦 Modal/Dialog
<div style={{ textAlign: 'center' }}>
  <DefaultSpinner size="medium" />
  <p>Processing...</p>
</div>

// ⚡ Inline Status
<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <DefaultSpinner size="tiny" />
  <span>Extracting...</span>
</div>
```

---

## DO ✅ & DON'T ❌

| DO ✅ | DON'T ❌ |
|------|---------|
| `<DefaultSpinner size="large" />` | `<DefaultSpinner sizePixel={64} />` |
| `color="white"` for buttons | Random colors |
| Consistent size per context | Different sizes per page |
| Check demo for reference | Guess the props |
| Use preset sizes | Always custom pixel |

---

## Color Reference

```
#037ef3  - Primary Blue (default)
#10b981  - Success Green
#f59e0b  - Warning Yellow/Amber
#ef4444  - Danger Red
#6366f1  - Indigo
#8b5cf6  - Purple
#ffffff  - White (for dark backgrounds)
```

---

## Size Reference by Context

```
🎯 Tiny (20px)
└─ Inline badges, status indicators

🎯 Small (32px)
└─ Button loaders, form field icons, search inputs

🎯 Medium (48px) ⭐
└─ Modal dialogs, normal content loading

🎯 Large (64px)
└─ Full page loading, main content areas

🎯 XLarge (100px)
└─ Splash screens, hero sections
```

---

## Debug Checklist

If spinner not showing:
- [ ] Is import correct? `@/components/ui/DefaultSpinner`
- [ ] Size prop set? Default is "medium"
- [ ] Color visible in background? (use `color="white"` for dark)
- [ ] Check browser console for errors
- [ ] Verify component renders (check React DevTools)

If animation not smooth:
- [ ] Check browser performance tab
- [ ] Disable browser extensions
- [ ] Clear browser cache
- [ ] Test in different browser

---

## Access Demo

**URL:** `/demo-spinner`

Shows:
✅ All 6 size variations
✅ 6+ real-world contexts
✅ 4 color variations
✅ Copy-paste code examples
✅ Best practices guide

---

## File Locations

- **Component:** `components/ui/DefaultSpinner.js`
- **Demo:** `apps/app-main/app/demo-spinner/page.js`
- **Guide:** `DEFAULT_SPINNER_GUIDE.md`
- **Summary:** `SPINNER_IMPLEMENTATION_SUMMARY.md`
- **Examples:** `SPINNER_IMPLEMENTATION_GUIDE.js`

---

**TL;DR:** Import → Use size="large" (or preset) → Done! 🎉

