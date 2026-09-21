import pool from '../../../config/db.js';

// CATATAN CAKUPAN: skema saat ini mengasumsikan satu instalasi
// Nawasena Dara melayani satu sekolah/mitra (sesuai skala uji coba di
// proposal 3.2.3: "satu kelas di satu sekolah mitra"), jadi SEMUA guru
// BK bisa melihat SEMUA siswa — belum ada konsep kelas/penugasan
// per-guru. Kalau nanti perlu multi-sekolah/multi-kelas, tambahkan
// tabel `classes` + `class_members` dan filter query di bawah
// berdasarkan itu.
class BkRepositories {
  // Daftar semua siswa + ringkasan progres & risiko terbaru, untuk
  // tabel utama dashboard (proposal 3.1.1 poin 2: "rekap progres siswa
  // per kelas... dalam bentuk tabel").
  async listStudentsWithSummary() {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.avatar_url, u.created_at,
        COALESCE(progress.completed_count, 0) AS episodes_completed,
        COALESCE(progress.in_progress_count, 0) AS episodes_in_progress,
        recent_alert.risk_level AS latest_risk_level,
        recent_alert.created_at AS latest_risk_at,
        unacknowledged.unacknowledged_count,
        COALESCE(tallies.completed_tallies, '{}') AS completed_tallies
      FROM users u
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count
        FROM user_episode_progress
        WHERE user_id = u.id
      ) progress ON true
      LEFT JOIN LATERAL (
        SELECT risk_level, created_at
        FROM risk_alerts
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) recent_alert ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS unacknowledged_count
        FROM risk_alerts
        WHERE user_id = u.id AND acknowledged_at IS NULL
      ) unacknowledged ON true
      LEFT JOIN LATERAL (
        -- Dipakai controller (listStudents) untuk menghitung "ending
        -- sementara" (akumulasi emosi dari seluruh episode yang SUDAH
        -- diselesaikan siswa ini sejauh ini) lewat
        -- utils/emotion-ending.js sumEmotionTallies/computeOverallEnding
        -- — array JSONB mentah, dijumlahkan di JS, bukan di SQL, supaya
        -- logic kategorinya tetap satu sumber kebenaran (util yang sama
        -- dipakai progress-controller.js & bk-controller.js).
        SELECT array_agg(emotion_tally) AS completed_tallies
        FROM user_episode_progress
        WHERE user_id = u.id AND status = 'completed' AND emotion_tally IS NOT NULL
      ) tallies ON true
      WHERE u.role = 'siswa'
      ORDER BY
        (unacknowledged.unacknowledged_count > 0) DESC,
        recent_alert.created_at DESC NULLS LAST,
        u.name ASC
    `);
    return result.rows;
  }

  async getStudentProfile(studentId) {
    const result = await pool.query(
      `SELECT id, name, email, avatar_url, created_at
       FROM users WHERE id = $1 AND role = 'siswa'`,
      [studentId],
    );
    return result.rows[0] || null;
  }

  async getStudentEpisodeProgress(studentId) {
    const result = await pool.query(
      `SELECT e.id AS episode_id, e.title, e.order_index,
              p.status, p.started_at, p.completed_at,
              p.emotion_tally, p.ending_key, p.choices
       FROM episodes e
       LEFT JOIN user_episode_progress p
         ON p.episode_id = e.id AND p.user_id = $1
       ORDER BY e.order_index ASC`,
      [studentId],
    );
    return result.rows;
  }

  // Tren emosi TERAGREGASI (hitung kemunculan tiap label per minggu) —
  // sengaja TIDAK menyertakan input_text mentah di sini, sesuai
  // proposal 3.1.1 poin 2: "grafik perkembangan emosional siswa yang
  // ditampilkan secara teragregasi tanpa membuka detail percakapan
  // personal". Untuk meninjau teks asli, guru BK harus lewat endpoint
  // alert spesifik (getAlertDetail) yang memang didesain untuk
  // penindakan kasus darurat, bukan pemantauan rutin.
  async getStudentEmotionTrend(studentId, weeks = 8) {
    const result = await pool.query(
      `SELECT
         date_trunc('week', created_at) AS week_start,
         label,
         COUNT(*) AS count
       FROM sentiment_analyses
       WHERE user_id = $1
         AND created_at > NOW() - ($2 || ' weeks')::interval
       GROUP BY week_start, label
       ORDER BY week_start ASC`,
      [studentId, weeks],
    );
    return result.rows;
  }

  async getStudentRiskAlerts(studentId, limit = 50) {
    const result = await pool.query(
      `SELECT id, source_type, source_id, episode_id, risk_level, snippet,
              acknowledged_by, acknowledged_at, created_at
       FROM risk_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [studentId, limit],
    );
    return result.rows;
  }

  // Feed notifikasi utama dashboard — semua siswa, belum ditinjau
  // duluan. `onlyUnacknowledged` dipakai badge/notifikasi real-time;
  // riwayat penuh (termasuk yang sudah ditinjau) tetap bisa diambil
  // lewat query param terpisah di controller.
  async listAlerts({ onlyUnacknowledged = false, limit = 100 } = {}) {
    const result = await pool.query(
      `SELECT ra.id, ra.user_id, u.name AS student_name, ra.source_type,
              ra.source_id, ra.episode_id, e.title AS episode_title,
              ra.risk_level, ra.snippet, ra.acknowledged_by,
              ra.acknowledged_at, ra.created_at
       FROM risk_alerts ra
       JOIN users u ON u.id = ra.user_id
       LEFT JOIN episodes e ON e.id = ra.episode_id
       WHERE ($1 = false OR ra.acknowledged_at IS NULL)
       ORDER BY ra.created_at DESC
       LIMIT $2`,
      [onlyUnacknowledged, limit],
    );
    return result.rows;
  }

  async getAlertDetail(alertId) {
    // JOIN manual ke sumber aslinya (sentiment_analyses atau
    // counseling_messages) untuk menampilkan teks LENGKAP — dipakai
    // saat guru BK membuka satu notifikasi spesifik untuk ditindak.
    const alertResult = await pool.query(
      `SELECT ra.*, u.name AS student_name, u.email AS student_email
       FROM risk_alerts ra
       JOIN users u ON u.id = ra.user_id
       WHERE ra.id = $1`,
      [alertId],
    );
    const alert = alertResult.rows[0];
    if (!alert) return null;

    let fullText = alert.snippet;
    if (alert.source_type === 'sentiment_analysis') {
      const r = await pool.query(
        'SELECT input_text FROM sentiment_analyses WHERE id = $1',
        [alert.source_id],
      );
      fullText = r.rows[0]?.input_text ?? fullText;
    } else if (alert.source_type === 'counseling_message') {
      const r = await pool.query(
        'SELECT content FROM counseling_messages WHERE id = $1',
        [alert.source_id],
      );
      fullText = r.rows[0]?.content ?? fullText;
    }

    return { ...alert, full_text: fullText };
  }

  async acknowledgeAlert({ alertId, acknowledgedBy }) {
    const result = await pool.query(
      `UPDATE risk_alerts
       SET acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2 AND acknowledged_at IS NULL
       RETURNING *`,
      [acknowledgedBy, alertId],
    );
    return result.rows[0] || null;
  }

}

export default new BkRepositories();
