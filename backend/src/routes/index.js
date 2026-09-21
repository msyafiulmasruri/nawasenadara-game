import { Router } from 'express';
import authenticationRoutes from '../services/authentications/routes/index.js';
import nlpRoutes from '../services/nlp/routes/index.js';
import bkRoutes from '../services/bk/routes/index.js';
import progressRoutes from '../services/progress/routes/index.js';

const router = Router();

router.use('/auth', authenticationRoutes);
router.use('/nlp', nlpRoutes);
router.use('/bk', bkRoutes);
router.use('/progress', progressRoutes);

export default router;
