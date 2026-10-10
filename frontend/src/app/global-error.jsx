'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="id">
      <body style={{ backgroundColor: '#1a1a2e', color: '#ffffff', fontFamily: 'sans-serif', padding: '2rem' }}>
        <h2>Terjadi kesalahan sistem</h2>
        <p style={{ color: '#ff6b6b' }}>{error?.message || 'Error tidak dikenal'}</p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Coba lagi
        </button>
      </body>
    </html>
  );
}
