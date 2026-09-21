import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import validate from '../../../middlewares/validate.js';
import { updateProgressPayloadSchema } from '../validator/schema.js';
import { getAllProgress, resetProgress, updateProgress } from '../controllers/progress-controller.js';

const router = Router();

// Sama seperti /api/nlp/*, ini murni interaksi PEMAIN (progres main
// sendiri) — dibatasi role 'siswa'. Guru BK melihat progres siswa lewat
// /api/bk/students/:id (episode_progress), bukan lewat endpoint ini.
router.use(authenticate, authorize('siswa'));

router.get('/', getAllProgress);
router.delete('/', resetProgress);
router.put('/:episodeId', validate(updateProgressPayloadSchema), updateProgress);

export default router;
