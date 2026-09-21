'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RequireRole from '@/features/auth/components/RequireRole';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';

const RISK_LABEL = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };
const RISK_COLOR = { rendah: '#4ade80', sedang: '#facc15', tinggi: '#f87171' };
const STATUS_LABEL = {
  locked: 'Terkunci',
  unlocked: 'Belum Dimulai',
  in_progress: 'Sedang Berjalan',
  completed: 'Selesai',
};

// Cermin dari backend services/progress/utils/emotion-ending.js — lihat
// catatan yang sama di guru-bk/dashboard/page.js. REVISI: skema ending
// disederhanakan jadi 3 kategori (true/good/bad).
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

function DetailContent({ studentId }) {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await apiClient.get(`/api/bk/students/${studentId}`, { getAccessToken });
      setData(result);
    } catch (err) {
      setError(err.message || 'Gagal memuat detail siswa.');
    } finally {
      setLoading(false);
    }
  }, [studentId, getAccessToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p style={styles.muted}>Memuat…</p>;
  if (error) return <div style={styles.errorBox}>{error}</div>;
  if (!data) return null;

  const {
    profile,
    episode_progress: episodeProgress,
    emotion_trend: emotionTrend,
    risk_alerts: riskAlerts,
    accumulated_summary: accumulated,
  } = data;

  // Ringkas emotion_trend (baris per minggu+label) jadi peta
  // { week: { label: count } } supaya gampang dirender sebagai tabel
  // sederhana tanpa perlu library chart tambahan.
  const trendByWeek = {};
  emotionTrend.forEach((row) => {
    const week = new Date(row.week_start).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    });
    trendByWeek[week] = trendByWeek[week] || {};
    trendByWeek[week][row.label] = Number(row.count);
  });
  const labels = ['aman', 'netral', 'sedih', 'takut', 'marah', 'menyinggung'];

  return (
    <>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Profil</h2>
        <p style={{ margin: 0 }}>{profile.name}</p>
        <p style={{ margin: '2px 0 0', color: '#888', fontSize: 15 }}>{profile.email}</p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Progres Episode</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Episode</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Ending</th>
                <th style={styles.th}>Selesai Pada</th>
              </tr>
            </thead>
            <tbody>
              {episodeProgress.map((ep) => (
                <tr key={ep.episode_id} style={styles.tr}>
                  <td style={styles.td}>{ep.order_index}</td>
                  <td style={styles.td}>{ep.title}</td>
                  <td style={styles.td}>{STATUS_LABEL[ep.status] || 'Belum Dimulai'}</td>
                  <td style={styles.td}>
                    <EndingBadge endingKey={ep.ending_key} hasData={Boolean(ep.ending_key)} />
                  </td>
                  <td style={styles.td}>
                    {ep.completed_at ? new Date(ep.completed_at).toLocaleDateString('id-ID') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Akumulasi Keseluruhan Episode</h2>
        <p style={styles.muted}>
          Gabungan hasil analisis NLP dari seluruh episode yang sudah diselesaikan siswa ini
          ({accumulated?.completed_episodes ?? 0} / {accumulated?.total_episodes ?? 9}) — persis
          seperti ending akumulasi yang akan dilihat siswa sendiri di penghujung Episode 9.
        </p>
        {!accumulated || accumulated.completed_episodes === 0 ? (
          <p style={styles.muted}>
            Belum ada episode yang diselesaikan, jadi akumulasi ending belum bisa dihitung.
          </p>
        ) : (
          <>
            <div style={styles.accumulatedHeader}>
              <EndingBadge endingKey={accumulated.ending_key} hasData={accumulated.has_data} />
              <span style={styles.accumulatedTitle}>{accumulated.title}</span>
            </div>
            <div style={styles.accumulatedPlusMinus}>
              <p style={styles.accumulatedPlus}>
                <strong>+ </strong>
                {accumulated.plus_text}
              </p>
              <p style={styles.accumulatedMinus}>
                <strong>− </strong>
                {accumulated.minus_text}
              </p>
            </div>
            <div style={{ overflowX: 'auto', marginTop: 14 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {labels.map((l) => (
                      <th key={l} style={styles.th}>
                        {l}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.tr}>
                    {labels.map((l) => (
                      <td key={l} style={styles.td}>
                        {accumulated.emotion_tally?.[l] ?? 0}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Tren Emosi Mingguan (teragregasi)</h2>
        <p style={styles.muted}>
          Jumlah kemunculan tiap label emosi per minggu dari seluruh jurnal refleksi & pesan
          chatbot konseling. Tidak menampilkan isi teks personal — untuk meninjau konteks lengkap
          suatu insiden, buka notifikasi terkait di riwayat risiko di bawah.
        </p>
        {Object.keys(trendByWeek).length === 0 ? (
          <p style={styles.muted}>Belum ada data.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Minggu</th>
                  {labels.map((l) => (
                    <th key={l} style={styles.th}>
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(trendByWeek).map(([week, counts]) => (
                  <tr key={week} style={styles.tr}>
                    <td style={styles.td}>{week}</td>
                    {labels.map((l) => (
                      <td key={l} style={styles.td}>
                        {counts[l] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Riwayat Notifikasi Risiko</h2>
        {riskAlerts.length === 0 ? (
          <p style={styles.muted}>Belum pernah ada notifikasi risiko untuk siswa ini.</p>
        ) : (
          <div style={styles.alertList}>
            {riskAlerts.map((alert) => (
              <div key={alert.id} style={styles.alertCard}>
                <div style={{ flex: 1 }}>
                  <div style={styles.alertMeta}>
                    <RiskBadge level={alert.risk_level} />
                    <span style={styles.mutedInline}>
                      {new Date(alert.created_at).toLocaleString('id-ID')}
                    </span>
                    {alert.acknowledged_at ? (
                      <span style={{ color: '#4ade80', fontSize: 14 }}>✓ Sudah ditinjau</span>
                    ) : (
                      <span style={{ color: '#f87171', fontSize: 14 }}>Belum ditinjau</span>
                    )}
                  </div>
                  <p style={styles.alertSnippet}>&ldquo;{alert.snippet}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function StudentDetailPage() {
  const params = useParams();

  return (
    <RequireRole allowedRoles={['guru_bk']} redirectTo="/guru-bk/login">
      <div className="dashboard-page" style={styles.page}>
        <div style={styles.inner}>
        <Link href="/guru-bk/dashboard" style={styles.backLink}>
          ← Kembali ke Dashboard
        </Link>
        <DetailContent studentId={params.id} />
        </div>
      </div>
    </RequireRole>
  );
}

const styles = {
  page: {
    minHeight: '100dvh',
    width: '100%',
    background: '#f7f7fb',
    color: '#1f1f2e',
    fontFamily: "'Pixelify Sans', monospace",
  },
  inner: {
    width: '100%',
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 32px 48px',
    boxSizing: 'border-box',
  },
  backLink: {
    color: '#6d4aa8',
    textDecoration: 'none',
    fontSize: 16,
    display: 'inline-block',
    marginBottom: 24,
    fontWeight: 600,
  },
  section: {
    marginBottom: 24,
    background: '#ffffff',
    border: '1px solid #e5e5ef',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 2px 10px rgba(30, 20, 60, 0.04)',
  },
  sectionTitle: { fontSize: 21, marginBottom: 10, color: '#1f1f2e', marginTop: 0 },
  muted: { color: '#8a8a9a', fontSize: 15, lineHeight: 1.6 },
  mutedInline: { color: '#8a8a9a', fontSize: 14 },
  errorBox: {
    background: '#fdecec',
    border: '1px solid #f2a3a3',
    color: '#b3261e',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 16,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 15 },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    borderBottom: '2px solid #eeeef5',
    color: '#8a8a9a',
    fontWeight: 600,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  tr: { borderBottom: '1px solid #f0f0f7' },
  td: { padding: '8px 10px', color: '#2a2a3a' },
  alertList: { display: 'flex', flexDirection: 'column', gap: 10 },
  alertCard: {
    background: '#fff8f0',
    border: '1px solid #f0d9b5',
    borderRadius: 10,
    padding: '12px 14px',
  },
  alertMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  alertSnippet: { margin: 0, fontSize: 15, color: '#3a3a4a' },
  accumulatedHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  accumulatedTitle: { fontSize: 17, fontWeight: 700, color: '#1f1f2e' },
  accumulatedPlusMinus: { display: 'flex', flexDirection: 'column', gap: 6 },
  accumulatedPlus: { margin: 0, fontSize: 15, color: '#1e7a3d', lineHeight: 1.6 },
  accumulatedMinus: { margin: 0, fontSize: 15, color: '#a3401f', lineHeight: 1.6 },
};
