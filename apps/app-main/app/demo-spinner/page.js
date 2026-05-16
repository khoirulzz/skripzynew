'use client';

import DefaultSpinner from '@/components/ui/DefaultSpinner';

/**
 * Preview & Demo - Default Spinner Usage
 * Halaman ini menunjukkan cara menggunakan DefaultSpinner di berbagai konteks
 */
export default function SpinnerDemoPage() {
  return (
    <div style={{ padding: '2rem', backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>Default Spinner Component</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Premium animated loader untuk berbagai konteks aplikasi</p>
        </div>

        {/* Size Variations */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            📏 Variasi Ukuran
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {/* Tiny */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <DefaultSpinner size="tiny" />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                <strong>Tiny</strong><br />16-20px
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', display: 'block', marginTop: '0.5rem' }}>
                {'size="tiny"'}
              </code>
            </div>

            {/* Small */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <DefaultSpinner size="small" />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                <strong>Small</strong><br />24-32px
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', display: 'block', marginTop: '0.5rem' }}>
                {'size="small"'}
              </code>
            </div>

            {/* Medium */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <DefaultSpinner size="medium" />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                <strong>Medium</strong><br />40-48px (Default)
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', display: 'block', marginTop: '0.5rem' }}>
                {'size="medium"'}
              </code>
            </div>

            {/* Large */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <DefaultSpinner size="large" />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                <strong>Large</strong><br />60-80px
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', display: 'block', marginTop: '0.5rem' }}>
                {'size="large"'}
              </code>
            </div>

            {/* XLarge */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', height: '120px', alignItems: 'center' }}>
                <DefaultSpinner size="xlarge" />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                <strong>XLarge</strong><br />100-120px
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', display: 'block', marginTop: '0.5rem' }}>
                {'size="xlarge"'}
              </code>
            </div>

            {/* Custom Pixel */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <DefaultSpinner sizePixel={36} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                <strong>Custom</strong><br />36px (Custom)
              </p>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px', color: 'var(--primary)', display: 'block', marginTop: '0.5rem' }}>
                {'sizePixel={36}'}
              </code>
            </div>
          </div>
        </div>

        {/* Usage Contexts */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            🎯 Konteks Penggunaan
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Page Loading */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>📄 Page Loading</h3>
              <div style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <DefaultSpinner size="large" />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Memuat halaman...</p>
              </div>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'block', marginTop: '1rem', fontFamily: 'monospace', overflow: 'auto' }}>
                {'<DefaultSpinner size="large" />'}
              </code>
            </div>

            {/* Button Loading */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>🔘 Button Loading</h3>
              <div style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
                <button style={{
                  background: 'linear-gradient(135deg, #EC4899, #BE185D)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  margin: '0 auto',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}>
                  <DefaultSpinner size="small" color="white" />
                  Memproses...
                </button>
              </div>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'block', marginTop: '1rem', fontFamily: 'monospace', overflow: 'auto' }}>
                {'<DefaultSpinner size="small" color="white" />'}
              </code>
            </div>

            {/* Input Field Loading */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>🔍 Input Field Loading</h3>
              <div style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Cari referensi..."
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      paddingRight: '3rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <DefaultSpinner size="small" />
                  </div>
                </div>
              </div>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'block', marginTop: '1rem', fontFamily: 'monospace', overflow: 'auto' }}>
                {'// Dalam input/textarea'}
              </code>
            </div>

            {/* Modal Loading */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>📦 Modal/Dialog Loading</h3>
              <div style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <DefaultSpinner size="medium" />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Menyiapkan data...</p>
              </div>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'block', marginTop: '1rem', fontFamily: 'monospace', overflow: 'auto' }}>
                {'<DefaultSpinner size="medium" />'}
              </code>
            </div>

            {/* Inline Loading */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>⚡ Inline/Badge Loading</h3>
              <div style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <DefaultSpinner size="tiny" />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Memproses file...</span>
              </div>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'block', marginTop: '1rem', fontFamily: 'monospace', overflow: 'auto' }}>
                {'<DefaultSpinner size="tiny" />'}
              </code>
            </div>

            {/* Color Variations */}
            <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem' }}>🎨 Color Variations</h3>
              <div style={{ backgroundColor: 'var(--background)', padding: '2rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '1rem' }}>
                <DefaultSpinner size="small" color="#037ef3" />
                <DefaultSpinner size="small" color="#10b981" />
                <DefaultSpinner size="small" color="#f59e0b" />
                <DefaultSpinner size="small" color="#ef4444" />
              </div>
              <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '4px', color: 'var(--text-muted)', display: 'block', marginTop: '1rem', fontFamily: 'monospace', overflow: 'auto' }}>
                {'color="#037ef3" // Hex color string'}
              </code>
            </div>
          </div>
        </div>

        {/* Code Usage Examples */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            💻 Contoh Implementasi
          </h2>

          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h3 style={{ marginTop: 0 }}>1. Import Komponen</h3>
            <pre style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: 'var(--text-main)' }}>
{`import DefaultSpinner from '@/components/ui/DefaultSpinner';`}
            </pre>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>2. Pada Page Loading</h3>
            <pre style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: 'var(--text-main)' }}>
{`if (loading) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <DefaultSpinner size="large" />
    </div>
  );
}`}
            </pre>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>3. Pada Button Dengan Loading State</h3>
            <pre style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: 'var(--text-main)' }}>
{`<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <DefaultSpinner size="small" color="white" />
      Memproses...
    </>
  ) : (
    "Submit"
  )}
</button>`}
            </pre>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>4. Dalam Input Field</h3>
            <pre style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: 'var(--text-main)' }}>
{`<div style={{ position: 'relative' }}>
  <input
    type="text"
    placeholder="Cari..."
    disabled={isSearching}
  />
  {isSearching && (
    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
      <DefaultSpinner size="small" />
    </div>
  )}
</div>`}
            </pre>
          </div>

          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>5. Props & Customization</h3>
            <pre style={{ backgroundColor: 'var(--background)', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.85rem', color: 'var(--text-main)' }}>
{`<DefaultSpinner
  size="medium"           // tiny|small|medium|large|xlarge
  sizePixel={48}         // Override dengan pixel custom
  color="#037ef3"        // Hex color string
  className="mt-4"       // Tailwind classes
  style={{ opacity: 0.8 }} // Inline styles
/>`}
            </pre>
          </div>
        </div>

        {/* Migration Guide */}
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            🔄 Panduan Migrasi
          </h2>

          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
              Ganti import dari <code style={{ backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>LoadingSpinner</code> menjadi <code style={{ backgroundColor: 'var(--surface-hover)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>DefaultSpinner</code>:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>❌ Sebelumnya</p>
                <pre style={{ backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '4px', margin: 0, fontSize: '0.8rem', color: 'var(--text-main)' }}>
{`import LoadingSpinner
  from '@/components/ui/LoadingSpinner';

<LoadingSpinner size={48} />`}
                </pre>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>✅ Sekarang</p>
                <pre style={{ backgroundColor: 'var(--background)', padding: '0.75rem', borderRadius: '4px', margin: 0, fontSize: '0.8rem', color: 'var(--text-main)' }}>
{`import DefaultSpinner
  from '@/components/ui/DefaultSpinner';

<DefaultSpinner size="large" />`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        code {
          font-family: 'Monaco', 'Courier New', monospace;
        }

        pre {
          font-family: 'Monaco', 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
}
