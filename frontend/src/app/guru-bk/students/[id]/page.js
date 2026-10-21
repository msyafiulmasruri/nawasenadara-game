'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RequireRole from '@/features/auth/components/RequireRole';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';
import { evaluateEpisodeAspects } from '@/features/game-engine/utils/aspectRubric';

const RISK_LABEL = { rendah: 'Rendah', sedang: 'Sedang', tinggi: 'Tinggi' };
const RISK_COLOR = { rendah: '#15803d', sedang: '#b45309', tinggi: '#b91c1c' };
const RISK_BG = { rendah: '#dcfce7', sedang: '#fef3c7', tinggi: '#fee2e2' };

const ENDING_META = {
  true: { label: 'Ending Sejati', bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  good: { label: 'Ending Baik', bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  bad: { label: 'Ending Buruk', bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
};

const EMOTION_META = {
  aman: { label: 'Aman', desc: 'Tenang, asertif, & berani bersuara', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  netral: { label: 'Netral', desc: 'Wajar, menahan diri / menimbang', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  sedih: { label: 'Sedih', desc: 'Merasa tertekan, murung, kecewa', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  takut: { label: 'Takut', desc: 'Cemas, bingung, panik hadapi ancaman', color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd' },
  marah: { label: 'Marah', desc: 'Kesal, terpancing emosi / melawan kasar', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
  menyinggung: { label: 'Menyinggung', desc: 'Sarkastik, defensif, atau meremehkan', color: '#c2410c', bg: '#ffedd5', border: '#fdba74' },
};

function EndingBadge({ endingKey, hasData }) {
  if (!endingKey || hasData === false) {
    return <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Belum Selesai</span>;
  }
  const meta = ENDING_META[endingKey] || { label: endingKey, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
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
        border: `1px solid ${meta.border}`,
      }}
    >
      {meta.label}
    </span>
  );
}

function RiskBadge({ level }) {
  if (!level) return <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        color: RISK_COLOR[level] || '#475569',
        background: RISK_BG[level] || '#f1f5f9',
        border: `1px solid ${RISK_COLOR[level]}40`,
      }}
    >
      {RISK_LABEL[level] || level}
    </span>
  );
}

function getDominantEmotionFromTally(tally) {
  if (!tally || typeof tally !== 'object') return null;
  const priority = ['aman', 'netral', 'sedih', 'takut', 'marah', 'menyinggung'];
  let dominant = null;
  let maxCount = 0;
  priority.forEach((k) => {
    if (tally[k] && Number(tally[k]) > maxCount) {
      maxCount = Number(tally[k]);
      dominant = k;
    }
  });
  return dominant;
}

function getQualitativeTier(episodes = []) {
  const completed = episodes.filter((ep) => ep.status === 'completed');
  if (completed.length === 0) {
    return {
      tier: 'Belum Ada Evaluasi',
      badgeColor: '#64748b',
      badgeBg: '#f1f5f9',
      badgeBorder: '#cbd5e1',
      scoreText: '0 / 6 Episode Selesai',
      summary: 'Siswa belum menyelesaikan episode apapun. Evaluasi kualitatif akan otomatis terhitung setelah siswa menyelesaikan minimal 1 episode.',
    };
  }

  let totalFulfilled = 0;
  const totalPossible = completed.length * 3;
  let trueCount = 0;
  let badCount = 0;

  completed.forEach((ep) => {
    const evalResult = evaluateEpisodeAspects(ep.episode_id, ep.choices || []);
    totalFulfilled += evalResult.fulfilledCount;
    if (evalResult.endingKey === 'true') trueCount++;
    if (evalResult.endingKey === 'bad') badCount++;
  });

  const percent = Math.round((totalFulfilled / totalPossible) * 100);

  if (percent >= 85 && badCount === 0) {
    return {
      tier: 'Sangat Baik',
      badgeColor: '#15803d',
      badgeBg: '#dcfce7',
      badgeBorder: '#86efac',
      scoreText: `${totalFulfilled} dari ${totalPossible} Aspek Terpenuhi (${percent}%)`,
      summary:
        'Siswa menunjukkan kematangan emosional dan sikap asertif yang luar biasa. Mampu mengenali batasan diri, menolak perlakuan tidak adil secara tenang, dan berani melibatkan orang dewasa tepercaya tanpa ragu.',
    };
  }

  if (percent >= 60 && badCount <= 1) {
    return {
      tier: 'Baik',
      badgeColor: '#1d4ed8',
      badgeBg: '#dbeafe',
      badgeBorder: '#93c5fd',
      scoreText: `${totalFulfilled} dari ${totalPossible} Aspek Terpenuhi (${percent}%)`,
      summary:
        'Siswa mampu memilih langkah yang aman dan suportif pada mayoritas situasi. Ada beberapa momen di mana siswa masih ragu atau terlambat bertindak, namun pemahaman dasarnya sudah sangat baik.',
    };
  }

  if (percent >= 40) {
    return {
      tier: 'Cukup',
      badgeColor: '#b45309',
      badgeBg: '#fef3c7',
      badgeBorder: '#fde047',
      scoreText: `${totalFulfilled} dari ${totalPossible} Aspek Terpenuhi (${percent}%)`,
      summary:
        'Siswa mulai memahami situasi yang berisiko, namun masih kerap merasa cemas, sungkan, atau memilih memendam perasaan. Perlu dorongan untuk berani menyuarakan batas diri secara terbuka.',
    };
  }

  return {
    tier: 'Perlu Pendampingan',
    badgeColor: '#b91c1c',
    badgeBg: '#fee2e2',
    badgeBorder: '#fca5a5',
    scoreText: `${totalFulfilled} dari ${totalPossible} Aspek Terpenuhi (${percent}%)`,
    summary:
      'Pilihan sikap siswa didominasi oleh pola menahan rasa sakit, panik, atau membalas kasar yang memperbesar risiko konflik. Disarankan untuk dijadwalkan sesi bimbingan konseling tatap muka guna mendampingi regulasi emosi.',
  };
}

function DetailContent({ studentId }) {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);

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

  const handleAcknowledge = async (alertId) => {
    setAcknowledging(alertId);
    try {
      await apiClient.post(`/api/bk/alerts/${alertId}/acknowledge`, undefined, { getAccessToken });
      load();
    } catch (err) {
      setError(err.message || 'Gagal menandai notifikasi.');
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) return <div style={styles.loadingBox}>Memuat data siswa...</div>;
  if (error) return <div style={styles.errorBox}>{error}</div>;
  if (!data) return null;

  const {
    profile,
    episode_progress: episodeProgress = [],
    risk_alerts: riskAlerts = [],
    accumulated_summary: accumulated,
  } = data;

  // Evaluasi Rapor 3 Aspek per Episode
  const episodeReports = episodeProgress.map((ep) => {
    const isCompleted = ep.status === 'completed';
    const evaluation = evaluateEpisodeAspects(ep.episode_id, ep.choices || []);
    const dominantEmotion = getDominantEmotionFromTally(ep.emotion_tally);

    return {
      ...ep,
      isCompleted,
      evaluation,
      dominantEmotion,
    };
  });

  const qualitativeTier = getQualitativeTier(episodeProgress);
  const unackAlerts = riskAlerts.filter((a) => !a.acknowledged_at);

  return (
    <>
      {/* Profil Siswa */}
      <section style={styles.section}>
        <div style={styles.profileHeader}>
          <div style={styles.avatarCircle}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.badgeSiswa}>Data Siswa Binaan</div>
            <h1 style={styles.profileName}>{profile.name}</h1>
            <p style={styles.profileMeta}>
              {profile.email} • Terdaftar sejak {new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={styles.profileKpi}>
            <span style={styles.kpiNumber}>{episodeProgress.filter((e) => e.status === 'completed').length} / 6</span>
            <span style={styles.kpiLabel}>Episode Tuntas</span>
          </div>
        </div>
      </section>

      {/* Akumulasi Keseluruhan Episode — Kualitatif & Mudah Dipahami */}
      <section style={styles.section}>
        <div style={styles.sectionTitleRow}>
          <div>
            <h2 style={styles.sectionTitle}>Tingkat Capaian Keseluruhan Siswa</h2>
            <p style={styles.sectionDesc}>
              Evaluasi kualitatif perilaku dan kesiapan mental siswa berdasarkan akumulasi pilihan keputusan yang telah diselesaikan.
            </p>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 8,
              background: qualitativeTier.badgeBg,
              color: qualitativeTier.badgeColor,
              border: `1.5px solid ${qualitativeTier.badgeBorder || qualitativeTier.badgeColor}`,
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            <span>Tingkat: {qualitativeTier.tier}</span>
          </div>
        </div>

        <div style={styles.tierCard}>
          <div style={styles.tierScoreRow}>
            <span style={styles.tierScoreLabel}>Total Pemenuhan Aspek Misi:</span>
            <span style={styles.tierScoreVal}>{qualitativeTier.scoreText}</span>
          </div>
          <p style={styles.tierSummaryText}>{qualitativeTier.summary}</p>
        </div>

        {accumulated?.plus_text && (
          <div style={styles.reflectionCard}>
            <div style={styles.reflectionItem}>
              <strong style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span> Kekuatan Sikap Siswa:
              </strong>
              <p style={styles.reflectionText}>{accumulated.plus_text}</p>
            </div>
            {accumulated.minus_text && (
              <div style={{ ...styles.reflectionItem, borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12 }}>
                <strong style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠</span> Aspek yang Masih Membutuhkan Pendampingan:
                </strong>
                <p style={styles.reflectionText}>{accumulated.minus_text}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Status Emosi Terakhir per Episode (Bukan Mingguan & Tidak Tertotal) */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Status Emosi Terakhir per Episode</h2>
            <p style={styles.sectionDesc}>
              Mencatat emosi dominan terakhir yang diperoleh siswa pada tiap episode. Otomatis diperbarui saat siswa memainkan ulang episode tersebut (tidak tertotal berulang-ulang).
            </p>
          </div>
        </div>

        <div style={styles.emotionGrid}>
          {episodeReports.map((ep) => {
            const emotionKey = ep.dominantEmotion;
            const meta = emotionKey ? EMOTION_META[emotionKey] : null;

            return (
              <div key={ep.episode_id} style={styles.emotionCard}>
                <div style={styles.emotionEpNumber}>Episode {ep.order_index}</div>
                <div style={styles.emotionEpTitle}>{ep.title}</div>

                <div style={{ marginTop: 14 }}>
                  {ep.status !== 'completed' && !emotionKey ? (
                    <span style={styles.emotionNotPlayed}>Belum Dimainkan</span>
                  ) : meta ? (
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          color: meta.color,
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <p style={styles.emotionDesc}>{meta.desc}</p>
                    </div>
                  ) : (
                    <span style={styles.emotionNotPlayed}>Netral</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rapor Capaian 3 Aspek per Episode (Detail Komprehensif) */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Rapor Capaian 3 Aspek per Episode</h2>
            <p style={styles.sectionDesc}>
              Detail ketercapaian 3 aspek langkah psikologis siswa di tiap episode (Ending Sejati: 3/3, Ending Baik: 1-2/3, Ending Buruk: 0/3).
            </p>
          </div>
        </div>

        <div style={styles.raporList}>
          {episodeReports.map((ep) => {
            const isCompleted = ep.isCompleted;
            const evalData = ep.evaluation;
            const aspects = evalData?.aspects || [];

            return (
              <div
                key={ep.episode_id}
                style={{
                  ...styles.raporCard,
                  borderColor: !isCompleted ? '#e2e8f0' : evalData.endingKey === 'bad' ? '#fca5a5' : '#cbd5e1',
                }}
              >
                <div style={styles.raporCardHeader}>
                  <div>
                    <span style={styles.raporEpTag}>Episode {ep.order_index}</span>
                    <h3 style={styles.raporEpTitle}>{ep.title}</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {isCompleted ? (
                      <>
                        <EndingBadge endingKey={evalData.endingKey} hasData={true} />
                        <span style={styles.raporScoreTag}>
                          {evalData.fulfilledCount} / {evalData.totalCount} Aspek Terpenuhi
                        </span>
                      </>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                        {ep.status === 'in_progress' ? 'Sedang Dijalani' : 'Belum Dimulai'}
                      </span>
                    )}
                  </div>
                </div>

                {isCompleted ? (
                  <div style={styles.aspectsWrapper}>
                    <p style={styles.aspectsHeading}>Pemeriksaan 3 Langkah Misi Psikologis:</p>
                    <div style={styles.aspectItemsGrid}>
                      {aspects.map((aspect) => (
                        <div
                          key={aspect.id}
                          style={{
                            ...styles.aspectItem,
                            background: aspect.fulfilled ? '#f0fdf4' : '#fff1f2',
                            border: `1px solid ${aspect.fulfilled ? '#bbf7d0' : '#fecdd3'}`,
                          }}
                        >
                          <div style={styles.aspectStatusRow}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                color: aspect.fulfilled ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {aspect.fulfilled ? '✓ Terpenuhi' : '✗ Belum Terpenuhi'}
                            </span>
                            <span style={styles.aspectIdText}>Langkah {aspect.id}</span>
                          </div>
                          <div style={styles.aspectTitle}>{aspect.title}</div>
                          <div style={styles.aspectFeedback}>{aspect.feedback}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={styles.notCompletedNotice}>
                    Siswa belum menyelesaikan misi episode ini. Rapor aspek akan muncul setelah episode diselesaikan.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Notifikasi & Riwayat Risiko (Khusus Siswa Ini) */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Notifikasi Darurat & Riwayat Risiko
              {unackAlerts.length > 0 ? ` (${unackAlerts.length} belum ditinjau)` : ''}
            </h2>
            <p style={styles.sectionDesc}>
              Catatan frasa atau ucapan siswa dalam jurnal refleksi dan konseling yang memicu peringatan risiko.
            </p>
          </div>
        </div>

        {riskAlerts.length === 0 ? (
          <div style={styles.emptyAlertsBox}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <span>Tidak ada riwayat notifikasi risiko darurat untuk siswa ini. Seluruh percakapan dalam batas aman.</span>
          </div>
        ) : (
          <div style={styles.alertList}>
            {riskAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  ...styles.alertCard,
                  background: !alert.acknowledged_at ? '#fff8f0' : '#ffffff',
                  borderColor: !alert.acknowledged_at ? '#fed7aa' : '#e2e8f0',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={styles.alertMeta}>
                    <RiskBadge level={alert.risk_level} />
                    <span style={styles.alertDate}>
                      {new Date(alert.created_at).toLocaleString('id-ID')}
                    </span>
                    {alert.acknowledged_at ? (
                      <span style={styles.alertAckYes}>✓ Sudah ditinjau</span>
                    ) : (
                      <span style={styles.alertAckNo}>● Belum ditinjau</span>
                    )}
                  </div>
                  <p style={styles.alertSnippet}>&ldquo;{alert.snippet}&rdquo;</p>
                </div>

                {!alert.acknowledged_at && (
                  <button
                    type="button"
                    style={styles.ackBtn}
                    disabled={acknowledging === alert.id}
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    {acknowledging === alert.id ? 'Menandai...' : 'Tandai Sudah Ditinjau'}
                  </button>
                )}
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
      <div style={styles.page}>
        <div style={styles.inner}>
          <div style={{ marginBottom: 20 }}>
            <Link href="/guru-bk/dashboard" style={styles.backLink}>
              ← Kembali ke Dashboard Guru BK
            </Link>
          </div>
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
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    lineHeight: 1.5,
  },
  inner: {
    width: '100%',
    maxWidth: 1240,
    margin: '0 auto',
    padding: '32px 28px 60px',
    boxSizing: 'border-box',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    background: '#ffffff',
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  section: {
    marginBottom: 26,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '24px 28px',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
    fontWeight: 800,
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
  },
  badgeSiswa: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 3,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  profileMeta: {
    fontSize: 13.5,
    color: '#64748b',
    margin: '4px 0 0',
  },
  profileKpi: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: '12px 20px',
    borderRadius: 10,
    textAlign: 'center',
    marginLeft: 'auto',
  },
  kpiNumber: {
    display: 'block',
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 600,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sectionDesc: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: 13.5,
  },
  tierCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 20px',
    marginBottom: 16,
  },
  tierScoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tierScoreLabel: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: 600,
  },
  tierScoreVal: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: 700,
  },
  tierSummaryText: {
    margin: 0,
    fontSize: 14,
    color: '#334155',
    lineHeight: 1.6,
  },
  reflectionCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 20px',
  },
  reflectionItem: {
    fontSize: 13.5,
  },
  reflectionText: {
    margin: '6px 0 0',
    color: '#334155',
    fontSize: 13.5,
    lineHeight: 1.55,
  },
  emotionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 14,
  },
  emotionCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  emotionEpNumber: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  emotionEpTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#0f172a',
    marginTop: 2,
    lineHeight: 1.3,
  },
  emotionNotPlayed: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  emotionDesc: {
    margin: '6px 0 0',
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 1.4,
  },
  raporList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  raporCard: {
    border: '1.5px solid #e2e8f0',
    borderRadius: 12,
    padding: '20px 22px',
    background: '#ffffff',
  },
  raporCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 14,
    borderBottom: '1px solid #f1f5f9',
  },
  raporEpTag: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  raporEpTitle: {
    margin: '2px 0 0',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  raporScoreTag: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    padding: '3px 10px',
    borderRadius: 6,
  },
  aspectsWrapper: {
    marginTop: 14,
  },
  aspectsHeading: {
    fontSize: 13,
    fontWeight: 700,
    color: '#475569',
    margin: '0 0 10px',
  },
  aspectItemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },
  aspectItem: {
    borderRadius: 8,
    padding: '12px 14px',
  },
  aspectStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aspectIdText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 600,
  },
  aspectTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  aspectFeedback: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 6,
    lineHeight: 1.45,
  },
  notCompletedNotice: {
    marginTop: 12,
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  emptyAlertsBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '18px 20px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    color: '#166534',
    fontSize: 13.5,
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  alertCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  alertMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  alertDate: {
    fontSize: 12.5,
    color: '#64748b',
  },
  alertAckYes: {
    fontSize: 12,
    fontWeight: 600,
    color: '#15803d',
    background: '#dcfce7',
    padding: '2px 8px',
    borderRadius: 4,
  },
  alertAckNo: {
    fontSize: 12,
    fontWeight: 700,
    color: '#dc2626',
    background: '#fee2e2',
    padding: '2px 8px',
    borderRadius: 4,
  },
  alertSnippet: {
    margin: 0,
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  ackBtn: {
    background: '#e0e7ff',
    border: '1px solid #c7d2fe',
    color: '#3730a3',
    padding: '8px 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  loadingBox: {
    padding: 60,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 15,
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
  },
};
