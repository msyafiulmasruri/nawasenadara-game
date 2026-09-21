import BkRepositories from '../repositories/bk-repositories.js';
import { success } from '../../../utils/response.js';
import NotFoundError from '../../../exceptions/not-found-error.js';
import { sumEmotionTallies, computeOverallEnding } from '../../progress/utils/emotion-ending.js';

// computeOverallEnding() (emotion-ending.js) mengembalikan properti
// camelCase (dominant, endingKey, hasData, title, plusText, minusText)
// — seluruh field lain di API guru BK ini (episode_id, emotion_tally,
// risk_level, dst) snake_case, jadi dinormalisasi di sini biar
// konsisten dengan konvensi respons endpoint lain.
const toSnakeEnding = (overallEnding) => ({
  dominant: overallEnding.dominant,
  ending_key: overallEnding.endingKey,
  has_data: overallEnding.hasData,
  title: overallEnding.title,
  plus_text: overallEnding.plusText,
  minus_text: overallEnding.minusText,
});

// GET /api/bk/students
export const listStudents = async (req, res, next) => {
  try {
    const students = await BkRepositories.listStudentsWithSummary();
    const data = students.map((s) => {
      const combinedTally = sumEmotionTallies(s.completed_tallies);
      const overallEnding = computeOverallEnding(combinedTally);
      const { completed_tallies: _omit, ...rest } = s;
      return { ...rest, ending_trend: toSnakeEnding(overallEnding) };
    });
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

// GET /api/bk/students/:id
export const getStudentDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await BkRepositories.getStudentProfile(id);
    if (!profile) return next(new NotFoundError('Siswa tidak ditemukan.'));

    const [episodeProgress, emotionTrend, riskAlerts] = await Promise.all([
      BkRepositories.getStudentEpisodeProgress(id),
      BkRepositories.getStudentEmotionTrend(id),
      BkRepositories.getStudentRiskAlerts(id),
    ]);

    // Akumulasi ending "seluruh rangkaian episode" (proposal & alur
    // game: di Episode 9, skor dari episode 1..8 digabung jadi satu
    // ending akhir) — dihitung di sini dari emotion_tally tiap episode
    // yang statusnya 'completed', TERLEPAS dari berapa episode yang
    // sudah benar-benar dibangun/dimainkan (baru Episode 1 saat ini) —
    // begitu episode baru selesai dimainkan siswa, akumulasi ini
    // otomatis ikut bertambah tanpa perlu ubah kode dashboard lagi.
    const completedEpisodes = episodeProgress.filter((ep) => ep.status === 'completed');
    const combinedTally = sumEmotionTallies(completedEpisodes.map((ep) => ep.emotion_tally));
    const overallEnding = computeOverallEnding(combinedTally);

    return success(res, {
      profile,
      episode_progress: episodeProgress,
      emotion_trend: emotionTrend,
      risk_alerts: riskAlerts,
      accumulated_summary: {
        total_episodes: episodeProgress.length,
        completed_episodes: completedEpisodes.length,
        emotion_tally: combinedTally,
        ...toSnakeEnding(overallEnding),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/bk/alerts?unacknowledged=true
export const listAlerts = async (req, res, next) => {
  try {
    const onlyUnacknowledged = req.query.unacknowledged === 'true';
    const alerts = await BkRepositories.listAlerts({ onlyUnacknowledged });
    return success(res, alerts);
  } catch (err) {
    next(err);
  }
};

// GET /api/bk/alerts/:id
export const getAlertDetail = async (req, res, next) => {
  try {
    const alert = await BkRepositories.getAlertDetail(req.params.id);
    if (!alert) return next(new NotFoundError('Notifikasi tidak ditemukan.'));
    return success(res, alert);
  } catch (err) {
    next(err);
  }
};

// POST /api/bk/alerts/:id/acknowledge
export const acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await BkRepositories.acknowledgeAlert({
      alertId: req.params.id,
      acknowledgedBy: req.user.id,
    });
    if (!alert) {
      return next(
        new NotFoundError('Notifikasi tidak ditemukan atau sudah ditinjau sebelumnya.'),
      );
    }
    return success(res, alert, 'Notifikasi ditandai sudah ditinjau.');
  } catch (err) {
    next(err);
  }
};
