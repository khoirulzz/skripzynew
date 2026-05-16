import DefaultSpinner from '@/components/ui/DefaultSpinner';

/**
 * IMPLEMENTASI SPINNER DEFAULT SKRIPZY
 * 
 * File ini berisi update untuk mengintegrasikan DefaultSpinner
 * ke dalam komponen-komponen utama aplikasi.
 */

// ============================================
// 1. ANIMATED LOADING SCREEN (Updated)
// ============================================
export function ExampleAnimatedLoadingScreen() {
  return (
    <div className="animated-loading-overlay">
      <div className="loading-container glass-panel">
        <div className="spinner-wrapper">
          <DefaultSpinner size="large" color="#037ef3" />
        </div>
        <div className="label-container">
          <h3 className="loading-label">sedang mencari topik penelitian relevan...</h3>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 2. AUTH GUARD LOADING (Updated)
// ============================================
export function ExampleAuthGuardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ gap: '1rem' }}>
      <DefaultSpinner size="large" color="#037ef3" />
      <p className="text-muted" style={{ fontWeight: 500 }}>Memuat sesi...</p>
    </div>
  );
}

// ============================================
// 3. BUTTON WITH LOADING STATE (Updated)
// ============================================
export function ExampleLoadingButton() {
  const isLoading = true;

  return (
    <button
      type="submit"
      disabled={isLoading}
      style={{
        background: 'linear-gradient(135deg, #EC4899, #BE185D)',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      {isLoading ? (
        <>
          <DefaultSpinner size="small" color="white" sizePixel={16} />
          Memproses...
        </>
      ) : (
        'Submit'
      )}
    </button>
  );
}

// ============================================
// 4. INPUT WITH INLINE SPINNER (Updated)
// ============================================
export function ExampleSearchInput() {
  const isSearching = true;

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Cari referensi..."
        disabled={isSearching}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          paddingRight: '3rem',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          backgroundColor: 'var(--surface)',
          color: 'var(--text-main)',
          fontSize: '0.9rem',
        }}
      />
      {isSearching && (
        <div
          style={{
            position: 'absolute',
            right: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <DefaultSpinner size="small" sizePixel={20} />
        </div>
      )}
    </div>
  );
}

// ============================================
// 5. PAGE LOADING (Updated)
// ============================================
export function ExamplePageLoading() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <DefaultSpinner size="large" />
        <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Memuat formulir publik...
        </div>
      </div>
    </div>
  );
}

// ============================================
// 6. INLINE STATUS BADGE (Updated)
// ============================================
export function ExampleInlineStatus() {
  const extractionStatus = 'Mengekstraksi konten...';

  return (
    <div
      style={{
        marginTop: '0.5rem',
        padding: '0.5rem',
        textAlign: 'center',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: 'var(--primary)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
      }}
    >
      <DefaultSpinner size="tiny" sizePixel={12} color="#4F46E5" />
      {extractionStatus}
    </div>
  );
}

// ============================================
// 7. MULTI-STATE FORM FIELD (Updated)
// ============================================
export function ExampleMultiStateField() {
  const docName = null;
  const setupLoading = true;

  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        border: '2px dashed var(--border)',
        borderRadius: '8px',
        cursor: setupLoading ? 'not-allowed' : 'pointer',
        backgroundColor: docName
          ? 'rgba(16, 185, 129, 0.05)'
          : 'var(--surface-hover)',
        gap: '0.5rem',
        textAlign: 'center',
        opacity: setupLoading ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      {docName ? (
        <>
          <span style={{ fontSize: '1.5rem' }}>✓</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
            {docName}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>
            Ekstraksi berhasil
          </span>
        </>
      ) : (
        <>
          {setupLoading ? (
            <DefaultSpinner size="small" sizePixel={32} />
          ) : (
            <span style={{ fontSize: '1.75rem' }}>📤</span>
          )}
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {setupLoading
              ? 'Memproses Dokumen...'
              : 'Drag & Drop File PDF/Word'}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              opacity: 0.7,
            }}
          >
            Atau klik untuk memilih file (.pdf, .docx)
          </span>
        </>
      )}
      <input type="file" accept=".pdf,.docx" style={{ display: 'none' }} />
    </label>
  );
}

// ============================================
// UKURAN REKOMENDASI
// ============================================
/*
TINY (16-20px):
- Inline badges
- Mini status indicators
- Small labels dengan spinner
Contoh: <DefaultSpinner size="tiny" />

SMALL (24-32px):
- Button loaders
- Form field icons
- Input search indicators
Contoh: <DefaultSpinner size="small" />

MEDIUM (40-48px):
- Modal/dialog loading
- Page transition loading
- Normal content loading
Contoh: <DefaultSpinner size="medium" />

LARGE (60-80px):
- Full page loading
- Initial app loading
- Major content sections
Contoh: <DefaultSpinner size="large" />

XLARGE (100-120px):
- Splash screens
- Full screen initialization
- Hero sections
Contoh: <DefaultSpinner size="xlarge" />
*/

// ============================================
// PROP CHEAT SHEET
// ============================================
/*
Props tersedia:
- size: "tiny" | "small" | "medium" | "large" | "xlarge" (default: "medium")
- sizePixel: number (override ukuran, dalam pixel)
- color: string (hex color, default: "#037ef3")
- className: string (Tailwind/custom classes)
- style: object (inline CSS styles)

Contoh lengkap:
<DefaultSpinner
  size="large"
  sizePixel={64}
  color="#10b981"
  className="mt-4 drop-shadow-lg"
  style={{ opacity: 0.9 }}
/>
*/
