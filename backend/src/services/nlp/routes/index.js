import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import validate from '../../../middlewares/validate.js';
import {
  analyzeReflectionPayloadSchema,
  classifyEpisodeMoodPayloadSchema,
  counselingChatPayloadSchema,
  minibossDialoguesPayloadSchema,
  minibossEvaluatePayloadSchema,
  npcDialogueLinePayloadSchema,
  runnerQuizQuestionsPayloadSchema,
} from '../validator/schema.js';
import {
  analyzeReflection,
  classifyEpisodeMood,
  counselingChat,
  evaluateMiniBossResponse,
  generateNpcDialogueLine,
  getActiveSession,
  getCounselingHistory,
  getMiniBossDialogues,
  getRunnerQuizQuestions,
  shouldAutoOpenCounseling,
} from '../controllers/nlp-controller.js';

const router = Router();

// Endpoint publik Mini Boss Close-Up Dialogue Battle & Kuis Asertif
router.get('/miniboss/dialogues', getMiniBossDialogues);
router.post('/miniboss/dialogues', validate(minibossDialoguesPayloadSchema), getMiniBossDialogues);
router.post('/miniboss/evaluate-response', validate(minibossEvaluatePayloadSchema), evaluateMiniBossResponse);
router.post('/quiz-questions', validate(runnerQuizQuestionsPayloadSchema), getRunnerQuizQuestions);

// Dibuka untuk role 'siswa' dan 'guru_bk' supaya interaksi game dapat dijalankan
router.use(authenticate, authorize('siswa', 'guru_bk'));

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
