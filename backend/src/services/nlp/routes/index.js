import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import validate from '../../../middlewares/validate.js';
import {
  analyzeReflectionPayloadSchema,
  classifyEpisodeMoodPayloadSchema,
  counselingChatPayloadSchema,
  npcDialogueLinePayloadSchema,
  runnerQuizQuestionsPayloadSchema,
} from '../validator/schema.js';
import {
  analyzeReflection,
  classifyEpisodeMood,
  counselingChat,
  generateNpcDialogueLine,
  getActiveSession,
  getCounselingHistory,
  getRunnerQuizQuestions,
  shouldAutoOpenCounseling,
} from '../controllers/nlp-controller.js';

const router = Router();

// Endpoint publik: Pertanyaan kuis asertif untuk Boss Runner (dapat diakses
// pemain episode cerita maupun mode arcade standalone tanpa token auth)
router.post('/quiz-questions', validate(runnerQuizQuestionsPayloadSchema), getRunnerQuizQuestions);

// Semua endpoint di bawah ini murni interaksi PEMAIN terautentikasi dengan cerita
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
