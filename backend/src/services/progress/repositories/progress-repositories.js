import pool from '../../../config/db.js';

class ProgressRepositories {
  // Semua 6 episode + status progres user ini (kalau belum pernah ada
  // baris di user_episode_progress sama sekali untuk episode tsb,
  // dianggap 'locked' — KECUALI episode 1 yang selalu 'unlocked' by
  // default, ditangani di controller supaya logic "episode 1 selalu
  // terbuka" ada satu tempat saja, bukan di query SQL).
  async getAllForUser(userId) {
    const result = await pool.query(
      `SELECT e.id AS episode_id,
              e.order_index,
              e.title,
              COALESCE(uep.status, 'locked') AS status,
              uep.choices,
              uep.emotion_tally,
              uep.ending_key,
              uep.started_at,
              uep.completed_at
       FROM episodes e
       LEFT JOIN user_episode_progress uep
         ON uep.episode_id = e.id AND uep.user_id = $1
       WHERE e.id BETWEEN 1 AND 6
       ORDER BY e.order_index ASC`,
      [userId],
    );
    return result.rows;
  }

  async getOne({ userId, episodeId }) {
    const result = await pool.query(
      `SELECT * FROM user_episode_progress WHERE user_id = $1 AND episode_id = $2`,
      [userId, episodeId],
    );
    return result.rows[0] || null;
  }

  // Upsert satu baris status. `started_at` cuma di-set kalau baris ini
  // baru pertama kali dibuat/di-set 'in_progress' (tidak ditimpa ulang
  // tiap kali update supaya tetap mencatat percobaan PERTAMA).
  //
  // `emotionTally`/`endingKey` (opsional — cuma diisi controller saat
  // status 'completed', lihat computeEmotionTallyAndEnding()) disimpan
  // apa adanya; kalau tidak dikirim (mis. saat cuma update
  // 'in_progress'), kolom lama dipertahankan lewat COALESCE supaya
  // tidak tertimpa null.
  async upsertStatus({ userId, episodeId, status, choices, emotionTally, endingKey }) {
    const result = await pool.query(
      `INSERT INTO user_episode_progress
         (user_id, episode_id, status, choices, emotion_tally, ending_key, started_at, completed_at, updated_at)
       VALUES (
         $1, $2, $3::text, $4, COALESCE($5, '{"aman":0,"netral":0,"sedih":0,"takut":0,"marah":0,"menyinggung":0}'::jsonb), $6,
         CASE WHEN $3::text IN ('in_progress', 'completed') THEN NOW() ELSE NULL END,
         CASE WHEN $3::text = 'completed' THEN NOW() ELSE NULL END,
         NOW()
       )
       ON CONFLICT (user_id, episode_id) DO UPDATE SET
         status = EXCLUDED.status,
         choices = EXCLUDED.choices,
         emotion_tally = COALESCE($5, user_episode_progress.emotion_tally),
         ending_key = COALESCE($6, user_episode_progress.ending_key),
         started_at = COALESCE(user_episode_progress.started_at, EXCLUDED.started_at),
         completed_at = CASE
           WHEN EXCLUDED.status = 'completed' THEN NOW()
           ELSE user_episode_progress.completed_at
         END,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        episodeId,
        status,
        JSON.stringify(choices ?? []),
        emotionTally ? JSON.stringify(emotionTally) : null,
        endingKey ?? null,
      ],
    );
    return result.rows[0];
  }

  // Dipanggil dari MenuScene saat pemain memilih "Mulai Permainan
  // Baru" (bukan lagi "Mulai Ulang dari Awal" di menu jeda yang cuma
  // reset tampilan lokal tanpa menyentuh server sama sekali — lihat
  // catatan lama di progressStore.js frontend). Hapus semua baris
  // progres user ini; episode 1 otomatis kembali 'locked' di DB tapi
  // tetap dianggap terbuka oleh getAllForUser() (default 'locked' di
  // COALESCE, logic "episode 1 selalu terbuka" ada di controller).
  async resetAllForUser(userId) {
    await pool.query(`DELETE FROM user_episode_progress WHERE user_id = $1`, [userId]);
  }

  // Dipanggil setelah sebuah episode ditandai 'completed' — buka
  // (unlock) episode berikutnya kalau belum ada barisnya sama sekali
  // atau masih 'locked'. Tidak menimpa status yang sudah lebih maju
  // (mis. kalau entah bagaimana sudah 'in_progress'/'completed'
  // sebelumnya, dibiarkan apa adanya).
  async unlockNext({ userId, nextEpisodeId }) {
    if (!nextEpisodeId) return;
    await pool.query(
      `INSERT INTO user_episode_progress (user_id, episode_id, status, updated_at)
       VALUES ($1, $2, 'unlocked', NOW())
       ON CONFLICT (user_id, episode_id) DO UPDATE SET
         status = CASE
           WHEN user_episode_progress.status = 'locked' THEN 'unlocked'
           ELSE user_episode_progress.status
         END,
         updated_at = NOW()`,
      [userId, nextEpisodeId],
    );
  }
}

export default new ProgressRepositories();
