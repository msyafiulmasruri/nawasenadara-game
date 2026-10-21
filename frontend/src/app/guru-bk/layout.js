export const metadata = {
  title: 'Portal Guru BK — Nawasena Dara',
  description: 'Dashboard pendampingan konseling dan pemantauan capaian emosi siswa.',
};

export default function GuruBkLayout({ children }) {
  return (
    <div
      id="guru-bk-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
