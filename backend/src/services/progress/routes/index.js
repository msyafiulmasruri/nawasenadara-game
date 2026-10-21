import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import validate from '../../../middlewares/validate.js';
import { updateProgressPayloadSchema } from '../validator/schema.js';
import { getAllProgress, resetProgress, updateProgress } from '../controllers/progress-controller.js';

const router = Router();

// Dibuka untuk role 'siswa' dan 'guru_bk' supaya guru BK juga dapat mencoba game.
router.use(authenticate, authorize('siswa', 'guru_bk'));

router.get('/', getAllProgress);
router.delete('/', resetProgress);
router.put('/:episodeId', validate(updateProgressPayloadSchema), updateProgress);

export default router;
