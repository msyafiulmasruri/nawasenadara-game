'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RequireRole from '@/features/auth/components/RequireRole';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';

const ICONS = {
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  clear: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  ),
};

const RISK_LABEL = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };
const RISK_COLOR = { rendah: '#15803d', sedang: '#b45309', tinggi: '#b91c1c' };
const RISK_BG = { rendah: '#f0fdf4', sedang: '#fefce8', tinggi: '#fef2f2' };

const ENDING_META = {
  true: { label: 'Ending Sejati', bg: '#f0fdf4', text: '#15803d' },
  good: { label: 'Ending Baik', bg: '#f8fafc', text: '#334155' },
  bad: { label: 'Ending Buruk', bg: '#fef2f2', text: '#b91c1c' },
};

function EndingBadge({ endingKey, hasData }) {
  if (!endingKey || hasData === false) {
    return <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Belum Ada Data</span>;
  }
  const meta = ENDING_META[endingKey] || { label: endingKey, bg: '#f8fafc', text: '#475569' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: meta.text,
        background: meta.bg,
        border: '1px solid #e2e8f0',
      }}
    >
      {meta.label}
    </span>
  );
}

function AspectBadge({ fulfilled, total, completedCount }) {
  if (!completedCount || completedCount === 0 || total === 0) {
    return <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>-</span>;
  }
  const isPerfect = fulfilled === total;
  const isGood = fulfilled >= total * 0.5;
  const bg = isPerfect ? '#f0fdf4' : isGood ? '#fefce8' : '#fef2f2';
  const text = isPerfect ? '#15803d' : isGood ? '#854d0e' : '#b91c1c';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: text,
        background: bg,
        border: '1px solid #e2e8f0',
      }}
    >
      <span>{fulfilled} / {total}</span>
      <span style={{ fontSize: 11, opacity: 0.85 }}>({Math.round((fulfilled / total) * 100)}%)</span>
    </span>
  );
}

function RiskBadge({ level }) {
  if (!level) return <span style={{ color: '#94a3b8', fontSize: 13 }}>-</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        color: RISK_COLOR[level] || '#475569',
        background: RISK_BG[level] || '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      {RISK_LABEL[level] || level}
    </span>
  );
}

function DashboardContent() {
  const { user, getAccessToken, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const studentsData = await apiClient.get('/api/bk/students', { getAccessToken });
      setStudents(studentsData || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }, [students, search]);

  const totalStudents = students.length;
  const completedAllCount = students.filter((s) => s.episodes_completed >= 6).length;
  const needAttentionCount = students.filter(
    (s) => (s.unacknowledged_count && s.unacknowledged_count > 0) || s.latest_risk_level === 'tinggi',
  ).length;

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <div style={styles.badgePortal}>Portal Konseling & Bimbingan</div>
            <h1 style={styles.title}>Dashboard Guru BK</h1>
            <p style={styles.subtitle}>
              Selamat datang, <strong>{user?.name || 'Bapak/Ibu Guru'}</strong>. Pantau capaian aspek & perkembangan emosi siswa binaanmu.
            </p>
          </div>
          <button type="button" style={styles.logoutBtn} onClick={logout}>
            Keluar Akun
          </button>
        </header>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {/* Kartu Ringkasan Cepat - Tanpa Border Warna-Warni Tambahan */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Total Siswa Terdaftar</span>
            <span style={styles.statValue}>{totalStudents}</span>
            <span style={styles.statSub}>Seluruh siswa binaan aktif</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Tuntas Seluruh Episode</span>
            <span style={{ ...styles.statValue, color: '#16a34a' }}>{completedAllCount}</span>
            <span style={styles.statSub}>Menyelesaikan Episode 1 - 6</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Perlu Perhatian Khusus</span>
            <span style={{ ...styles.statValue, color: needAttentionCount > 0 ? '#dc2626' : '#64748b' }}>
              {needAttentionCount}
            </span>
            <span style={styles.statSub}>
              {needAttentionCount > 0 ? 'Terdapat notifikasi risiko siswa' : 'Semua kondisi terpantau aman'}
            </span>
          </div>
        </div>

        {/* Bagian Utama: Daftar Siswa */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Daftar Siswa & Capaian Belajar</h2>
              <p style={styles.sectionDesc}>
                Data progres pengerjaan, ending sementara, dan total aspek psikologis yang berhasil dipenuhi siswa.
              </p>
            </div>

            {/* Kotak Pencarian Nama - Menggunakan SVG Icon Web */}
            <div style={styles.searchWrapper}>
              <span style={styles.searchIcon}>{ICONS.search}</span>
              <input
                type="text"
                placeholder="Cari berdasarkan nama siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} style={styles.searchClearBtn} aria-label="Hapus pencarian">
                  {ICONS.clear}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>Memuat data siswa...</div>
          ) : students.length === 0 ? (
            <div style={styles.emptyBox}>Belum ada siswa yang terdaftar di sistem.</div>
          ) : filteredStudents.length === 0 ? (
            <div style={styles.emptyBox}>
              Tidak ditemukan siswa dengan nama &ldquo;{search}&rdquo;. Coba kata kunci lain.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nama Siswa</th>
                    <th style={styles.th}>Episode Selesai</th>
                    <th style={styles.th}>Ending Sementara</th>
                    <th style={styles.th}>Aspek Terpenuhi</th>
                    <th style={styles.th}>Tingkat Risiko</th>
                    <th style={styles.th}>Notifikasi Darurat</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.studentName}>{s.name}</div>
                        <div style={styles.studentEmail}>{s.email}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={styles.boldText}>{s.episodes_completed} / 6</span>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            {s.episodes_completed === 6 ? 'Tuntas' : 'Berjalan'}
                          </span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <EndingBadge
                          endingKey={s.ending_trend?.ending_key}
                          hasData={s.ending_trend?.has_data}
                        />
                      </td>
                      <td style={styles.td}>
                        <AspectBadge
                          fulfilled={s.aspects_fulfilled}
                          total={s.aspects_total || s.episodes_completed * 3}
                          completedCount={s.episodes_completed}
                        />
                      </td>
                      <td style={styles.td}>
                        <RiskBadge level={s.latest_risk_level} />
                      </td>
                      <td style={styles.td}>
                        {s.unacknowledged_count > 0 ? (
                          <span style={styles.alertCountBadge}>
                            {s.unacknowledged_count} Belum Ditinjau
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 13 }}>-</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <Link href={`/guru-bk/students/${s.id}`} style={styles.detailButton}>
                          <span>Lihat Detail Rapor</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>{ICONS.arrowRight}</span>
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
  page: {
    width: '100%',
    minHeight: '100%',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    lineHeight: 1.5,
    paddingBottom: 80,
  },
  inner: {
    width: '100%',
    maxWidth: 1320,
    margin: '0 auto',
    padding: '36px 28px 0',
    boxSizing: 'border-box',
  },
  badgePortal: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    padding: '3px 10px',
    borderRadius: 6,
    marginBottom: 8,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#475569',
    fontSize: 15,
  },
  logoutBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '8px 18px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #e2e8f0',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 14,
    fontWeight: 500,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 18,
    marginBottom: 28,
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '20px 22px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  statSub: {
    fontSize: 12.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  section: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    flexWrap: 'wrap',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sectionDesc: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: 13.5,
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: 280,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    color: '#94a3b8',
    display: 'inline-flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '9px 36px 9px 36px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#ffffff',
  },
  searchClearBtn: {
    position: 'absolute',
    right: 10,
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    display: 'inline-flex',
    alignItems: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '12px 14px',
    borderBottom: '2px solid #e2e8f0',
    color: '#475569',
    fontWeight: 700,
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    background: '#f8fafc',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.12s ease',
  },
  td: {
    padding: '14px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    verticalAlign: 'middle',
  },
  studentName: {
    fontWeight: 700,
    color: '#0f172a',
    fontSize: 14.5,
  },
  studentEmail: {
    fontSize: 12.5,
    color: '#64748b',
    marginTop: 2,
  },
  boldText: {
    fontWeight: 700,
    color: '#0f172a',
  },
  alertCountBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #e2e8f0',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  detailButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#334155',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    padding: '6px 12px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  loadingBox: {
    padding: 40,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
  },
  emptyBox: {
    padding: 40,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    background: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
};
