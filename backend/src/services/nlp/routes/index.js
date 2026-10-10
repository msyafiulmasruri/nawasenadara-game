import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import validate from '../../../middlewares/validate.js';
import {
  analyzeReflectionPayloadSchema,
  classifyEpisodeMoodPayloadSchema,
  counselingChatPayloadSchema,
  npcDialogueLinePayloadSchema,
} from '../validator/schema.js';
import {
  analyzeReflection,
  classifyEpisodeMood,
  counselingChat,
  generateNpcDialogueLine,
  getActiveSession,
  getCounselingHistory,
  shouldAutoOpenCounseling,
} from '../controllers/nlp-controller.js';

const router = Router();

// Semua endpoint di sini murni interaksi PEMAIN dengan cerita
// (jurnal refleksi & chatbot konseling) — dibatasi role 'siswa' saja.
// Guru BK melihat HASILNYA lewat /api/bk/*, bukan lewat endpoint ini.
router.use(authenticate, authorize('siswa'));

router.post('/analyze', validate(analyzeReflectionPayloadSchema), analyzeReflection);
router.post(
  '/episode-mood',
  validate(classifyEpisodeMoodPayloadSchema),
  classifyEpisodeMood,
);
router.post('/counseling', validate(counselingChatPayloadSchema), counselingChat);
router.post('/npc-dialogue', validate(npcDialogueLinePayloadSchema), generateNpcDialogueLine);
router.get('/counseling/should-auto-open', shouldAutoOpenCounseling);
router.get('/counseling/active', getActiveSession);
router.get('/counseling/:sessionId/messages', getCounselingHistory);

export default router;
