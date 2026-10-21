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
