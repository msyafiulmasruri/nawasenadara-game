import ProgressRepositories from '../repositories/progress-repositories.js';
import { success } from '../../../utils/response.js';
import { computeEmotionTallyAndEnding } from '../utils/emotion-ending.js';

// GET /api/progress
// Dipanggil GameProgressBridge.jsx saat game dimuat, untuk mengisi
// cache lokal (window.__nawasenadaraProgressCache) yang dibaca
// progressStore.js secara sinkron oleh Phaser scenes. Episode 1
// dipaksa 'unlocked' di sini walau baris DB-nya belum ada / masih
// 'locked' — supaya pemain baru selalu bisa mulai tanpa perlu ada
// baris progress dulu.
export const getAllProgress = async (req, res, next) => {
  try {
    const rows = await ProgressRepositories.getAllForUser(req.user.id);
    const data = rows.map((row) => ({
      episode_id: row.episode_id,
      order_index: row.order_index,
      title: row.title,
      status: row.episode_id === 1 && row.status === 'locked' ? 'unlocked' : row.status,
      choices: row.choices,
      emotion_tally: row.emotion_tally,
      ending_key: row.ending_key,
      started_at: row.started_at,
      completed_at: row.completed_at,
    }));
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/progress
// Dipanggil saat pemain memilih "Mulai Permainan Baru" di MenuScene
// (menggantikan "Mulai Ulang dari Awal" lama di menu jeda yang cuma
// mereset tampilan LOKAL tanpa menyentuh server — jadi progres lama
// tetap "hidup lagi" begitu cache lokal di-refresh dari server, dan
// bikin state klien vs server tidak sinkron). Ini benar-benar
// menghapus semua baris progres user di server.
export const resetProgress = async (req, res, next) => {
  try {
    await ProgressRepositories.resetAllForUser(req.user.id);
    return success(res, { reset: true });
  } catch (err) {
    next(err);
  }
};

// PUT /api/progress/:episodeId
// Dipanggil dari dua titik di frontend (lihat GameProgressBridge.jsx):
//  - saat scene episode dimulai -> { status: 'in_progress' }
//  - saat episode selesai (setelah jurnal refleksi disubmit) ->
//    { status: 'completed', choices: [...] } — otomatis membuka
//    episode berikutnya (kalau ada).
export const updateProgress = async (req, res, next) => {
  try {
    const episodeId = Number(req.params.episodeId);
    const { status, choices } = req.validated;
    const userId = req.user.id;

    // Kalau episode ini baru saja dituntaskan, hitung rekap label emosi
    // (aman/netral/sedih/takut/marah/menyinggung) dari `choices` yang
    // dikirim frontend (tiap item sekarang bawa `emotion`, lihat
    // episode1Dialogue.js) + tentukan ending dominannya. Disimpan di
    // kolom emotion_tally/ending_key — dipakai dashboard guru BK &
    // nanti agregasi ending akhir Episode 9. Ending yang PEMAIN lihat
    // di layar dihitung terpisah di frontend dari `choices` yang sama
    // persis (lihat utils/emotionEnding.js), jadi keduanya selalu
    // konsisten walau dihitung dua tempat.
    let emotionTally;
    let endingKey;
    if (status === 'completed') {
      const result = computeEmotionTallyAndEnding(episodeId, choices);
      emotionTally = result.emotionTally;
      endingKey = result.endingKey;
    }

    const row = await ProgressRepositories.upsertStatus({
      userId,
      episodeId,
      status,
      choices,
      emotionTally,
      endingKey,
    });

    if (status === 'completed' && episodeId < 9) {
      await ProgressRepositories.unlockNext({ userId, nextEpisodeId: episodeId + 1 });
    }

    return success(res, {
      episode_id: row.episode_id,
      status: row.status,
      choices: row.choices,
      emotion_tally: row.emotion_tally,
      ending_key: row.ending_key,
      started_at: row.started_at,
      completed_at: row.completed_at,
    });
  } catch (err) {
    next(err);
  }
};
