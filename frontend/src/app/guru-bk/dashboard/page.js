'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RequireRole from '@/features/auth/components/RequireRole';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';

const RISK_LABEL = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };
const RISK_COLOR = { rendah: '#4ade80', sedang: '#facc15', tinggi: '#f87171' };

// Cermin dari backend services/progress/utils/emotion-ending.js
// (ENDING_LABELS/OVERALL_ENDING_META) — dashboard guru BK murni
// menampilkan `ending_key` yang sudah dihitung server, jadi di sini
// cuma perlu warna & fallback label pendek untuk badge, bukan hitung
// ulang logic-nya.
const ENDING_COLOR = {
  true: '#4ade80',
  good: '#a3a3c2',
  bad: '#f87171',
};
const ENDING_SHORT_LABEL = {
  true: 'Sejati',
  good: 'Baik',
  bad: 'Buruk',
};

function EndingBadge({ endingKey, hasData }) {
  if (!endingKey || hasData === false) return <span style={{ color: '#888' }}>—</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        color: '#05050f',
        background: ENDING_COLOR[endingKey] || '#888',
      }}
    >
      {ENDING_SHORT_LABEL[endingKey] || endingKey}
    </span>
  );
}

function RiskBadge({ level }) {
  if (!level) return <span style={{ color: '#888' }}>—</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        color: '#05050f',
        background: RISK_COLOR[level] || '#888',
      }}
    >
      {RISK_LABEL[level] || level}
    </span>
  );
}

function DashboardContent() {
  const { user, getAccessToken, logout } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acknowledging, setAcknowledging] = useState(null);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [alertsData, studentsData] = await Promise.all([
        apiClient.get('/api/bk/alerts?unacknowledged=true', { getAccessToken }),
        apiClient.get('/api/bk/students', { getAccessToken }),
      ]);
      setAlerts(alertsData || []);
      setStudents(studentsData || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadData();
    // Polling ringan setiap 60 detik supaya notifikasi darurat terasa
    // "real-time" (proposal 2.2.6) tanpa perlu infrastruktur WebSocket
    // tambahan untuk versi pertama ini.
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAcknowledge = async (alertId) => {
    setAcknowledging(alertId);
    try {
      await apiClient.post(`/api/bk/alerts/${alertId}/acknowledge`, undefined, { getAccessToken });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      setError(err.message || 'Gagal menandai notifikasi.');
    } finally {
      setAcknowledging(null);
    }
  };

  return (
    <div className="dashboard-page" style={styles.page}>
      <div style={styles.inner}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Guru BK</h1>
          <p style={styles.subtitle}>Halo, {user?.name}. Pantau progres & kondisi siswa binaanmu.</p>
        </div>
        <button type="button" style={styles.logoutBtn} onClick={logout}>
          Keluar
        </button>
      </header>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Notifikasi Darurat {alerts.length > 0 ? `(${alerts.length} belum ditinjau)` : ''}
        </h2>
        {loading ? (
          <p style={styles.muted}>Memuat…</p>
        ) : alerts.length === 0 ? (
          <p style={styles.muted}>Tidak ada notifikasi risiko yang perlu ditinjau saat ini.</p>
        ) : (
          <div style={styles.alertList}>
            {alerts.map((alert) => (
              <div key={alert.id} style={styles.alertCard}>
                <div style={{ flex: 1 }}>
                  <div style={styles.alertMeta}>
                    <RiskBadge level={alert.risk_level} />
                    <Link href={`/guru-bk/students/${alert.user_id}`} style={styles.alertStudent}>
                      {alert.student_name}
                    </Link>
                    {alert.episode_title ? (
                      <span style={styles.mutedInline}>· Episode: {alert.episode_title}</span>
                    ) : null}
                    <span style={styles.mutedInline}>
                      · {new Date(alert.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p style={styles.alertSnippet}>&ldquo;{alert.snippet}&rdquo;</p>
                </div>
                <button
                  type="button"
                  style={styles.ackBtn}
                  disabled={acknowledging === alert.id}
                  onClick={() => handleAcknowledge(alert.id)}
                >
                  {acknowledging === alert.id ? 'Menandai…' : 'Sudah Ditinjau'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Daftar Siswa</h2>
        {loading ? (
          <p style={styles.muted}>Memuat…</p>
        ) : students.length === 0 ? (
          <p style={styles.muted}>Belum ada siswa terdaftar.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nama</th>
                  <th style={styles.th}>Episode Selesai</th>
                  <th style={styles.th}>Sedang Dijalani</th>
                  <th style={styles.th}>Ending Sementara</th>
                  <th style={styles.th}>Risiko Terbaru</th>
                  <th style={styles.th}>Notifikasi Tertunda</th>
                  <th style={styles.th} />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={styles.td}>{s.name}</td>
                    <td style={styles.td}>{s.episodes_completed} / 9</td>
                    <td style={styles.td}>{s.episodes_in_progress}</td>
                    <td style={styles.td}>
                      <EndingBadge
                        endingKey={s.ending_trend?.ending_key}
                        hasData={s.ending_trend?.has_data}
                      />
                    </td>
                    <td style={styles.td}>
                      <RiskBadge level={s.latest_risk_level} />
                    </td>
                    <td style={styles.td}>
                      {s.unacknowledged_count > 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 600 }}>
                          {s.unacknowledged_count}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={styles.td}>
                      <Link href={`/guru-bk/students/${s.id}`} style={styles.detailLink}>
                        Lihat Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

export default function GuruBkDashboardPage() {
  return (
    <RequireRole allowedRoles={['guru_bk']} redirectTo="/guru-bk/login">
      <DashboardContent />
    </RequireRole>
  );
}

const styles = {
  // width 100% + maxWidth 'none' (bukan 1100px terpusat lagi) supaya
  // dashboard benar-benar mengisi layar penuh — konten di dalamnya
  // tetap dibatasi lewat `inner` supaya tabel/teks tidak jadi terlalu
  // lebar & susah dibaca di monitor sangat lebar.
  page: {
    minHeight: '100dvh',
    width: '100%',
    background: '#f7f7fb',
    color: '#1f1f2e',
    fontFamily: "'Pixelify Sans', monospace",
  },
  inner: {
    width: '100%',
    maxWidth: 1400,
    margin: '0 auto',
    padding: '32px 32px 48px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: { fontFamily: "'Jersey 15', monospace", fontSize: 32, color: '#6d4aa8', margin: 0 },
  subtitle: { margin: '4px 0 0', color: '#5a5a6e', fontSize: 16 },
  logoutBtn: {
    background: '#ffffff',
    border: '1px solid #d6d6e4',
    color: '#1f1f2e',
    padding: '8px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBox: {
    background: '#fdecec',
    border: '1px solid #f2a3a3',
    color: '#b3261e',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
    background: '#ffffff',
    border: '1px solid #e5e5ef',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 2px 10px rgba(30, 20, 60, 0.04)',
  },
  sectionTitle: { fontSize: 21, marginBottom: 12, color: '#1f1f2e', marginTop: 0 },
  muted: { color: '#8a8a9a', fontSize: 16 },
  mutedInline: { color: '#8a8a9a', fontSize: 14 },
  alertList: { display: 'flex', flexDirection: 'column', gap: 10 },
  alertCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    background: '#fff8f0',
    border: '1px solid #f0d9b5',
    borderRadius: 10,
    padding: '14px 16px',
  },
  alertMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  alertStudent: { color: '#6d4aa8', fontWeight: 600, textDecoration: 'none' },
  alertSnippet: { margin: 0, fontSize: 15, color: '#3a3a4a' },
  ackBtn: {
    background: '#eef2ff',
    border: '1px solid #b9c4f2',
    color: '#2a3d8f',
    padding: '8px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    whiteSpace: 'nowrap',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 16 },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #eeeef5',
    color: '#8a8a9a',
    fontWeight: 600,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tr: { borderBottom: '1px solid #f0f0f7' },
  td: { padding: '10px 12px', color: '#2a2a3a' },
  detailLink: { color: '#6d4aa8', textDecoration: 'none', fontSize: 15, fontWeight: 600 },
};
