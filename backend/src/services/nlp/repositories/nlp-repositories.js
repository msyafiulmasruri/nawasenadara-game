import pool from '../../../config/db.js';

// Sesi konseling dianggap "sesi yang sama" kalau pesan terakhir kurang
// dari 30 menit lalu — lewat dari itu, pesan baru dianggap membuka
// sesi baru (percakapan yang secara wajar terasa terpisah, mirip pola
// "session timeout" chat pada umumnya).
const SESSION_IDLE_MINUTES = 30;

// Nilai valid persis sama dengan CHECK constraint di database (lihat
// migrations/*_create-table-counseling.js dan
// *_fix-counseling-constraints.js). Dipertahankan di sini juga
// (bukan cuma di database) sebagai lapisan kedua — kalau suatu saat
// nlp-service mengembalikan nilai di luar dugaan (mis. karena bug di
// service lain atau perubahan model), backend akan otomatis
// "mengamankan" nilainya ke default paling aman, DAN mencatatnya ke
// console, alih-alih membiarkan query INSERT/UPDATE gagal total
// dengan error constraint yang membingungkan pemain.
const VALID_RISK_LEVELS = ['rendah', 'sedang', 'tinggi'];
const VALID_TRIGGER_SOURCES = ['manual', 'reflection_flag', 'episode7_phone', 'episode_summary'];

function sanitizeRiskLevel(value) {
  if (VALID_RISK_LEVELS.includes(value)) return value;
  console.warn(
    `[nlp-repositories] risk_level tidak dikenal: ${JSON.stringify(value)}, dipakai 'rendah' sebagai fallback.`,
  );
  return 'rendah';
}

function sanitizeTriggerSource(value) {
  if (VALID_TRIGGER_SOURCES.includes(value)) return value;
  console.warn(
    `[nlp-repositories] trigger_source tidak dikenal: ${JSON.stringify(value)}, dipakai 'manual' sebagai fallback.`,
  );
  return 'manual';
}

class NlpRepositories {
  async insertSentimentAnalysis({
    userId,
    episodeId,
    source,
    inputText,
    label,
    confidence,
    scores,
    riskLevel,
  }) {
    const result = await pool.query(
      `INSERT INTO sentiment_analyses
        (user_id, episode_id, source, input_text, label, confidence, scores, risk_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, episode_id, source, label, confidence, scores, risk_level, created_at`,
      [userId, episodeId ?? null, source, inputText, label, confidence, scores, sanitizeRiskLevel(riskLevel)],
    );
    return result.rows[0];
  }

  // Versi READ-ONLY dari getOrCreateActiveSession — dipakai saat
  // chatbot BARU DIBUKA (belum tentu pemain akan kirim pesan), supaya
  // UI bisa menampilkan riwayat sesi terakhir tanpa membuat sesi baru
  // secara tidak sengaja hanya karena jendela chat dibuka lalu ditutup
  // lagi tanpa mengetik apa-apa.
  async getActiveSessionForUser({ userId }) {
    const result = await pool.query(
      `SELECT * FROM counseling_sessions
       WHERE user_id = $1
         AND closed_at IS NULL
         AND last_message_at > NOW() - INTERVAL '${SESSION_IDLE_MINUTES} minutes'
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [userId],
    );
    return result.rows[0] || null;
  }

  // Ambil (atau buat baru kalau belum ada / sudah idle terlalu lama)
  // sesi konseling yang sedang aktif untuk seorang user.
  async getOrCreateActiveSession({ userId, triggerSource, episodeId }) {
    const existing = await pool.query(
      `SELECT * FROM counseling_sessions
       WHERE user_id = $1
         AND closed_at IS NULL
         AND last_message_at > NOW() - INTERVAL '${SESSION_IDLE_MINUTES} minutes'
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [userId],
    );
    if (existing.rows[0]) {
      const row = existing.rows[0];
      // Baris LAMA yang sempat tersimpan dengan nilai tidak valid
      // (mis. dari sebelum constraint ini benar-benar terpasang saat
      // pengembangan awal) akan membuat SETIAP UPDATE berikutnya ke
      // baris yang sama gagal — Postgres mem-validasi ULANG SELURUH
      // baris pada CHECK constraint setiap kali di-UPDATE, bukan cuma
      // kolom yang berubah. Perbaiki di sini SEBELUM baris ini dipakai
      // lagi, supaya sistem "sembuh sendiri" tanpa perlu reset
      // database — ini jaring pengaman tambahan di luar migration,
      // bukan pengganti migration.
      const needsRepair =
        !VALID_RISK_LEVELS.includes(row.highest_risk_level) ||
        !VALID_TRIGGER_SOURCES.includes(row.trigger_source);
      if (needsRepair) {
        const repaired = await pool.query(
          `UPDATE counseling_sessions
           SET highest_risk_level = $2, trigger_source = $3
           WHERE id = $1
           RETURNING *`,
          [
            row.id,
            sanitizeRiskLevel(row.highest_risk_level),
            sanitizeTriggerSource(row.trigger_source),
          ],
        );
        return repaired.rows[0];
      }
      return row;
    }

    const created = await pool.query(
      `INSERT INTO counseling_sessions (user_id, trigger_source, episode_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, sanitizeTriggerSource(triggerSource || 'manual'), episodeId ?? null],
    );
    return created.rows[0];
  }

  async getSessionForUser({ sessionId, userId }) {
    const result = await pool.query(
      `SELECT * FROM counseling_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId],
    );
    return result.rows[0] || null;
  }

  async getSessionMessages(sessionId, limit = 20) {
    const result = await pool.query(
      `SELECT role, content FROM counseling_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit],
    );
    return result.rows;
  }

  async insertUserMessage({ sessionId, content, emotionLabel, emotionConfidence, riskLevel, escalated }) {
    const result = await pool.query(
      `INSERT INTO counseling_messages
        (session_id, role, content, emotion_label, emotion_confidence, risk_level, escalated)
       VALUES ($1, 'user', $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        sessionId,
        content,
        emotionLabel,
        emotionConfidence,
        riskLevel == null ? null : sanitizeRiskLevel(riskLevel),
        escalated,
      ],
    );
    return result.rows[0];
  }

  async insertAssistantMessage({ sessionId, content }) {
    const result = await pool.query(
      `INSERT INTO counseling_messages (session_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING *`,
      [sessionId, content],
    );
    return result.rows[0];
  }

  // Naikkan highest_risk_level sesi kalau risk_level pesan baru lebih
  // tinggi dari yang tercatat sebelumnya (rendah < sedang < tinggi).
  async bumpSessionRisk({ sessionId, riskLevel, escalated }) {
    const safeRiskLevel = sanitizeRiskLevel(riskLevel);
    // `Boolean(escalated)` di sini WAJIB — kalau `escalated` datang
    // sebagai `undefined` (mis. respons nlp-service tidak menyertakan
    // field ini karena error/versi lama), driver `pg` mengirimnya
    // sebagai SQL NULL. Ekspresi `escalated OR NULL` di SQL punya logika
    // tiga-nilai: `false OR NULL` hasilnya NULL (bukan false!), yang
    // lalu ditolak oleh constraint NOT NULL kolom `escalated` — gejala
    // errornya mirip (500 di endpoint yang sama) tapi constraint yang
    // beda, jadi baris ini jaga-jaga supaya parameter yang dikirim ke
    // query SELALU boolean asli, tidak pernah undefined/null.
    const safeEscalated = Boolean(escalated);
    await pool.query(
      `UPDATE counseling_sessions
       SET last_message_at = NOW(),
           highest_risk_level = CASE
             WHEN $2 = 'tinggi' THEN 'tinggi'
             WHEN $2 = 'sedang' AND highest_risk_level != 'tinggi' THEN 'sedang'
             ELSE highest_risk_level
           END,
           escalated = escalated OR $3
       WHERE id = $1`,
      [sessionId, safeRiskLevel, safeEscalated],
    );
  }

  async insertRiskAlert({ userId, sourceType, sourceId, episodeId, riskLevel, snippet }) {
    // risk_alerts.risk_level CHECK constraint cuma mengizinkan
    // 'sedang'/'tinggi' (lihat migration risk-alerts) — 'rendah' TIDAK
    // valid di tabel ini (alert hanya dibuat untuk kondisi yang perlu
    // ditinjau). Sanitasi di sini murni jaring pengaman terakhir kalau
    // pemanggil lupa mengecek kondisi itu dulu; controller yang benar
    // seharusnya tidak pernah memanggil fungsi ini dengan 'rendah'.
    const safeRiskLevel = riskLevel === 'tinggi' || riskLevel === 'sedang' ? riskLevel : 'sedang';
    const result = await pool.query(
      `INSERT INTO risk_alerts (user_id, source_type, source_id, episode_id, risk_level, snippet)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, sourceType, sourceId, episodeId ?? null, safeRiskLevel, snippet],
    );
    return result.rows[0];
  }

  // Dipakai Episode 7 (lihat NLP_INTEGRATION_DESIGN.md) untuk
  // memeriksa apakah pemain punya riwayat distres tinggi dari episode
  // 1-6, supaya chatbot bisa auto-muncul sebagai NPC telepon di scene
  // itu.
  async hasRecentHighRisk({ userId, sinceHours = 72 }) {
    const result = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM sentiment_analyses
         WHERE user_id = $1
           AND risk_level = 'tinggi'
           AND created_at > NOW() - INTERVAL '${sinceHours} hours'
       ) AS has_risk`,
      [userId],
    );
    return result.rows[0].has_risk;
  }

}

export default new NlpRepositories();
