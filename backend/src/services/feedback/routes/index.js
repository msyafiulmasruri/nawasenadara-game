import { Router } from 'express';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import validate from '../../../middlewares/validate.js';
import { createFeedback } from '../controllers/feedback-controller.js';
import { createFeedbackPayloadSchema } from '../validator/schema.js';

const router = Router();

router.use(authenticate, authorize('siswa'));
router.post('/', validate(createFeedbackPayloadSchema), createFeedback);

export default router;
